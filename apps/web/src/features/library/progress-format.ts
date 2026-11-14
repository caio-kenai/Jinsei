import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  progressRatio,
  releaseStatusLabels,
  seasonPosition,
  type LibraryEntry,
  type ProgressInput,
} from '@jinsei/contracts';

const number = (value: number) => value.toLocaleString('pt-BR');
const list = (values: string[], limit = 3) =>
  values.length > limit
    ? `${values.slice(0, limit).join(', ')} +${values.length - limit}`
    : values.join(', ');
export const shortDate = (value: string) => format(parseISO(value), 'd MMM yyyy', { locale: ptBR });
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
  return position ? `T${position.season} · E${position.episode}` : null;
}

export function progressSummary(entry: LibraryEntry): string {
  const { progress, metadata } = entry;
  switch (progress.kind) {
    case 'game':
      return `${number(progress.hoursPlayed)} h · ${progress.completion}%`;
    case 'episodic': {
      const total = metadata.kind === 'episodic' ? metadata.totalEpisodes : null;
      const watched = number(progress.episodesWatched);
      return total ? `${watched}/${number(total)} ep.` : `${watched} ep.`;
    }
    case 'reading': {
      const totals = metadata.kind === 'reading' ? metadata : null;
      if (entry.mediaType === 'books') {
        const read = number(progress.pagesRead);
        return totals?.totalPages ? `${read}/${number(totals.totalPages)} pág.` : `${read} pág.`;
      }
      const chapters = totals?.totalChapters
        ? `Cap. ${number(progress.chaptersRead)}/${number(totals.totalChapters)}`
        : `Cap. ${number(progress.chaptersRead)}`;
      return progress.volumesRead ? `${chapters} · Vol. ${number(progress.volumesRead)}` : chapters;
    }
    case 'film':
      return progress.timesWatched
        ? `${progress.timesWatched}× · ${shortDate(progress.lastWatchedOn!)}`
        : 'Não assistido';
  }
}

/** One-step update offered next to the progress, when the category has a natural unit. */
export function nextStep(entry: LibraryEntry): { label: string; progress: ProgressInput } | null {
  const { progress, metadata } = entry;
  if (progress.kind === 'episodic') {
    const total = metadata.kind === 'episodic' ? metadata.totalEpisodes : null;
    if (total && progress.episodesWatched >= total) return null;
    return {
      label: '+1 episódio',
      progress: { kind: 'episodic', episodesWatched: progress.episodesWatched + 1 },
    };
  }
  if (progress.kind === 'reading' && entry.mediaType === 'manga') {
    const total = metadata.kind === 'reading' ? metadata.totalChapters : null;
    if (total && progress.chaptersRead >= total) return null;
    return {
      label: '+1 capítulo',
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
      facts.push(['Desenvolvimento', list(metadata.developers)]);
      facts.push(['Publicação', list(metadata.publishers)]);
      break;
    case 'episodic':
      facts.push(['Episódios', metadata.totalEpisodes]);
      facts.push(['Temporadas', metadata.totalSeasons]);
      facts.push(['Produção', list(metadata.studios)]);
      if (metadata.releaseStatus !== 'unknown')
        facts.push(['Situação', releaseStatusLabels[metadata.releaseStatus]]);
      break;
    case 'reading':
      facts.push(['Autoria', list(metadata.authors)]);
      facts.push(['Editora', list(metadata.publishers, 2)]);
      facts.push(['Capítulos', metadata.totalChapters]);
      facts.push(['Volumes', metadata.totalVolumes]);
      facts.push(['Páginas', metadata.totalPages]);
      if (metadata.releaseStatus !== 'unknown')
        facts.push(['Situação', releaseStatusLabels[metadata.releaseStatus]]);
      break;
    case 'film':
      facts.push(['Direção', list(metadata.directors)]);
      facts.push(['Duração', metadata.runtimeMinutes ? runtime(metadata.runtimeMinutes) : null]);
      break;
  }
  return facts.flatMap(([label, value]) =>
    value === null || value === ''
      ? []
      : [{ label, value: typeof value === 'number' ? number(value) : value }],
  );
}
