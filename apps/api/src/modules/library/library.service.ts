import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  libraryEntrySchema,
  progressKinds,
  progressLimitError,
  statusForProgress,
  type CalendarEvent,
  type CalendarQuery,
  type EntryCreateInput,
  type EntryPatchInput,
  type LibraryQuery,
  type MediaMetadata,
  type MediaType,
  type ProgressInput,
  type StatusKey,
  type ViewingCreateInput,
} from '@jinsei/contracts';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CatalogService,
  catalogInclude,
  catalogResult,
  normalizeName,
} from '../catalog/catalog.service';
import { metadataResult } from '../catalog/metadata';
import {
  isoDay,
  progressCreate,
  progressInclude,
  progressResult,
  progressUpdate,
} from './progress';

const entryInclude = {
  media: { include: catalogInclude },
  status: true,
  ...progressInclude,
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
    progress: progressResult(entry, entry.media.mediaTypeId as MediaType),
    startedOn: entry.startedOn ? isoDay(entry.startedOn) : null,
    completedOn: entry.completedOn ? isoDay(entry.completedOn) : null,
    boardRank: entry.boardRank,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  });
}

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const today = () => day(new Date().toISOString().slice(0, 10));

/**
 * Start and completion dates follow status transitions unless the person sets them explicitly:
 * leaving "planned" records the start and entering "completed" records the completion.
 */
function entryDates(
  existing: { startedOn: Date | null; completedOn: Date | null; status: { key: string } } | null,
  nextStatus: StatusKey | undefined,
  input: { startedOn?: string | null; completedOn?: string | null },
  when: Date = today(),
) {
  const data: { startedOn?: Date | null; completedOn?: Date | null } = {};
  const previous = existing?.status.key;
  if (nextStatus && nextStatus !== 'planned' && !existing?.startedOn) data.startedOn = when;
  if (nextStatus === 'completed' && previous !== 'completed') data.completedOn = when;
  if (input.startedOn !== undefined)
    data.startedOn = input.startedOn === null ? null : day(input.startedOn);
  if (input.completedOn !== undefined)
    data.completedOn = input.completedOn === null ? null : day(input.completedOn);
  return data;
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
          : query.sort === 'completedOn'
            ? { completedOn: { sort: query.order, nulls: 'last' } }
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

  /** Progress must belong to the entry category and respect totals of finished works. */
  private checkProgress(type: string, metadata: MediaMetadata, progress?: ProgressInput) {
    if (!progress) return;
    if (progress.kind !== progressKinds[type as MediaType])
      throw new BadRequestException('O progresso informado não corresponde à categoria do título');
    const limit = progressLimitError(progress, metadata);
    if (limit) throw new BadRequestException(limit);
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
    this.checkProgress(media.mediaTypeId, metadataResult(media), input.progress);
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
            ...entryDates(null, input.status, input),
            ...progressCreate(media.mediaTypeId as MediaType, input.progress),
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
    const metadata = metadataResult(existing.media);
    this.checkProgress(existing.media.mediaTypeId, metadata, input.progress);
    // Progress may imply a new status (started or finished) when none was chosen explicitly.
    const implied: StatusKey | undefined =
      !input.status && input.progress
        ? statusForProgress(existing.status.key as StatusKey, input.progress, metadata)
        : undefined;
    const statusKey = input.status ?? (implied !== existing.status.key ? implied : undefined);
    const status = statusKey
      ? await this.status(userId, existing.media.mediaTypeId, statusKey)
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
          boardRank: input.boardRank,
          updatedAt: new Date(),
          ...entryDates(existing, statusKey, input),
          ...(input.progress ? progressUpdate(input.progress) : {}),
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
              ...(statusKey ? { status: statusKey } : {}),
              ...(input.progress ? { progress: input.progress } : {}),
              ...(input.rating !== undefined ? { rating: input.rating } : {}),
            },
          },
        });
    });
    return entryResult(await this.get(userId, id));
  }

  async addViewing(userId: string, id: string, input: ViewingCreateInput) {
    const existing = await this.get(userId, id);
    if (progressKinds[existing.media.mediaTypeId as MediaType] !== 'film')
      throw new BadRequestException('Sessões podem ser registradas somente para filmes');
    const watchedOn = new Date(`${input.watchedOn}T00:00:00.000Z`);
    if (watchedOn.getTime() > Date.now() + 86400000 || watchedOn.getUTCFullYear() < 1900)
      throw new BadRequestException('Informe uma data entre 1900 e hoje');
    const statusKey = statusForProgress(
      existing.status.key as StatusKey,
      {
        kind: 'film',
        timesWatched: existing._count.viewings + 1,
        lastWatchedOn: null,
        viewings: [],
      },
      metadataResult(existing.media),
    );
    const status =
      statusKey !== existing.status.key
        ? await this.status(userId, existing.media.mediaTypeId, statusKey)
        : undefined;
    await this.db.$transaction(async (tx) => {
      await tx.entryViewing.create({ data: { entryId: id, watchedOn } });
      await tx.userMediaEntry.update({
        where: { id, userId },
        data: {
          statusId: status?.id,
          updatedAt: new Date(),
          ...entryDates(
            existing,
            status ? statusKey : undefined,
            { completedOn: undefined },
            watchedOn,
          ),
        },
      });
      await tx.activityLog.create({
        data: {
          userId,
          entryId: id,
          action: 'entry.viewed',
          changes: { watchedOn: input.watchedOn, ...(status ? { status: statusKey } : {}) },
        },
      });
    });
    return entryResult(await this.get(userId, id));
  }

  async removeViewing(userId: string, id: string, viewingId: string) {
    await this.get(userId, id);
    await this.db.$transaction(async (tx) => {
      const removed = await tx.entryViewing.deleteMany({
        where: { id: viewingId, entryId: id, entry: { userId } },
      });
      if (!removed.count) throw new NotFoundException('Sessão não encontrada');
      await tx.userMediaEntry.update({ where: { id, userId }, data: { updatedAt: new Date() } });
    });
    return entryResult(await this.get(userId, id));
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.db.userMediaEntry.delete({ where: { id, userId } });
    return { deleted: true };
  }

  async calendar(userId: string, query: CalendarQuery): Promise<{ events: CalendarEvent[] }> {
    const range = { gte: day(query.from), lte: day(query.to) };
    const scope: Prisma.UserMediaEntryWhereInput = {
      userId,
      media: {
        mediaType: { users: { some: { userId, enabled: true } } },
        ...(query.mediaType ? { mediaTypeId: query.mediaType } : {}),
      },
      ...(query.favorite ? { favorite: query.favorite === 'true' } : {}),
    };
    const select = {
      id: true,
      startedOn: true,
      completedOn: true,
      status: { select: { key: true } },
      media: { select: { title: true, mediaTypeId: true, coverUrl: true } },
    } satisfies Prisma.UserMediaEntrySelect;
    const [entries, viewings] = await this.db.$transaction([
      this.db.userMediaEntry.findMany({
        where: { ...scope, OR: [{ startedOn: range }, { completedOn: range }] },
        select,
        take: 1000,
      }),
      this.db.entryViewing.findMany({
        where: { watchedOn: range, entry: scope },
        select: { watchedOn: true, entry: { select } },
        take: 1000,
      }),
    ]);
    const event = (
      entry: Prisma.UserMediaEntryGetPayload<{ select: typeof select }>,
      kind: CalendarEvent['kind'],
      date: Date,
    ): CalendarEvent => ({
      date: isoDay(date),
      kind,
      entryId: entry.id,
      title: entry.media.title,
      mediaType: entry.media.mediaTypeId as MediaType,
      status: entry.status.key as StatusKey,
      coverUrl: entry.media.coverUrl,
    });
    const inRange = (date: Date | null): date is Date =>
      Boolean(date && date >= range.gte && date <= range.lte);
    const events = [
      ...entries.flatMap((entry) => [
        ...(inRange(entry.startedOn) ? [event(entry, 'started', entry.startedOn)] : []),
        ...(inRange(entry.completedOn) ? [event(entry, 'completed', entry.completedOn)] : []),
      ]),
      ...viewings.map((viewing) => event(viewing.entry, 'viewed', viewing.watchedOn)),
    ];
    return {
      events: events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)),
    };
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
    const [stats, hours, episodes, chapters, viewings] = await this.db.$transaction([
      this.db.userMediaEntry.aggregate({
        where,
        _count: true,
        _avg: { ratingSteps: true },
      }),
      this.db.gameProgress.aggregate({
        where: { entry: where },
        _sum: { minutesPlayed: true },
      }),
      this.db.episodeProgress.aggregate({
        where: { entry: where },
        _sum: { episodesWatched: true },
      }),
      this.db.readingProgress.aggregate({
        where: { entry: where },
        _sum: { chaptersRead: true },
      }),
      this.db.entryViewing.count({ where: { entry: where } }),
    ]);
    return {
      total: stats._count,
      byStatus,
      averageRating: stats._avg.ratingSteps === null ? null : stats._avg.ratingSteps / 4,
      hoursPlayed: (hours._sum.minutesPlayed ?? 0) / 60,
      episodesWatched: episodes._sum.episodesWatched ?? 0,
      chaptersRead: chapters._sum.chaptersRead ?? 0,
      timesWatched: viewings,
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
