import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  Goal,
  GoalInput,
  GoalMetric,
  GoalPatch,
  GoalState,
  MediaType,
} from '@jinsei/contracts';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_GOALS = 50;
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const logMetrics: Partial<Record<GoalMetric, string>> = {
  episodes_watched: 'episodes',
  chapters_read: 'chapters',
  pages_read: 'pages',
  hours_played: 'minutes',
};
type GoalRow = Prisma.GoalGetPayload<{ include: { collection: { select: { name: true } } } }>;

@Injectable()
export class GoalsService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  /** Progress is derived from the library itself, so goals never need manual updates. */
  private async measure(
    userId: string,
    goal: GoalRow,
  ): Promise<{ current: number; target: number }> {
    const range = { gte: goal.startsOn, ...(goal.endsOn ? { lte: goal.endsOn } : {}) };
    const media = goal.mediaTypeId ? { mediaTypeId: goal.mediaTypeId } : {};
    const metric = goal.metric as GoalMetric;
    if (metric === 'collection_completed') {
      if (!goal.collectionId) return { current: 0, target: goal.target };
      const [total, done] = await this.db.$transaction([
        this.db.collectionItem.count({ where: { collectionId: goal.collectionId } }),
        this.db.collectionItem.count({
          where: { collectionId: goal.collectionId, entry: { status: { key: 'completed' } } },
        }),
      ]);
      return { current: done, target: Math.max(1, total) };
    }
    if (metric === 'titles_completed' || metric === 'titles_started')
      return {
        current: await this.db.userMediaEntry.count({
          where: {
            userId,
            media,
            ...(metric === 'titles_completed' ? { completedOn: range } : { startedOn: range }),
          },
        }),
        target: goal.target,
      };
    if (metric === 'movies_watched')
      return {
        current: await this.db.entryViewing.count({
          where: { watchedOn: range, entry: { userId } },
        }),
        target: goal.target,
      };
    const sum = await this.db.progressLog.aggregate({
      where: {
        userId,
        metric: logMetrics[metric],
        occurredOn: range,
        ...(goal.mediaTypeId ? { mediaTypeId: goal.mediaTypeId } : {}),
      },
      _sum: { delta: true },
    });
    const value = sum._sum.delta ?? 0;
    return {
      current: Math.max(0, metric === 'hours_played' ? Math.floor(value / 60) : value),
      target: goal.target,
    };
  }

  private async result(userId: string, goal: GoalRow): Promise<Goal> {
    const { current, target } = await this.measure(userId, goal);
    const today = isoDay(new Date());
    const state: GoalState = goal.archived
      ? 'archived'
      : current >= target
        ? 'achieved'
        : goal.endsOn && isoDay(goal.endsOn) < today
          ? 'expired'
          : 'active';
    return {
      id: goal.id,
      name: goal.name,
      description: goal.description,
      metric: goal.metric as GoalMetric,
      mediaType: goal.mediaTypeId as MediaType | null,
      collectionId: goal.collectionId,
      collectionName: goal.collection?.name ?? null,
      target,
      current,
      startsOn: isoDay(goal.startsOn),
      endsOn: goal.endsOn ? isoDay(goal.endsOn) : null,
      state,
      createdAt: goal.createdAt.toISOString(),
    };
  }

  private async checkCollection(userId: string, collectionId: string | null | undefined) {
    if (
      collectionId &&
      !(await this.db.collection.findFirst({ where: { id: collectionId, userId } }))
    )
      throw new NotFoundException('Coleção não encontrada');
  }

  async list(userId: string) {
    const goals = await this.db.goal.findMany({
      where: { userId },
      include: { collection: { select: { name: true } } },
      orderBy: [{ archived: 'asc' }, { createdAt: 'desc' }],
    });
    return { goals: await Promise.all(goals.map((goal) => this.result(userId, goal))) };
  }

  async create(userId: string, input: GoalInput) {
    if ((await this.db.goal.count({ where: { userId } })) >= MAX_GOALS)
      throw new BadRequestException(`Você pode ter até ${MAX_GOALS} metas`);
    await this.checkCollection(userId, input.collectionId);
    const goal = await this.db.goal.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        metric: input.metric,
        mediaTypeId: input.mediaType,
        collectionId: input.collectionId,
        target: input.target,
        startsOn: day(input.startsOn),
        endsOn: input.endsOn ? day(input.endsOn) : null,
      },
      include: { collection: { select: { name: true } } },
    });
    await this.db.activityLog.create({
      data: { userId, action: 'goal.created', changes: { goalId: goal.id } },
    });
    return this.result(userId, goal);
  }

  async update(userId: string, id: string, input: GoalPatch) {
    const existing = await this.db.goal.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Meta não encontrada');
    const metric = input.metric ?? (existing.metric as GoalMetric);
    const collectionId =
      input.collectionId !== undefined ? input.collectionId : existing.collectionId;
    if ((metric === 'collection_completed') !== Boolean(collectionId))
      throw new BadRequestException('Escolha uma coleção somente para metas de coleção');
    await this.checkCollection(userId, input.collectionId);
    const startsOn = input.startsOn ? day(input.startsOn) : existing.startsOn;
    const endsOn =
      input.endsOn !== undefined ? (input.endsOn ? day(input.endsOn) : null) : existing.endsOn;
    if (endsOn && endsOn < startsOn)
      throw new BadRequestException('O prazo deve ser posterior ao início');
    const goal = await this.db.goal.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        metric: input.metric,
        mediaTypeId: input.mediaType,
        collectionId: input.collectionId,
        target: input.target,
        startsOn,
        endsOn,
        archived: input.archived,
      },
      include: { collection: { select: { name: true } } },
    });
    return this.result(userId, goal);
  }

  async remove(userId: string, id: string) {
    const removed = await this.db.goal.deleteMany({ where: { id, userId } });
    if (!removed.count) throw new NotFoundException('Meta não encontrada');
    return { deleted: true };
  }
}
