import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { CatalogResult, ManualMediaInput, MediaType, SourceInput } from '@jinsei/contracts';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WikidataProvider } from './providers/wikidata.provider';
import { IgdbProvider } from './providers/igdb.provider';

export const catalogInclude = { game: true, externalIds: true } satisfies Prisma.MediaItemInclude;
export type MediaWithMetadata = Prisma.MediaItemGetPayload<{ include: typeof catalogInclude }>;
export const normalizeName = (name: string) =>
  name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
export function catalogResult(item: MediaWithMetadata): CatalogResult {
  return {
    id: item.id,
    externalId: item.externalIds[0]?.externalId,
    provider: item.externalIds[0]?.provider ?? 'manual',
    mediaType: item.mediaTypeId as MediaType,
    title: item.title,
    description: item.description,
    releaseYear: item.releaseYear,
    coverUrl: item.coverUrl,
    platforms: item.game?.platforms ?? [],
    genres: item.genres,
    developers: item.game?.developers ?? [],
    attribution: {
      label: item.attributionLabel,
      url: item.attributionUrl,
      license: item.dataLicense,
    },
  };
}

@Injectable()
export class CatalogService {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(WikidataProvider) private readonly wikidata: WikidataProvider,
    @Inject(IgdbProvider) private readonly igdb: IgdbProvider,
  ) {}
  providers() {
    return [
      { id: this.wikidata.id, enabled: true },
      { id: this.igdb.id, enabled: this.igdb.enabled },
    ];
  }
  async search(userId: string, query: string, mediaType: MediaType) {
    const internal = await this.db.mediaItem.findMany({
      where: {
        mediaTypeId: mediaType,
        title: { contains: query, mode: 'insensitive' },
        OR: [{ ownerId: null }, { ownerId: userId }],
      },
      include: catalogInclude,
      orderBy: { title: 'asc' },
      take: 10,
    });
    const items = internal.map(catalogResult);
    const warnings: string[] = [];
    if (mediaType === 'games' && items.length < 10) {
      const provider = this.igdb.enabled ? this.igdb : this.wikidata;
      try {
        const seen = new Set(
          items
            .filter((item) => item.externalId)
            .map((item) => `${item.provider}:${item.externalId}`),
        );
        items.push(
          ...(await provider.search(query)).filter(
            (item) => !seen.has(`${item.provider}:${item.externalId}`),
          ),
        );
      } catch {
        warnings.push(
          'O catálogo externo está indisponível. Você pode cadastrar o título manualmente.',
        );
      }
    }
    return { items, warnings };
  }
  async existing(userId: string, id: string) {
    const item = await this.db.mediaItem.findFirst({
      where: { id, OR: [{ ownerId: null }, { ownerId: userId }] },
      include: catalogInclude,
    });
    if (!item) throw new NotFoundException('Obra não encontrada');
    return item;
  }
  async manual(userId: string, input: ManualMediaInput) {
    return this.db.mediaItem.upsert({
      where: {
        ownerId_mediaTypeId_normalizedTitle: {
          ownerId: userId,
          mediaTypeId: input.mediaType,
          normalizedTitle: normalizeName(input.title),
        },
      },
      create: {
        ownerId: userId,
        mediaTypeId: input.mediaType,
        title: input.title,
        normalizedTitle: normalizeName(input.title),
        description: input.description,
        releaseYear: input.releaseYear,
        genres: input.genres,
        attributionLabel: 'Cadastro pessoal',
        dataLicense: 'Informações fornecidas pelo usuário; registro privado',
        ...(input.mediaType === 'games'
          ? { game: { create: { platforms: input.platforms, developers: [], publishers: [] } } }
          : {}),
      },
      update: {},
      include: catalogInclude,
    });
  }
  async importSource(input: SourceInput) {
    const unique = {
      provider_externalId: { provider: input.provider, externalId: input.externalId },
    };
    const existing = await this.db.mediaExternalId.findUnique({
      where: unique,
      include: { media: { include: catalogInclude } },
    });
    if (existing && existing.media.title !== input.externalId) return existing.media;
    const provider = input.provider === 'wikidata' ? this.wikidata : this.igdb;
    if (!provider.enabled) throw new BadRequestException('Provedor não habilitado');
    let item: CatalogResult;
    try {
      item = await provider.details(input.externalId);
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível consultar a obra. Tente novamente ou cadastre manualmente.',
      );
    }
    if (existing) {
      return this.db.mediaItem.update({
        where: { id: existing.mediaId },
        data: {
          title: item.title,
          normalizedTitle: normalizeName(item.title),
          description: item.description,
          releaseYear: item.releaseYear,
          genres: item.genres,
          game: {
            upsert: {
              create: { platforms: item.platforms, developers: item.developers, publishers: [] },
              update: { platforms: item.platforms, developers: item.developers },
            },
          },
        },
        include: catalogInclude,
      });
    }
    try {
      return await this.db.mediaItem.create({
        data: {
          mediaTypeId: item.mediaType,
          title: item.title,
          normalizedTitle: normalizeName(item.title),
          description: item.description,
          releaseYear: item.releaseYear,
          coverUrl: item.coverUrl,
          genres: item.genres,
          attributionLabel: item.attribution.label,
          attributionUrl: item.attribution.url,
          dataLicense: item.attribution.license,
          game: {
            create: { platforms: item.platforms, developers: item.developers, publishers: [] },
          },
          externalIds: {
            create: {
              provider: input.provider,
              externalId: input.externalId,
              retentionPolicy:
                input.provider === 'wikidata'
                  ? 'CC0 metadata; no external images'
                  : 'IGDB usage terms',
            },
          },
        },
        include: catalogInclude,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const duplicate = await this.db.mediaExternalId.findUnique({
          where: unique,
          include: { media: { include: catalogInclude } },
        });
        if (duplicate) return duplicate.media;
      }
      throw error;
    }
  }
}
