import { describe, expect, it } from 'vitest';
import {
  emptyMetadata,
  emptyProgress,
  entryPatchSchema,
  progressLimitError,
  progressRatio,
  seasonPosition,
  statusForProgress,
  viewingCreateSchema,
  type MediaMetadata,
} from '../../packages/contracts/src';

const series: MediaMetadata = {
  kind: 'episodic',
  studios: [],
  totalEpisodes: 24,
  totalSeasons: 2,
  seasons: [
    { number: 1, episodes: 12 },
    { number: 2, episodes: 12 },
  ],
  releaseStatus: 'finished',
};
const book: MediaMetadata = { ...emptyMetadata('books'), totalPages: 320 } as MediaMetadata;

describe('Progresso por categoria', () => {
  it('cria progresso vazio do tipo de cada categoria', () => {
    expect(emptyProgress('games').kind).toBe('game');
    expect(emptyProgress('anime').kind).toBe('episodic');
    expect(emptyProgress('series').kind).toBe('episodic');
    expect(emptyProgress('manga').kind).toBe('reading');
    expect(emptyProgress('books').kind).toBe('reading');
    expect(emptyProgress('movies').kind).toBe('film');
  });
  it('exige o tipo de progresso e recusa valores fora dos limites', () => {
    expect(
      entryPatchSchema.safeParse({ progress: { kind: 'episodic', episodesWatched: 3 } }).success,
    ).toBe(true);
    expect(entryPatchSchema.safeParse({ progress: { episodesWatched: 3 } }).success).toBe(false);
    expect(
      entryPatchSchema.safeParse({ progress: { kind: 'episodic', episodesWatched: -1 } }).success,
    ).toBe(false);
    expect(
      entryPatchSchema.safeParse({
        progress: { kind: 'reading', chaptersRead: 1, volumesRead: 0, pagesRead: 0.5 },
      }).success,
    ).toBe(false);
    expect(
      entryPatchSchema.safeParse({ progress: { kind: 'film', timesWatched: 1 } }).success,
    ).toBe(false);
  });
  it('calcula a proporção concluída somente quando o total é conhecido', () => {
    expect(progressRatio({ kind: 'episodic', episodesWatched: 6 }, series)).toBe(0.25);
    expect(
      progressRatio({ kind: 'episodic', episodesWatched: 6 }, emptyMetadata('anime')),
    ).toBeNull();
    expect(
      progressRatio({ kind: 'reading', chaptersRead: 0, volumesRead: 0, pagesRead: 160 }, book),
    ).toBe(0.5);
    expect(
      progressRatio({ kind: 'game', hoursPlayed: 2, completion: 40 }, emptyMetadata('games')),
    ).toBe(0.4);
  });
  it('limita o progresso apenas de obras finalizadas', () => {
    expect(progressLimitError({ kind: 'episodic', episodesWatched: 25 }, series)).toContain('24');
    expect(
      progressLimitError(
        { kind: 'episodic', episodesWatched: 25 },
        { ...series, releaseStatus: 'releasing' },
      ),
    ).toBeNull();
    expect(progressLimitError({ kind: 'episodic', episodesWatched: 24 }, series)).toBeNull();
  });
  it('infere o status ao iniciar e ao concluir', () => {
    expect(statusForProgress('planned', { kind: 'episodic', episodesWatched: 1 }, series)).toBe(
      'in_progress',
    );
    expect(
      statusForProgress('in_progress', { kind: 'episodic', episodesWatched: 24 }, series),
    ).toBe('completed');
    expect(statusForProgress('paused', { kind: 'episodic', episodesWatched: 5 }, series)).toBe(
      'paused',
    );
    expect(statusForProgress('planned', { kind: 'episodic', episodesWatched: 0 }, series)).toBe(
      'planned',
    );
    expect(
      statusForProgress(
        'planned',
        { kind: 'film', timesWatched: 1, lastWatchedOn: null, viewings: [] },
        emptyMetadata('movies'),
      ),
    ).toBe('completed');
  });
  it('localiza temporada e episódio pelo total assistido', () => {
    expect(seasonPosition(0, series.kind === 'episodic' ? series.seasons : [])).toBeNull();
    expect(seasonPosition(12, series.kind === 'episodic' ? series.seasons : [])).toEqual({
      season: 1,
      episode: 12,
    });
    expect(seasonPosition(14, series.kind === 'episodic' ? series.seasons : [])).toEqual({
      season: 2,
      episode: 2,
    });
    expect(seasonPosition(30, series.kind === 'episodic' ? series.seasons : [])).toBeNull();
    expect(seasonPosition(3, [{ number: 1, episodes: null }])).toBeNull();
  });
  it('valida a data das sessões de filmes', () => {
    expect(viewingCreateSchema.safeParse({ watchedOn: '2026-11-14' }).success).toBe(true);
    expect(viewingCreateSchema.safeParse({ watchedOn: '2026-02-30' }).success).toBe(false);
    expect(viewingCreateSchema.safeParse({ watchedOn: '14/11/2026' }).success).toBe(false);
  });
});
