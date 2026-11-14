import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  levelForXp,
  missionPeriods,
  xpForLevel,
  type MediaType,
  type Mission,
  type Progression,
} from '@jinsei/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { GoalsService } from '../goals/goals.service';
import { badgeDefinitions, titleDefinitions, type ProgressionStats } from './achievements';
import { missionXp, pickMissions, type MissionMetric } from './missions';
import { addDays, localDay, periodRange, type PeriodRange } from './periods';

const GOAL_XP = 100;
/** Base experience is derived from the current library, so deleting and re-adding gains nothing. */
const XP = { entry: 10, completion: 50, rating: 5, progressDay: 5, viewingDay: 10, collection: 10 };

@Injectable()
export class ProgressionService {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(GoalsService) private readonly goals: GoalsService,
  ) {}

  private async measure(userId: string, metric: MissionMetric, range: PeriodRange) {
    const createdAt = { gte: range.start, lt: range.end };
    const logMetric = {
      episodes: 'episodes',
      chapters: 'chapters',
      pages: 'pages',
      minutes: 'minutes',
    }[metric as 'episodes'];
    if (logMetric) {
      const sum = await this.db.progressLog.aggregate({
        where: { userId, metric: logMetric, createdAt, delta: { gt: 0 } },
        _sum: { delta: true },
      });
      return sum._sum.delta ?? 0;
    }
    switch (metric) {
      case 'progress_titles':
        return (
          await this.db.progressLog.groupBy({
            by: ['entryId'],
            where: { userId, createdAt, delta: { gt: 0 }, entryId: { not: null } },
          })
        ).length;
      case 'viewings':
        return this.db.entryViewing.count({ where: { createdAt, entry: { userId } } });
      case 'additions':
        return this.db.activityLog.count({ where: { userId, createdAt, action: 'entry.created' } });
      case 'collection_items':
        return this.db.activityLog.count({
          where: { userId, createdAt, action: 'collection.item_added' },
        });
      case 'ratings': {
        const [row] = await this.db.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*) AS count FROM "ActivityLog"
          WHERE "userId" = ${userId} AND "createdAt" >= ${range.start} AND "createdAt" < ${range.end}
            AND "action" = 'entry.updated' AND ("changes"->>'rating') IS NOT NULL`;
        return Number(row?.count ?? 0);
      }
      case 'completions': {
        const [row] = await this.db.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*) AS count FROM "ActivityLog"
          WHERE "userId" = ${userId} AND "createdAt" >= ${range.start} AND "createdAt" < ${range.end}
            AND "changes"->>'status' = 'completed'`;
        return Number(row?.count ?? 0);
      }
      default:
        return 0;
    }
  }

  private async missions(userId: string, categories: MediaType[], today: string, timeZone: string) {
    const result: (Mission & { awardKey: string })[] = [];
    for (const period of missionPeriods) {
      const range = periodRange(period, today, timeZone);
      for (const mission of pickMissions(period, `${userId}:${range.key}`, categories)) {
        const progress = await this.measure(userId, mission.metric, range);
        result.push({
          key: `${range.key}:${mission.id}`,
          awardKey: `mission:${range.key}:${mission.id}`,
          period,
          label: mission.label,
          progress: Math.min(progress, mission.target),
          target: mission.target,
          xp: missionXp[period],
          completed: progress >= mission.target,
          endsAt: range.end.toISOString(),
        });
      }
    }
    return result;
  }

  /** A day counts for the streak when every daily mission of that day is complete. */
  private async dailyComplete(userId: string, categories: MediaType[], day: string, zone: string) {
    const range = periodRange('daily', day, zone);
    for (const mission of pickMissions('daily', `${userId}:${range.key}`, categories))
      if ((await this.measure(userId, mission.metric, range)) < mission.target) return false;
    return true;
  }

  async evaluate(userId: string): Promise<Progression> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        preference: true,
        categories: { where: { enabled: true }, select: { mediaTypeId: true } },
      },
    });
    if (!user?.preference || !user.profile) throw new NotFoundException('Conta não encontrada');
    const zone = user.preference.timezone;
    const categories = user.categories.map((category) => category.mediaTypeId as MediaType);
    const today = localDay(new Date(), zone);
    const yesterday = addDays(today, -1);

    const missions = await this.missions(userId, categories, today, zone);
    const streakDays = [
      ...(missions.filter((mission) => mission.period === 'daily').every((m) => m.completed)
        ? [today]
        : []),
      ...((await this.dailyComplete(userId, categories, yesterday, zone)) ? [yesterday] : []),
    ];
    const goals = (await this.goals.list(userId)).goals.filter((goal) => goal.state === 'achieved');
    await this.db.$transaction([
      this.db.xpAward.createMany({
        data: [
          ...missions
            .filter((mission) => mission.completed)
            .map((mission) => ({ userId, key: mission.awardKey, amount: mission.xp })),
          ...goals.map((goal) => ({ userId, key: `goal:${goal.id}`, amount: GOAL_XP })),
        ],
        skipDuplicates: true,
      }),
      this.db.streakDay.createMany({
        data: streakDays.map((day) => ({ userId, day: new Date(`${day}T00:00:00.000Z`) })),
        skipDuplicates: true,
      }),
    ]);

    const recorded = (
      await this.db.streakDay.findMany({
        where: { userId },
        orderBy: { day: 'desc' },
        take: 1000,
        select: { day: true },
      })
    ).map((row) => row.day.toISOString().slice(0, 10));
    const days = new Set(recorded);
    let current = 0;
    for (let day = days.has(today) ? today : yesterday; days.has(day); day = addDays(day, -1))
      current += 1;
    let best = 0;
    let run = 0;
    let previous: string | null = null;
    for (const day of [...recorded].reverse()) {
      run = previous && addDays(previous, 1) === day ? run + 1 : 1;
      best = Math.max(best, run);
      previous = day;
    }

    const where = { userId };
    const [
      entries,
      completions,
      rated,
      progressDays,
      viewingDays,
      collections,
      awards,
      categoriesUsed,
      totals,
      minutes,
      viewings,
      ranked,
      achieved,
    ] = await Promise.all([
      this.db.userMediaEntry.count({ where }),
      this.db.userMediaEntry.count({ where: { userId, completedOn: { not: null } } }),
      this.db.userMediaEntry.count({ where: { userId, ratingSteps: { not: null } } }),
      this.db.progressLog.groupBy({
        by: ['entryId', 'occurredOn'],
        where: { userId, delta: { gt: 0 }, entryId: { not: null } },
      }),
      this.db.entryViewing.groupBy({ by: ['entryId', 'watchedOn'], where: { entry: where } }),
      this.db.collection.count({ where }),
      this.db.xpAward.aggregate({ where, _sum: { amount: true } }),
      this.db.mediaItem.groupBy({ by: ['mediaTypeId'], where: { entries: { some: where } } }),
      this.db.$transaction([
        this.db.episodeProgress.aggregate({
          where: { entry: where },
          _sum: { episodesWatched: true },
        }),
        this.db.readingProgress.aggregate({
          where: { entry: where },
          _sum: { chaptersRead: true, pagesRead: true },
        }),
      ]),
      this.db.gameProgress.aggregate({ where: { entry: where }, _sum: { minutesPlayed: true } }),
      this.db.entryViewing.count({ where: { entry: where } }),
      this.db.collection.findMany({
        where: { userId, ranked: true },
        select: { _count: { select: { items: true } } },
      }),
      this.db.xpAward.count({ where: { userId, key: { startsWith: 'goal:' } } }),
    ]);
    const xp =
      entries * XP.entry +
      completions * XP.completion +
      rated * XP.rating +
      progressDays.length * XP.progressDay +
      viewingDays.length * XP.viewingDay +
      collections * XP.collection +
      (awards._sum.amount ?? 0);
    const level = levelForXp(xp);
    const stats: ProgressionStats = {
      entries,
      completions,
      categories: categoriesUsed.length,
      episodes: totals[0]._sum.episodesWatched ?? 0,
      chapters: totals[1]._sum.chaptersRead ?? 0,
      pages: totals[1]._sum.pagesRead ?? 0,
      minutes: minutes._sum.minutesPlayed ?? 0,
      viewings,
      collections,
      rankedCollection: Math.max(0, ...ranked.map((collection) => collection._count.items)),
      goalsAchieved: achieved,
      bestStreak: best,
      accountDays: Math.floor((Date.now() - user.createdAt.getTime()) / 86400000),
      level,
      createdYear: user.createdAt.getUTCFullYear(),
    };

    const known = new Map(
      (await this.db.userAchievement.findMany({ where })).map((row) => [row.key, row.unlockedAt]),
    );
    const unlocked = badgeDefinitions
      .filter((badge) => badge.value(stats) >= badge.target && !known.has(badge.key))
      .map((badge) => badge.key);
    if (unlocked.length) {
      await this.db.userAchievement.createMany({
        data: unlocked.map((key) => ({ userId, key })),
        skipDuplicates: true,
      });
      for (const key of unlocked) known.set(key, new Date());
    }
    const titles = titleDefinitions.map((title) => ({
      key: title.key,
      label: title.label,
      requirement: title.requirement,
      unlocked: title.unlocked(stats),
    }));
    const activeTitle = titles.some(
      (title) => title.unlocked && title.key === user.profile!.activeTitle,
    )
      ? user.profile.activeTitle
      : null;
    return {
      level,
      xp,
      levelXp: xpForLevel(level),
      nextLevelXp: xpForLevel(level + 1),
      streak: { current, best, today: days.has(today), days: recorded.slice(0, 30) },
      missions: missions.map((mission) => ({
        key: mission.key,
        period: mission.period,
        label: mission.label,
        progress: mission.progress,
        target: mission.target,
        xp: mission.xp,
        completed: mission.completed,
        endsAt: mission.endsAt,
      })),
      badges: badgeDefinitions.map((badge) => ({
        key: badge.key,
        label: badge.label,
        description: badge.description,
        icon: badge.icon,
        unlockedAt: known.get(badge.key)?.toISOString() ?? null,
        progress: Math.min(badge.value(stats), badge.target),
        target: badge.target,
      })),
      titles,
      activeTitle,
      unlocked,
      timezone: zone,
    };
  }

  async setTitle(userId: string, title: string | null) {
    if (title) {
      const progression = await this.evaluate(userId);
      if (!progression.titles.some((item) => item.key === title && item.unlocked))
        throw new BadRequestException('Este título ainda não foi desbloqueado');
    }
    await this.db.profile.update({ where: { userId }, data: { activeTitle: title } });
    return this.evaluate(userId);
  }
}
