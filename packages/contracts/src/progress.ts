import { z } from 'zod';
import type { MediaType, StatusKey } from './index';

// Each category shares the library engine but tracks progress with its own typed shape.
export const progressKinds = {
  games: 'game',
  anime: 'episodic',
  series: 'episodic',
  manga: 'reading',
  movies: 'film',
  books: 'reading',
} as const satisfies Record<MediaType, string>;
export type ProgressKind = (typeof progressKinds)[MediaType];

export const releaseStatuses = ['upcoming', 'releasing', 'finished', 'unknown'] as const;
export const releaseStatusSchema = z.enum(releaseStatuses);
export type ReleaseStatus = z.infer<typeof releaseStatusSchema>;
export const releaseStatusLabels: Record<ReleaseStatus, string> = {
  upcoming: 'Anunciado',
  releasing: 'Em lançamento',
  finished: 'Finalizado',
  unknown: 'Não informado',
};

const count = (max: number) => z.number().int().min(0).max(max);
const total = (max: number) => z.number().int().min(1).max(max).nullable();
// Output lists are not capped: limits apply where names are written.
const names = z.array(z.string());
export const isoDateSchema = z.iso.date();

export const seasonSchema = z.object({
  number: z.number().int().min(0).max(1000),
  episodes: total(10000),
});
export type Season = z.infer<typeof seasonSchema>;
export const mediaMetadataSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('game'), platforms: names, developers: names, publishers: names }),
  z.object({
    kind: z.literal('episodic'),
    studios: names,
    totalEpisodes: total(100000),
    totalSeasons: total(1000),
    seasons: z.array(seasonSchema).max(200),
    releaseStatus: releaseStatusSchema,
  }),
  z.object({
    kind: z.literal('reading'),
    authors: names,
    publishers: names,
    totalChapters: total(100000),
    totalVolumes: total(10000),
    totalPages: total(100000),
    releaseStatus: releaseStatusSchema,
  }),
  z.object({ kind: z.literal('film'), directors: names, runtimeMinutes: total(2000) }),
]);
export type MediaMetadata = z.infer<typeof mediaMetadataSchema>;

export function emptyMetadata(type: MediaType): MediaMetadata {
  const kind = progressKinds[type];
  if (kind === 'game') return { kind, platforms: [], developers: [], publishers: [] };
  if (kind === 'episodic')
    return {
      kind,
      studios: [],
      totalEpisodes: null,
      totalSeasons: null,
      seasons: [],
      releaseStatus: 'unknown',
    };
  if (kind === 'reading')
    return {
      kind,
      authors: [],
      publishers: [],
      totalChapters: null,
      totalVolumes: null,
      totalPages: null,
      releaseStatus: 'unknown',
    };
  return { kind, directors: [], runtimeMinutes: null };
}

export const gameProgressSchema = z
  .object({
    kind: z.literal('game'),
    hoursPlayed: z.number().min(0).max(100000).multipleOf(0.5),
    completion: z.number().int().min(0).max(100),
  })
  .strict();
export const episodicProgressSchema = z
  .object({ kind: z.literal('episodic'), episodesWatched: count(100000) })
  .strict();
export const readingProgressSchema = z
  .object({
    kind: z.literal('reading'),
    chaptersRead: count(100000),
    volumesRead: count(10000),
    pagesRead: count(100000),
  })
  .strict();
// Films are tracked by viewing history, recorded through their own endpoint.
export const progressInputSchema = z.discriminatedUnion('kind', [
  gameProgressSchema,
  episodicProgressSchema,
  readingProgressSchema,
]);
export type ProgressInput = z.infer<typeof progressInputSchema>;
export const viewingSchema = z.object({ id: z.string(), watchedOn: isoDateSchema });
export type Viewing = z.infer<typeof viewingSchema>;
export const filmProgressSchema = z.object({
  kind: z.literal('film'),
  timesWatched: count(100000),
  lastWatchedOn: isoDateSchema.nullable(),
  viewings: z.array(viewingSchema),
});
export const entryProgressSchema = z.discriminatedUnion('kind', [
  gameProgressSchema,
  episodicProgressSchema,
  readingProgressSchema,
  filmProgressSchema,
]);
export type EntryProgress = z.infer<typeof entryProgressSchema>;
export const viewingCreateSchema = z.object({ watchedOn: isoDateSchema }).strict();
export type ViewingCreateInput = z.infer<typeof viewingCreateSchema>;

export function emptyProgress(type: MediaType): EntryProgress {
  const kind = progressKinds[type];
  if (kind === 'game') return { kind, hoursPlayed: 0, completion: 0 };
  if (kind === 'episodic') return { kind, episodesWatched: 0 };
  if (kind === 'reading') return { kind, chaptersRead: 0, volumesRead: 0, pagesRead: 0 };
  return { kind, timesWatched: 0, lastWatchedOn: null, viewings: [] };
}

/** Share of the work already consumed, or null when the total is unknown. */
export function progressRatio(progress: EntryProgress, metadata: MediaMetadata): number | null {
  if (progress.kind === 'game') return progress.completion / 100;
  if (progress.kind === 'film') return progress.timesWatched > 0 ? 1 : 0;
  if (progress.kind === 'episodic')
    return metadata.kind === 'episodic' && metadata.totalEpisodes
      ? Math.min(1, progress.episodesWatched / metadata.totalEpisodes)
      : null;
  if (metadata.kind !== 'reading') return null;
  if (metadata.totalChapters) return Math.min(1, progress.chaptersRead / metadata.totalChapters);
  if (metadata.totalVolumes) return Math.min(1, progress.volumesRead / metadata.totalVolumes);
  if (metadata.totalPages) return Math.min(1, progress.pagesRead / metadata.totalPages);
  return null;
}

/** Progress above the total is only rejected once the work is no longer being released. */
export function progressLimitError(
  progress: ProgressInput,
  metadata: MediaMetadata,
): string | null {
  if (progress.kind === 'episodic' && metadata.kind === 'episodic') {
    if (
      metadata.releaseStatus === 'finished' &&
      metadata.totalEpisodes &&
      progress.episodesWatched > metadata.totalEpisodes
    )
      return `Esta obra possui ${metadata.totalEpisodes} episódios`;
  }
  if (progress.kind === 'reading' && metadata.kind === 'reading') {
    if (metadata.releaseStatus !== 'finished') return null;
    if (metadata.totalChapters && progress.chaptersRead > metadata.totalChapters)
      return `Esta obra possui ${metadata.totalChapters} capítulos`;
    if (metadata.totalVolumes && progress.volumesRead > metadata.totalVolumes)
      return `Esta obra possui ${metadata.totalVolumes} volumes`;
    if (metadata.totalPages && progress.pagesRead > metadata.totalPages)
      return `Esta obra possui ${metadata.totalPages} páginas`;
  }
  return null;
}

/** Status implied by new progress when the person did not choose one explicitly. */
export function statusForProgress(
  current: StatusKey,
  progress: EntryProgress,
  metadata: MediaMetadata,
): StatusKey {
  const ratio = progressRatio(progress, metadata);
  if (ratio === 1) return 'completed';
  const started =
    progress.kind === 'game'
      ? progress.hoursPlayed > 0 || progress.completion > 0
      : progress.kind === 'episodic'
        ? progress.episodesWatched > 0
        : progress.kind === 'reading'
          ? progress.chaptersRead > 0 || progress.volumesRead > 0 || progress.pagesRead > 0
          : progress.timesWatched > 0;
  if (started && current === 'planned') return 'in_progress';
  return current;
}

/** Season and episode reached after watching a number of episodes in order. */
export function seasonPosition(
  episodesWatched: number,
  seasons: Season[],
): { season: number; episode: number } | null {
  if (episodesWatched < 1) return null;
  let remaining = episodesWatched;
  for (const season of seasons.filter((item) => item.number > 0)) {
    if (!season.episodes) return null;
    if (remaining <= season.episodes) return { season: season.number, episode: remaining };
    remaining -= season.episodes;
  }
  return null;
}
