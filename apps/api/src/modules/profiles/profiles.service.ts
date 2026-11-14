import { Inject, Injectable, NotFoundException } from '@nestjs/common';
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
  media: { select: { title: true, mediaTypeId: true, coverUrl: true, releaseYear: true } },
} satisfies Prisma.UserMediaEntrySelect;
type WorkRow = Prisma.UserMediaEntryGetPayload<{ select: typeof workSelect }>;
/** Only shared catalog data and the public rating leave the account; notes and tags never do. */
const work = (row: WorkRow): PublicWork => ({
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

@Injectable()
export class ProfilesService {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(GoalsService) private readonly goals: GoalsService,
  ) {}

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
              select: { ...workSelect, status: { select: { key: true } }, updatedAt: true },
              orderBy: { updatedAt: 'desc' },
              take: 12,
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
