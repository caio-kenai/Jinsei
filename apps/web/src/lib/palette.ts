import type { MediaType, StatusKey } from '@jinsei/contracts';

/** Vivid, fixed colors so the same thing always has the same color across the app. */
export const statusColors: Record<StatusKey, string> = {
  planned: '#7c8494',
  in_progress: '#7050cf',
  paused: '#c77c02',
  completed: '#15936a',
  dropped: '#d93a50',
};

export const categoryColors: Record<MediaType, string> = {
  games: '#7050cf',
  anime: '#e5306f',
  manga: '#f7832b',
  movies: '#2f7bff',
  series: '#15936a',
  books: '#c77c02',
};

/** Ratings go from red (low) through amber to green (high). */
export function ratingColor(rating: number) {
  const stops = ['#d93a50', '#e8622c', '#e8a400', '#7cb342', '#15936a'];
  const index = Math.min(stops.length - 1, Math.max(0, Math.ceil(rating) - 1));
  return stops[index];
}

/** Categorical order for anything without a semantic color. */
export const chartPalette = ['#7050cf', '#e5306f', '#2f7bff', '#f7832b', '#15936a', '#c77c02'];
