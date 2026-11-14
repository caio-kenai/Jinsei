import {
  emptyMetadata,
  progressKinds,
  releaseStatusSchema,
  type ManualMediaInput,
  type MediaMetadata,
  type MediaType,
  type ReleaseStatus,
  type Season,
} from '@jinsei/contracts';
import type { Prisma } from '../../generated/prisma/client';

export const metadataInclude = {
  game: true,
  series: { include: { seasons: { orderBy: { number: 'asc' } } } },
  reading: true,
  movie: true,
} satisfies Prisma.MediaItemInclude;
type WithMetadata = Prisma.MediaItemGetPayload<{ include: typeof metadataInclude }>;
type MetadataCreate = Pick<
  Prisma.MediaItemUncheckedCreateInput,
  'game' | 'series' | 'reading' | 'movie'
>;
type MetadataUpdate = Pick<
  Prisma.MediaItemUncheckedUpdateInput,
  'game' | 'series' | 'reading' | 'movie'
>;

const release = (value: string): ReleaseStatus => releaseStatusSchema.catch('unknown').parse(value);
const total = (value: number | null | undefined, max: number) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= max ? value : null;
const names = (values: string[]) =>
  [...new Set(values.map((value) => value.trim().slice(0, 120)).filter(Boolean))].slice(0, 12);
const seasons = (values: Season[]) =>
  [
    ...new Map(
      values
        .filter((season) => Number.isInteger(season.number) && season.number >= 0)
        .filter((season) => season.number <= 1000)
        .map((season) => [season.number, { ...season, episodes: total(season.episodes, 10000) }]),
    ).values(),
  ].slice(0, 200);

/** Provider data is normalized again before it reaches the shared catalog tables. */
export function sanitizeMetadata(metadata: MediaMetadata): MediaMetadata {
  switch (metadata.kind) {
    case 'game':
      return {
        kind: 'game',
        platforms: names(metadata.platforms),
        developers: names(metadata.developers),
        publishers: names(metadata.publishers),
      };
    case 'episodic':
      return {
        kind: 'episodic',
        studios: names(metadata.studios),
        totalEpisodes: total(metadata.totalEpisodes, 100000),
        totalSeasons: total(metadata.totalSeasons, 1000),
        seasons: seasons(metadata.seasons),
        releaseStatus: metadata.releaseStatus,
      };
    case 'reading':
      return {
        kind: 'reading',
        authors: names(metadata.authors),
        publishers: names(metadata.publishers),
        totalChapters: total(metadata.totalChapters, 100000),
        totalVolumes: total(metadata.totalVolumes, 10000),
        totalPages: total(metadata.totalPages, 100000),
        releaseStatus: metadata.releaseStatus,
      };
    case 'film':
      return {
        kind: 'film',
        directors: names(metadata.directors),
        runtimeMinutes: total(metadata.runtimeMinutes, 2000),
      };
  }
}

export function metadataResult(item: WithMetadata): MediaMetadata {
  const empty = emptyMetadata(item.mediaTypeId as MediaType);
  switch (empty.kind) {
    case 'game':
      return item.game
        ? {
            kind: 'game',
            platforms: item.game.platforms,
            developers: item.game.developers,
            publishers: item.game.publishers,
          }
        : empty;
    case 'episodic':
      return item.series
        ? {
            kind: 'episodic',
            studios: item.series.studios,
            totalEpisodes: item.series.totalEpisodes,
            totalSeasons: item.series.totalSeasons,
            seasons: item.series.seasons.map(({ number, episodes }) => ({ number, episodes })),
            releaseStatus: release(item.series.releaseStatus),
          }
        : empty;
    case 'reading':
      return item.reading
        ? {
            kind: 'reading',
            authors: item.reading.authors,
            publishers: item.reading.publishers,
            totalChapters: item.reading.totalChapters,
            totalVolumes: item.reading.totalVolumes,
            totalPages: item.reading.totalPages,
            releaseStatus: release(item.reading.releaseStatus),
          }
        : empty;
    case 'film':
      return item.movie
        ? {
            kind: 'film',
            directors: item.movie.directors,
            runtimeMinutes: item.movie.runtimeMinutes,
          }
        : empty;
  }
}

/** Typed column values for each specialized catalog table. */
function columns(input: MediaMetadata) {
  const metadata = sanitizeMetadata(input);
  switch (metadata.kind) {
    case 'game':
      return {
        kind: metadata.kind,
        values: {
          platforms: metadata.platforms,
          developers: metadata.developers,
          publishers: metadata.publishers,
        },
      };
    case 'episodic':
      return {
        kind: metadata.kind,
        values: {
          studios: metadata.studios,
          totalEpisodes: metadata.totalEpisodes,
          totalSeasons: metadata.totalSeasons,
          releaseStatus: metadata.releaseStatus,
        },
        seasons: metadata.seasons,
      };
    case 'reading':
      return {
        kind: metadata.kind,
        values: {
          authors: metadata.authors,
          publishers: metadata.publishers,
          totalChapters: metadata.totalChapters,
          totalVolumes: metadata.totalVolumes,
          totalPages: metadata.totalPages,
          releaseStatus: metadata.releaseStatus,
        },
      };
    case 'film':
      return {
        kind: metadata.kind,
        values: { directors: metadata.directors, runtimeMinutes: metadata.runtimeMinutes },
      };
  }
}

export function metadataCreate(input: MediaMetadata): MetadataCreate {
  const data = columns(input);
  switch (data.kind) {
    case 'game':
      return { game: { create: data.values } };
    case 'episodic':
      return { series: { create: { ...data.values, seasons: { create: data.seasons } } } };
    case 'reading':
      return { reading: { create: data.values } };
    case 'film':
      return { movie: { create: data.values } };
  }
}

export function metadataUpdate(input: MediaMetadata): MetadataUpdate {
  const data = columns(input);
  switch (data.kind) {
    case 'game':
      return { game: { upsert: { create: data.values, update: data.values } } };
    case 'episodic':
      return {
        series: {
          upsert: {
            create: { ...data.values, seasons: { create: data.seasons } },
            update: { ...data.values, seasons: { deleteMany: {}, create: data.seasons } },
          },
        },
      };
    case 'reading':
      return { reading: { upsert: { create: data.values, update: data.values } } };
    case 'film':
      return { movie: { upsert: { create: data.values, update: data.values } } };
  }
}

export function manualMetadata(input: ManualMediaInput): MediaMetadata {
  switch (progressKinds[input.mediaType]) {
    case 'game':
      return {
        kind: 'game',
        platforms: input.platforms,
        developers: input.creators,
        publishers: [],
      };
    case 'episodic':
      return {
        kind: 'episodic',
        studios: input.creators,
        totalEpisodes: input.totalEpisodes,
        totalSeasons: input.totalSeasons,
        seasons: [],
        releaseStatus: 'unknown',
      };
    case 'reading':
      return {
        kind: 'reading',
        authors: input.creators,
        publishers: [],
        totalChapters: input.totalChapters,
        totalVolumes: input.totalVolumes,
        totalPages: input.totalPages,
        releaseStatus: 'unknown',
      };
    case 'film':
      return { kind: 'film', directors: input.creators, runtimeMinutes: input.runtimeMinutes };
  }
}
