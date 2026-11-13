import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  libraryEntrySchema,
  type EntryCreateInput,
  type EntryPatchInput,
  type LibraryQuery,
} from '@jinsei/contracts';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CatalogService,
  catalogInclude,
  catalogResult,
  normalizeName,
} from '../catalog/catalog.service';

const entryInclude = {
  media: { include: catalogInclude },
  status: true,
  gameProgress: true,
  tags: { include: { tag: true } },
} satisfies Prisma.UserMediaEntryInclude;
type Entry = Prisma.UserMediaEntryGetPayload<{ include: typeof entryInclude }>;
export function entryResult(entry: Entry) {
  const media = catalogResult(entry.media);
  return libraryEntrySchema.parse({
    ...media,
    id: entry.id,
    mediaId: entry.mediaId,
    status: entry.status.key,
    rating: entry.ratingSteps === null ? null : entry.ratingSteps / 4,
    favorite: entry.favorite,
    notes: entry.notes,
    tags: entry.tags.map(({ tag }) => tag.name),
    progress: {
      hoursPlayed: (entry.gameProgress?.minutesPlayed ?? 0) / 60,
      completion: entry.gameProgress?.completion ?? 0,
    },
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  });
}

@Injectable()
export class LibraryService {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}

  async list(userId: string, query: LibraryQuery) {
    const where: Prisma.UserMediaEntryWhereInput = {
      userId,
      media: {
        mediaType: { users: { some: { userId, enabled: true } } },
        ...(query.mediaType ? { mediaTypeId: query.mediaType } : {}),
        ...(query.q ? { title: { contains: query.q, mode: 'insensitive' } } : {}),
      },
      ...(query.status ? { status: { key: query.status } } : {}),
      ...(query.favorite ? { favorite: query.favorite === 'true' } : {}),
      ...(query.tag
        ? { tags: { some: { tag: { normalizedName: normalizeName(query.tag), userId } } } }
        : {}),
    };
    const orderBy: Prisma.UserMediaEntryOrderByWithRelationInput[] = [
      query.sort === 'title'
        ? { media: { title: query.order } }
        : query.sort === 'rating'
          ? { ratingSteps: { sort: query.order, nulls: 'last' } }
          : { [query.sort]: query.order },
      { id: 'asc' },
    ];
    const [entries, total] = await this.db.$transaction([
      this.db.userMediaEntry.findMany({
        where,
        include: entryInclude,
        orderBy,
        take: query.limit,
        skip: (query.page - 1) * query.limit,
      }),
      this.db.userMediaEntry.count({ where }),
    ]);
    return {
      items: entries.map(entryResult),
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async get(userId: string, id: string) {
    const entry = await this.db.userMediaEntry.findFirst({
      where: { id, userId },
      include: entryInclude,
    });
    if (!entry) throw new NotFoundException('Título não encontrado na sua biblioteca');
    return entry;
  }

  private async status(userId: string, mediaTypeId: string, key: string) {
    const status = await this.db.userStatus.findUnique({
      where: { userId_mediaTypeId_key: { userId, mediaTypeId, key } },
    });
    if (!status) throw new NotFoundException('Status não encontrado para esta categoria');
    return status;
  }
  private async replaceTags(
    tx: Prisma.TransactionClient,
    userId: string,
    entryId: string,
    names: string[],
  ) {
    await tx.entryTag.deleteMany({ where: { entryId } });
    const unique = new Map(names.map((name) => [normalizeName(name), name]));
    for (const [normalizedName, name] of unique) {
      const tag = await tx.tag.upsert({
        where: { userId_normalizedName: { userId, normalizedName } },
        create: { userId, name, normalizedName },
        update: {},
      });
      await tx.entryTag.create({ data: { entryId, tagId: tag.id } });
    }
  }

  async create(userId: string, input: EntryCreateInput) {
    const media = input.mediaId
      ? await this.catalog.existing(userId, input.mediaId)
      : input.media
        ? await this.catalog.manual(userId, input.media)
        : await this.catalog.importSource(input.source!);
    const status = await this.status(userId, media.mediaTypeId, input.status);
    try {
      const id = await this.db.$transaction(async (tx) => {
        const entry = await tx.userMediaEntry.create({
          data: {
            userId,
            mediaId: media.id,
            statusId: status.id,
            ratingSteps: input.rating === null ? null : input.rating * 4,
            favorite: input.favorite,
            notes: input.notes,
            ...(media.mediaTypeId === 'games'
              ? {
                  gameProgress: {
                    create: {
                      minutesPlayed: Math.round(input.progress.hoursPlayed * 60),
                      completion: input.progress.completion,
                    },
                  },
                }
              : {}),
          },
        });
        await this.replaceTags(tx, userId, entry.id, input.tags);
        await tx.activityLog.create({
          data: {
            userId,
            entryId: entry.id,
            action: 'entry.created',
            changes: { status: input.status },
          },
        });
        return entry.id;
      });
      return entryResult(await this.get(userId, id));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Esse título já está na sua biblioteca');
      throw error;
    }
  }

  async update(userId: string, id: string, input: EntryPatchInput) {
    const existing = await this.get(userId, id);
    const status = input.status
      ? await this.status(userId, existing.media.mediaTypeId, input.status)
      : undefined;
    await this.db.$transaction(async (tx) => {
      await tx.userMediaEntry.update({
        where: { id, userId },
        data: {
          statusId: status?.id,
          ratingSteps:
            input.rating === undefined
              ? undefined
              : input.rating === null
                ? null
                : input.rating * 4,
          favorite: input.favorite,
          notes: input.notes,
          updatedAt: new Date(),
          ...(input.progress && existing.media.mediaTypeId === 'games'
            ? {
                gameProgress: {
                  upsert: {
                    create: {
                      minutesPlayed: Math.round(input.progress.hoursPlayed * 60),
                      completion: input.progress.completion,
                    },
                    update: {
                      minutesPlayed: Math.round(input.progress.hoursPlayed * 60),
                      completion: input.progress.completion,
                    },
                  },
                },
              }
            : {}),
        },
      });
      if (input.tags) await this.replaceTags(tx, userId, id, input.tags);
      if (status || input.progress || input.rating !== undefined)
        await tx.activityLog.create({
          data: {
            userId,
            entryId: id,
            action: 'entry.updated',
            changes: {
              ...(input.status ? { status: input.status } : {}),
              ...(input.progress ? { progress: input.progress } : {}),
              ...(input.rating !== undefined ? { rating: input.rating } : {}),
            },
          },
        });
    });
    return entryResult(await this.get(userId, id));
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.db.userMediaEntry.delete({ where: { id, userId } });
    return { deleted: true };
  }

  async summary(userId: string) {
    const where: Prisma.UserMediaEntryWhereInput = {
      userId,
      media: { mediaType: { users: { some: { userId, enabled: true } } } },
    };
    const entries = await this.db.userMediaEntry.groupBy({
      by: ['statusId'],
      where,
      _count: true,
    });
    const statuses = await this.db.userStatus.findMany({ where: { userId } });
    const byStatus: Record<string, number> = {};
    for (const row of entries) {
      const key = statuses.find((status) => status.id === row.statusId)?.key ?? 'planned';
      byStatus[key] = (byStatus[key] ?? 0) + row._count;
    }
    const [stats, hours] = await this.db.$transaction([
      this.db.userMediaEntry.aggregate({
        where,
        _count: true,
        _avg: { ratingSteps: true },
      }),
      this.db.gameProgress.aggregate({
        where: { entry: where },
        _sum: { minutesPlayed: true },
      }),
    ]);
    return {
      total: stats._count,
      byStatus,
      averageRating: stats._avg.ratingSteps === null ? null : stats._avg.ratingSteps / 4,
      hoursPlayed: (hours._sum.minutesPlayed ?? 0) / 60,
    };
  }

  async export(userId: string) {
    const entries = await this.db.userMediaEntry.findMany({
      where: { userId },
      include: entryInclude,
      orderBy: { createdAt: 'asc' },
    });
    return entries.map(entryResult);
  }
}
