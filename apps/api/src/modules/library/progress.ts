import {
  progressKinds,
  type EntryProgress,
  type MediaType,
  type ProgressInput,
} from '@jinsei/contracts';
import type { Prisma } from '../../generated/prisma/client';

export const progressInclude = {
  gameProgress: true,
  episodeProgress: true,
  readingProgress: true,
  viewings: { orderBy: [{ watchedOn: 'desc' }, { createdAt: 'desc' }], take: 20 },
  _count: { select: { viewings: true } },
} satisfies Prisma.UserMediaEntryInclude;
type WithProgress = Prisma.UserMediaEntryGetPayload<{ include: typeof progressInclude }>;
type ProgressCreate = Pick<
  Prisma.UserMediaEntryUncheckedCreateInput,
  'gameProgress' | 'episodeProgress' | 'readingProgress'
>;
type ProgressUpdate = Pick<
  Prisma.UserMediaEntryUncheckedUpdateInput,
  'gameProgress' | 'episodeProgress' | 'readingProgress'
>;

export const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export function progressResult(entry: WithProgress, type: MediaType): EntryProgress {
  switch (progressKinds[type]) {
    case 'game':
      return {
        kind: 'game',
        hoursPlayed: (entry.gameProgress?.minutesPlayed ?? 0) / 60,
        completion: entry.gameProgress?.completion ?? 0,
      };
    case 'episodic':
      return { kind: 'episodic', episodesWatched: entry.episodeProgress?.episodesWatched ?? 0 };
    case 'reading':
      return {
        kind: 'reading',
        chaptersRead: entry.readingProgress?.chaptersRead ?? 0,
        volumesRead: entry.readingProgress?.volumesRead ?? 0,
        pagesRead: entry.readingProgress?.pagesRead ?? 0,
      };
    case 'film':
      return {
        kind: 'film',
        timesWatched: entry._count.viewings,
        lastWatchedOn: entry.viewings[0] ? isoDay(entry.viewings[0].watchedOn) : null,
        viewings: entry.viewings.map((viewing) => ({
          id: viewing.id,
          watchedOn: isoDay(viewing.watchedOn),
        })),
      };
  }
}

function values(progress: ProgressInput) {
  switch (progress.kind) {
    case 'game':
      return {
        kind: progress.kind,
        values: {
          minutesPlayed: Math.round(progress.hoursPlayed * 60),
          completion: progress.completion,
        },
      };
    case 'episodic':
      return { kind: progress.kind, values: { episodesWatched: progress.episodesWatched } };
    case 'reading':
      return {
        kind: progress.kind,
        values: {
          chaptersRead: progress.chaptersRead,
          volumesRead: progress.volumesRead,
          pagesRead: progress.pagesRead,
        },
      };
  }
}

/** Every entry starts with a progress record of its own category, even when empty. */
export function progressCreate(type: MediaType, progress?: ProgressInput): ProgressCreate {
  const kind = progressKinds[type];
  if (kind === 'film') return {};
  const data = values(
    progress ??
      (kind === 'game'
        ? { kind, hoursPlayed: 0, completion: 0 }
        : kind === 'episodic'
          ? { kind, episodesWatched: 0 }
          : { kind, chaptersRead: 0, volumesRead: 0, pagesRead: 0 }),
  );
  switch (data.kind) {
    case 'game':
      return { gameProgress: { create: data.values } };
    case 'episodic':
      return { episodeProgress: { create: data.values } };
    case 'reading':
      return { readingProgress: { create: data.values } };
  }
}

export function progressUpdate(progress: ProgressInput): ProgressUpdate {
  const data = values(progress);
  switch (data.kind) {
    case 'game':
      return { gameProgress: { upsert: { create: data.values, update: data.values } } };
    case 'episodic':
      return { episodeProgress: { upsert: { create: data.values, update: data.values } } };
    case 'reading':
      return { readingProgress: { upsert: { create: data.values, update: data.values } } };
  }
}

export type ProgressDelta = {
  metric: 'minutes' | 'episodes' | 'chapters' | 'volumes' | 'pages';
  delta: number;
};

/** Signed changes between the stored progress and an update, ignoring unchanged counters. */
export function progressDeltas(before: EntryProgress, after: ProgressInput): ProgressDelta[] {
  const changes: ProgressDelta[] = [];
  if (before.kind === 'game' && after.kind === 'game')
    changes.push({
      metric: 'minutes',
      delta: Math.round(after.hoursPlayed * 60) - Math.round(before.hoursPlayed * 60),
    });
  if (before.kind === 'episodic' && after.kind === 'episodic')
    changes.push({ metric: 'episodes', delta: after.episodesWatched - before.episodesWatched });
  if (before.kind === 'reading' && after.kind === 'reading')
    changes.push(
      { metric: 'chapters', delta: after.chaptersRead - before.chaptersRead },
      { metric: 'volumes', delta: after.volumesRead - before.volumesRead },
      { metric: 'pages', delta: after.pagesRead - before.pagesRead },
    );
  return changes.filter((change) => change.delta !== 0);
}
