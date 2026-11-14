import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  coverAttributionSchema,
  type CatalogResult,
  type ManualMediaInput,
  type MediaType,
  type SourceInput,
} from '@jinsei/contracts';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WikidataProvider } from './providers/wikidata.provider';
import { IgdbProvider } from './providers/igdb.provider';
import { TvmazeProvider } from './providers/tvmaze.provider';
import { OpenlibraryProvider } from './providers/openlibrary.provider';
import { TmdbProvider } from './providers/tmdb.provider';
import type { CatalogProvider } from './providers/catalog-provider';
import { InstanceService } from '../instance/instance.module';
import {
  hasMetadata,
  manualMetadata,
  metadataCreate,
  metadataInclude,
  metadataResult,
  metadataUpdate,
} from './metadata';

export const catalogInclude = {
  ...metadataInclude,
  externalIds: true,
} satisfies Prisma.MediaItemInclude;
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
    coverAttribution: coverAttributionSchema.nullable().parse(item.coverAttribution),
    platforms: item.game?.platforms ?? [],
    genres: item.genres,
    developers: item.game?.developers ?? [],
    metadata: metadataResult(item),
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
    @Inject(TvmazeProvider) private readonly tvmaze: TvmazeProvider,
    @Inject(OpenlibraryProvider) private readonly openlibrary: OpenlibraryProvider,
    @Inject(TmdbProvider) private readonly tmdb: TmdbProvider,
    @Inject(InstanceService) private readonly instance: InstanceService,
  ) {}
  async providers() {
    const allowed = (await this.instance.settings()).externalCatalogEnabled;
    return [this.wikidata, this.igdb, this.tvmaze, this.openlibrary, this.tmdb].map((provider) => ({
      id: provider.id,
      enabled: provider.enabled && allowed,
    }));
  }
  async showcase() {
    // Fixed public works only. Never expose personal library records or manual media.
    const items = await this.db.mediaItem.findMany({
      where: {
        ownerId: null,
        externalIds: {
          some: {
            OR: [
              {
                provider: 'wikidata',
                externalId: {
                  in: ['Q29300592', 'Q23013817', 'Q28451532', 'Q59756366', 'Q19631660', 'Q151599'],
                },
              },
              { provider: 'tvmaze', externalId: { in: ['anime:69956', 'series:169'] } },
              { provider: 'openlibrary', externalId: 'OL8988597W' },
            ],
          },
        },
      },
      include: catalogInclude,
      take: 9,
    });
    return items.map(catalogResult);
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
    if (items.length < 10 && (await this.instance.settings()).externalCatalogEnabled) {
      const provider: CatalogProvider =
        mediaType === 'games'
          ? this.igdb.enabled
            ? this.igdb
            : this.wikidata
          : mediaType === 'anime' || mediaType === 'series'
            ? this.tvmaze
            : mediaType === 'manga' || mediaType === 'books'
              ? this.openlibrary
              : this.tmdb.enabled
                ? this.tmdb
                : this.wikidata;
      try {
        const seen = new Set(
          items
            .filter((item) => item.externalId)
            .map((item) => `${item.provider}:${item.externalId}`),
        );
        items.push(
          ...(await provider.search(query, mediaType)).filter(
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
        coverUrl: input.coverUrl,
        ...(input.coverUrl
          ? {
              coverAttribution: {
                provider: 'Cadastro pessoal',
                sourceUrl: input.coverUrl,
                license: 'Imagem indicada pelo usuário para seu registro privado',
                licenseUrl: null,
                artist: null,
              },
            }
          : {}),
        releaseYear: input.releaseYear,
        genres: input.genres,
        attributionLabel: 'Cadastro pessoal',
        dataLicense: 'Informações fornecidas pelo usuário; registro privado',
        ...metadataCreate(manualMetadata(input)),
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
    if (!(await this.instance.settings()).externalCatalogEnabled) {
      if (existing) return existing.media;
      throw new BadRequestException(
        'A busca externa está desativada nesta instância. Cadastre a obra manualmente.',
      );
    }
    // Refresh old records without cover, provenance or category metadata; otherwise retain the
    // cached metadata for a day.
    if (
      existing &&
      existing.media.title !== input.externalId &&
      existing.media.coverUrl &&
      existing.media.coverAttribution &&
      hasMetadata(existing.media) &&
      existing.synchronizedAt.getTime() > Date.now() - 86400000
    )
      return existing.media;
    const provider = [this.wikidata, this.igdb, this.tvmaze, this.openlibrary, this.tmdb].find(
      (candidate) => candidate.id === input.provider,
    )!;
    if (!provider.enabled) throw new BadRequestException('Provedor não habilitado');
    let item: CatalogResult;
    try {
      item = await provider.details(input.externalId);
    } catch {
      if (existing) return existing.media;
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
          coverUrl: item.coverUrl,
          coverAttribution: item.coverAttribution ?? Prisma.DbNull,
          genres: item.genres,
          externalIds: {
            update: {
              where: { provider_externalId: unique.provider_externalId },
              data: { synchronizedAt: new Date() },
            },
          },
          ...metadataUpdate(item.metadata),
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
          coverAttribution: item.coverAttribution ?? Prisma.DbNull,
          genres: item.genres,
          attributionLabel: item.attribution.label,
          attributionUrl: item.attribution.url,
          dataLicense: item.attribution.license,
          ...metadataCreate(item.metadata),
          externalIds: {
            create: {
              provider: input.provider,
              externalId: input.externalId,
              retentionPolicy: item.attribution.license,
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
