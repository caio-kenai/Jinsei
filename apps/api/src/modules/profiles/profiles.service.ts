import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { statusKeys } from '@jinsei/contracts';
import type {
  MediaType,
  PublicCollection,
  PublicProfile,
  PublicWork,
  StatusKey,
} from '@jinsei/contracts';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { summaryResult } from '../collections/collections.service';
import { GoalsService } from '../goals/goals.service';
import { titleDefinitions } from '../progression/achievements';
import { mediaUrl } from '../uploads/uploads.service';

const workSelect = {
  ratingSteps: true,
  media: {
    select: {
      id: true,
      ownerId: true,
      title: true,
      mediaTypeId: true,
      coverUrl: true,
      releaseYear: true,
    },
  },
} satisfies Prisma.UserMediaEntrySelect;
type WorkRow = Prisma.UserMediaEntryGetPayload<{ select: typeof workSelect }>;
/** Only shared catalog data and the public rating leave the account; notes and tags never do. */
const work = (row: WorkRow): PublicWork => ({
  workId: row.media.ownerId === null ? row.media.id : null,
  title: row.media.title,
  mediaType: row.media.mediaTypeId as MediaType,
  coverUrl: row.media.coverUrl,
  releaseYear: row.media.releaseYear,
  rating: row.ratingSteps === null ? null : row.ratingSteps / 4,
});
const collectionInclude = {
  _count: { select: { items: true } },
  items: {
    orderBy: { position: 'asc' },
    take: 4,
    select: { entry: { select: { media: { select: { coverUrl: true } } } } },
  },
} satisfies Prisma.CollectionInclude;

const number = (value: number) => value.toLocaleString('pt-BR');
/** Short progress line shown in the public timeline, without any private notes. */
function progressOf(row: {
  gameProgress: { minutesPlayed: number; completion: number } | null;
  episodeProgress: { episodesWatched: number } | null;
  readingProgress: { chaptersRead: number; pagesRead: number } | null;
  _count: { viewings: number };
  media: {
    mediaTypeId: string;
    series: { totalEpisodes: number | null } | null;
    reading: { totalChapters: number | null; totalPages: number | null } | null;
  };
}) {
  const percent = (value: number, total: number | null | undefined) =>
    total ? Math.min(100, Math.round((value / total) * 100)) : null;
  if (row.gameProgress)
    return {
      progressLabel: `${number(Math.round((row.gameProgress.minutesPlayed / 60) * 10) / 10)} h · ${row.gameProgress.completion}%`,
      progressPercent: row.gameProgress.completion,
    };
  if (row.episodeProgress) {
    const total = row.media.series?.totalEpisodes;
    return {
      progressLabel: `${number(row.episodeProgress.episodesWatched)}/${total ? number(total) : '?'} ep.`,
      progressPercent: percent(row.episodeProgress.episodesWatched, total),
    };
  }
  if (row.readingProgress) {
    const books = row.media.mediaTypeId === 'books';
    const value = books ? row.readingProgress.pagesRead : row.readingProgress.chaptersRead;
    const total = books ? row.media.reading?.totalPages : row.media.reading?.totalChapters;
    return {
      progressLabel: `${number(value)}/${total ? number(total) : '?'} ${books ? 'pág.' : 'cap.'}`,
      progressPercent: percent(value, total),
    };
  }
  if (row.media.mediaTypeId === 'movies' && row._count.viewings)
    return {
      progressLabel: `${row._count.viewings} ${row._count.viewings === 1 ? 'sessão' : 'sessões'}`,
      progressPercent: null,
    };
  return { progressLabel: null, progressPercent: null };
}

@Injectable()
export class ProfilesService {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(GoalsService) private readonly goals: GoalsService,
  ) {}

  /** Per-category status counts, ratings and consumption totals for the profile tabs. */
  private async categoryBreakdown(userId: string) {
    const rows = await this.db.$queryRaw<
      {
        type: string;
        status: string;
        count: bigint;
        votes: bigint;
        steps: bigint | null;
        favorites: bigint;
        minutes: bigint;
        episodes: bigint;
        chapters: bigint;
        volumes: bigint;
        pages: bigint;
        viewings: bigint;
      }[]
    >`
      SELECT m."mediaTypeId" AS type, s."key" AS status, COUNT(*) AS count,
             COUNT(e."ratingSteps") AS votes, SUM(e."ratingSteps") AS steps,
             COUNT(*) FILTER (WHERE e."favorite") AS favorites,
             COALESCE(SUM(g."minutesPlayed"), 0) AS minutes,
             COALESCE(SUM(ep."episodesWatched"), 0) AS episodes,
             COALESCE(SUM(r."chaptersRead"), 0) AS chapters,
             COALESCE(SUM(r."volumesRead"), 0) AS volumes,
             COALESCE(SUM(r."pagesRead"), 0) AS pages,
             COALESCE(SUM((SELECT COUNT(*) FROM "EntryViewing" v WHERE v."entryId" = e."id")), 0) AS viewings
      FROM "UserMediaEntry" e
      JOIN "MediaItem" m ON m."id" = e."mediaId"
      JOIN "UserStatus" s ON s."id" = e."statusId"
      JOIN "UserMediaType" t ON t."userId" = e."userId" AND t."mediaTypeId" = m."mediaTypeId" AND t."enabled"
      LEFT JOIN "GameProgress" g ON g."entryId" = e."id"
      LEFT JOIN "EpisodeProgress" ep ON ep."entryId" = e."id"
      LEFT JOIN "ReadingProgress" r ON r."entryId" = e."id"
      WHERE e."userId" = ${userId}
      GROUP BY m."mediaTypeId", s."key"`;
    const byType = new Map<string, typeof rows>();
    for (const row of rows) byType.set(row.type, [...(byType.get(row.type) ?? []), row]);
    return [...byType.entries()].map(([type, list]) => {
      const sum = (key: Exclude<keyof (typeof list)[number], 'type' | 'status'>) =>
        list.reduce((total, row) => total + Number(row[key] ?? 0), 0);
      const statuses = Object.fromEntries(statusKeys.map((key) => [key, 0])) as Record<
        StatusKey,
        number
      >;
      for (const row of list)
        if ((statusKeys as readonly string[]).includes(row.status))
          statuses[row.status as StatusKey] = Number(row.count);
      const votes = sum('votes');
      const units: { label: string; value: number }[] =
        type === 'games'
          ? [{ label: 'Horas jogadas', value: Math.round(sum('minutes') / 6) / 10 }]
          : type === 'anime' || type === 'series'
            ? [{ label: 'Episódios', value: sum('episodes') }]
            : type === 'manga'
              ? [
                  { label: 'Capítulos', value: sum('chapters') },
                  { label: 'Volumes', value: sum('volumes') },
                ]
              : type === 'books'
                ? [{ label: 'Páginas', value: sum('pages') }]
                : [{ label: 'Sessões', value: sum('viewings') }];
      return {
        mediaType: type as MediaType,
        total: sum('count'),
        favorites: sum('favorites'),
        averageRating: votes ? Math.round((sum('steps') / votes / 4) * 100) / 100 : null,
        statuses,
        units,
      };
    });
  }

  /** Private profiles answer exactly like missing ones, so their existence is not revealed. */
  private async publicProfile(username: string) {
    const profile = await this.db.profile.findFirst({
      where: { username, isPublic: true },
      include: { user: { select: { createdAt: true } }, links: { orderBy: { position: 'asc' } } },
    });
    if (!profile) throw new NotFoundException('Perfil não encontrado');
    return profile;
  }

  async profile(username: string): Promise<PublicProfile> {
    const profile = await this.publicProfile(username);
    const userId = profile.userId;
    const enabled: Prisma.UserMediaEntryWhereInput = {
      userId,
      media: { mediaType: { users: { some: { userId, enabled: true } } } },
    };
    const [collections, favorites, reviews, history, totals, completed, categories] =
      await Promise.all([
        this.db.collection.findMany({
          where: { userId, visibility: 'public' },
          include: collectionInclude,
          orderBy: { updatedAt: 'desc' },
          take: 24,
        }),
        profile.showFavorites
          ? this.db.userMediaEntry.findMany({
              where: { ...enabled, favorite: true },
              select: workSelect,
              orderBy: { updatedAt: 'desc' },
              take: 12,
            })
          : null,
        profile.showReviews
          ? this.db.userMediaEntry.findMany({
              where: { ...enabled, reviewPublic: true, review: { not: '' } },
              select: { ...workSelect, review: true, updatedAt: true },
              orderBy: { updatedAt: 'desc' },
              take: 10,
            })
          : null,
        profile.showHistory
          ? this.db.userMediaEntry.findMany({
              where: enabled,
              select: {
                ...workSelect,
                status: { select: { key: true } },
                updatedAt: true,
                gameProgress: true,
                episodeProgress: true,
                readingProgress: true,
                _count: { select: { viewings: true } },
                media: {
                  select: {
                    ...workSelect.media.select,
                    series: { select: { totalEpisodes: true } },
                    reading: { select: { totalChapters: true, totalPages: true } },
                  },
                },
              },
              orderBy: { updatedAt: 'desc' },
              take: 40,
            })
          : null,
        this.db.userMediaEntry.aggregate({
          where: enabled,
          _count: true,
          _avg: { ratingSteps: true },
        }),
        this.db.userMediaEntry.count({ where: { ...enabled, status: { key: 'completed' } } }),
        this.db.mediaItem.groupBy({
          by: ['mediaTypeId'],
          where: { entries: { some: enabled } },
          _count: true,
        }),
      ]);
    const breakdown = profile.showStatistics ? await this.categoryBreakdown(userId) : [];
    const goals = profile.showGoals
      ? (await this.goals.list(userId)).goals
          .filter((goal) => goal.state !== 'archived')
          .slice(0, 6)
      : null;
    return {
      username: profile.username!,
      displayName: profile.displayName,
      bio: profile.bio,
      avatarUrl: mediaUrl(profile.avatarId),
      bannerUrl: mediaUrl(profile.bannerId),
      title: titleDefinitions.find((title) => title.key === profile.activeTitle)?.label ?? null,
      memberSince: profile.user.createdAt.toISOString(),
      links: profile.links.map(({ label, url }) => ({ label, url })),
      statistics: profile.showStatistics
        ? {
            entries: totals._count,
            completed,
            averageRating: totals._avg.ratingSteps === null ? null : totals._avg.ratingSteps / 4,
            byCategory: categories.map((row) => ({
              mediaType: row.mediaTypeId as MediaType,
              total: row._count,
            })),
            categories: breakdown,
          }
        : null,
      favorites: favorites?.map(work) ?? null,
      collections: collections.map((row) => {
        const summary = summaryResult(row);
        return {
          name: summary.name,
          slug: summary.slug,
          description: summary.description,
          ranked: summary.ranked,
          coverUrl: summary.coverUrl,
          itemCount: summary.itemCount,
          covers: summary.covers,
          updatedAt: summary.updatedAt,
        };
      }),
      reviews:
        reviews?.map((row) => ({
          ...work(row),
          review: row.review,
          updatedAt: row.updatedAt.toISOString(),
        })) ?? null,
      history:
        history?.map((row) => ({
          ...work(row),
          status: row.status.key as StatusKey,
          updatedAt: row.updatedAt.toISOString(),
          ...progressOf(row),
        })) ?? null,
      goals:
        goals?.map(({ name, metric, current, target, state }) => ({
          name,
          metric,
          current,
          target,
          state,
        })) ?? null,
    };
  }

  async collection(username: string, slug: string): Promise<PublicCollection> {
    const profile = await this.publicProfile(username);
    const row = await this.db.collection.findFirst({
      where: { userId: profile.userId, slug, visibility: { in: ['public', 'unlisted'] } },
      include: {
        ...collectionInclude,
        items: {
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          select: { note: true, entry: { select: workSelect } },
        },
      },
    });
    if (!row) throw new NotFoundException('Coleção não encontrada');
    const summary = summaryResult({
      ...row,
      items: row.items.slice(0, 4).map((item) => ({
        entry: { media: { coverUrl: item.entry.media.coverUrl } },
      })),
    });
    return {
      name: summary.name,
      slug: summary.slug,
      description: summary.description,
      ranked: summary.ranked,
      coverUrl: summary.coverUrl,
      itemCount: summary.itemCount,
      covers: summary.covers,
      updatedAt: summary.updatedAt,
      unlisted: row.visibility === 'unlisted',
      owner: {
        username: profile.username!,
        displayName: profile.displayName,
        avatarUrl: mediaUrl(profile.avatarId),
      },
      items: row.items.map((item) => ({ ...work(item.entry), note: item.note })),
    };
  }

  /** Indexable pages only: public profiles and their public (never unlisted) collections. */
  async sitemap() {
    const profiles = await this.db.profile.findMany({
      where: { isPublic: true, username: { not: null } },
      select: {
        username: true,
        updatedAt: true,
        user: {
          select: {
            collections: {
              where: { visibility: 'public' },
              select: { slug: true, updatedAt: true },
            },
          },
        },
      },
      take: 5000,
    });
    return {
      profiles: profiles.map((profile) => ({
        username: profile.username!,
        updatedAt: profile.updatedAt.toISOString(),
      })),
      collections: profiles.flatMap((profile) =>
        profile.user.collections.map((collection) => ({
          username: profile.username!,
          slug: collection.slug,
          updatedAt: collection.updatedAt.toISOString(),
        })),
      ),
    };
  }
}
