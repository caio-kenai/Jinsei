import { currentDateLocale, currentLocale, msg, translate } from '@/i18n/config';
import { format, parseISO } from 'date-fns';
import {
  progressRatio,
  releaseStatusLabels,
  seasonPosition,
  type LibraryEntry,
  type ProgressInput,
} from '@jinsei/contracts';

const number = (value: number) => value.toLocaleString(currentLocale());
const list = (values: string[], limit = 3) =>
  values.length > limit
    ? `${values.slice(0, limit).join(', ')} +${values.length - limit}`
    : values.join(', ');
export const shortDate = (value: string) =>
  format(parseISO(value), translate('d MMM yyyy'), { locale: currentDateLocale() });
export const runtime = (minutes: number) =>
  minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;

export function progressPercent(entry: LibraryEntry): number | null {
  const ratio = progressRatio(entry.progress, entry.metadata);
  return ratio === null ? null : Math.round(ratio * 100);
}

/** Position within multi-season works, such as "T2 · E5". */
export function episodePosition(entry: LibraryEntry): string | null {
  if (entry.progress.kind !== 'episodic' || entry.metadata.kind !== 'episodic') return null;
  if (entry.metadata.seasons.filter((season) => season.number > 0).length < 2) return null;
  const position = seasonPosition(entry.progress.episodesWatched, entry.metadata.seasons);
  return position
    ? translate('T{season} · E{episode}', { season: position.season, episode: position.episode })
    : null;
}

export function progressSummary(entry: LibraryEntry): string {
  const { progress, metadata } = entry;
  switch (progress.kind) {
    case 'game':
      return `${number(progress.hoursPlayed)} h · ${progress.completion}%`;
    case 'episodic': {
      const total = metadata.kind === 'episodic' ? metadata.totalEpisodes : null;
      const watched = number(progress.episodesWatched);
      return total
        ? translate('{watched}/{total} ep.', { watched, total: number(total) })
        : translate('{watched} ep.', { watched });
    }
    case 'reading': {
      const totals = metadata.kind === 'reading' ? metadata : null;
      if (entry.mediaType === 'books') {
        const read = number(progress.pagesRead);
        return totals?.totalPages
          ? translate('{read}/{total} pág.', { read, total: number(totals.totalPages) })
          : translate('{read} pág.', { read });
      }
      const chapters = totals?.totalChapters
        ? translate('Cap. {read}/{total}', {
            read: number(progress.chaptersRead),
            total: number(totals.totalChapters),
          })
        : translate('Cap. {read}', { read: number(progress.chaptersRead) });
      return progress.volumesRead
        ? translate('{chapters} · Vol. {volumes}', {
            chapters,
            volumes: number(progress.volumesRead),
          })
        : chapters;
    }
    case 'film':
      return progress.timesWatched
        ? translate('{times}× · {date}', {
            times: progress.timesWatched,
            date: shortDate(progress.lastWatchedOn!),
          })
        : translate('Não assistido');
  }
}

/** One-step update offered next to the progress, when the category has a natural unit. */
export function nextStep(entry: LibraryEntry): { label: string; progress: ProgressInput } | null {
  const { progress, metadata } = entry;
  if (progress.kind === 'episodic') {
    const total = metadata.kind === 'episodic' ? metadata.totalEpisodes : null;
    if (total && progress.episodesWatched >= total) return null;
    return {
      label: translate('+1 episódio'),
      progress: { kind: 'episodic', episodesWatched: progress.episodesWatched + 1 },
    };
  }
  if (progress.kind === 'reading' && entry.mediaType === 'manga') {
    const total = metadata.kind === 'reading' ? metadata.totalChapters : null;
    if (total && progress.chaptersRead >= total) return null;
    return {
      label: translate('+1 capítulo'),
      progress: { ...progress, chaptersRead: progress.chaptersRead + 1 },
    };
  }
  return null;
}

/** Short line with the most relevant credits of the work. */
export function creditsLine(entry: LibraryEntry): string {
  const { metadata } = entry;
  switch (metadata.kind) {
    case 'game':
      return list(metadata.platforms, 2);
    case 'episodic':
      return list(metadata.studios, 2);
    case 'reading':
      return list(metadata.authors, 2);
    case 'film':
      return list(metadata.directors, 2);
  }
}

export function metadataFacts(entry: LibraryEntry): { label: string; value: string }[] {
  const { metadata } = entry;
  const facts: [string, string | number | null][] = [];
  switch (metadata.kind) {
    case 'game':
      facts.push([msg('Desenvolvimento'), list(metadata.developers)]);
      facts.push([msg('Publicação'), list(metadata.publishers)]);
      break;
    case 'episodic':
      facts.push([msg('Episódios'), metadata.totalEpisodes]);
      facts.push([msg('Temporadas'), metadata.totalSeasons]);
      facts.push([msg('Produção'), list(metadata.studios)]);
      if (metadata.releaseStatus !== 'unknown')
        facts.push([msg('Situação'), translate(releaseStatusLabels[metadata.releaseStatus])]);
      break;
    case 'reading':
      facts.push([msg('Autoria'), list(metadata.authors)]);
      facts.push([msg('Editora'), list(metadata.publishers, 2)]);
      facts.push([msg('Capítulos'), metadata.totalChapters]);
      facts.push([msg('Volumes'), metadata.totalVolumes]);
      facts.push([msg('Páginas'), metadata.totalPages]);
      if (metadata.releaseStatus !== 'unknown')
        facts.push([msg('Situação'), translate(releaseStatusLabels[metadata.releaseStatus])]);
      break;
    case 'film':
      facts.push([msg('Direção'), list(metadata.directors)]);
      facts.push([
        msg('Duração'),
        metadata.runtimeMinutes ? runtime(metadata.runtimeMinutes) : null,
      ]);
      break;
  }
  return facts.flatMap(([label, value]) =>
    value === null || value === ''
      ? []
      : [{ label: translate(label), value: typeof value === 'number' ? number(value) : value }],
  );
}
