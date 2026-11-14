import type { MediaType, MissionPeriod } from '@jinsei/contracts';

export type MissionMetric =
  | 'progress_titles'
  | 'episodes'
  | 'chapters'
  | 'pages'
  | 'minutes'
  | 'ratings'
  | 'additions'
  | 'viewings'
  | 'completions'
  | 'collection_items';
export type MissionDefinition = {
  id: string;
  metric: MissionMetric;
  target: number;
  label: string;
  /** Offered only when at least one of these categories is enabled. */
  requires?: MediaType[];
};

export const missionXp: Record<MissionPeriod, number> = { daily: 20, weekly: 60, monthly: 150 };
const missionCount: Record<MissionPeriod, number> = { daily: 3, weekly: 3, monthly: 2 };
const episodic: MediaType[] = ['anime', 'series'];

export const missionPool: Record<MissionPeriod, MissionDefinition[]> = {
  daily: [
    {
      id: 'progress-1',
      metric: 'progress_titles',
      target: 1,
      label: 'Avance o progresso de 1 título',
    },
    {
      id: 'episodes-2',
      metric: 'episodes',
      target: 2,
      label: 'Assista 2 episódios',
      requires: episodic,
    },
    {
      id: 'chapters-3',
      metric: 'chapters',
      target: 3,
      label: 'Leia 3 capítulos',
      requires: ['manga'],
    },
    { id: 'pages-20', metric: 'pages', target: 20, label: 'Leia 20 páginas', requires: ['books'] },
    {
      id: 'minutes-60',
      metric: 'minutes',
      target: 60,
      label: 'Jogue por 1 hora',
      requires: ['games'],
    },
    { id: 'ratings-1', metric: 'ratings', target: 1, label: 'Avalie 1 título' },
    { id: 'additions-1', metric: 'additions', target: 1, label: 'Adicione 1 título à biblioteca' },
    {
      id: 'viewings-1',
      metric: 'viewings',
      target: 1,
      label: 'Registre a sessão de um filme',
      requires: ['movies'],
    },
  ],
  weekly: [
    {
      id: 'progress-4',
      metric: 'progress_titles',
      target: 4,
      label: 'Avance em 4 títulos diferentes',
    },
    {
      id: 'episodes-10',
      metric: 'episodes',
      target: 10,
      label: 'Assista 10 episódios',
      requires: episodic,
    },
    {
      id: 'chapters-15',
      metric: 'chapters',
      target: 15,
      label: 'Leia 15 capítulos',
      requires: ['manga'],
    },
    {
      id: 'pages-150',
      metric: 'pages',
      target: 150,
      label: 'Leia 150 páginas',
      requires: ['books'],
    },
    {
      id: 'minutes-300',
      metric: 'minutes',
      target: 300,
      label: 'Jogue por 5 horas',
      requires: ['games'],
    },
    { id: 'completions-1', metric: 'completions', target: 1, label: 'Conclua 1 título' },
    {
      id: 'viewings-2',
      metric: 'viewings',
      target: 2,
      label: 'Assista 2 filmes',
      requires: ['movies'],
    },
    { id: 'ratings-3', metric: 'ratings', target: 3, label: 'Avalie 3 títulos' },
    {
      id: 'collection-3',
      metric: 'collection_items',
      target: 3,
      label: 'Adicione 3 títulos a coleções',
    },
  ],
  monthly: [
    { id: 'completions-4', metric: 'completions', target: 4, label: 'Conclua 4 títulos' },
    {
      id: 'episodes-40',
      metric: 'episodes',
      target: 40,
      label: 'Assista 40 episódios',
      requires: episodic,
    },
    {
      id: 'chapters-60',
      metric: 'chapters',
      target: 60,
      label: 'Leia 60 capítulos',
      requires: ['manga'],
    },
    {
      id: 'pages-600',
      metric: 'pages',
      target: 600,
      label: 'Leia 600 páginas',
      requires: ['books'],
    },
    {
      id: 'minutes-1200',
      metric: 'minutes',
      target: 1200,
      label: 'Jogue por 20 horas',
      requires: ['games'],
    },
    {
      id: 'viewings-6',
      metric: 'viewings',
      target: 6,
      label: 'Assista 6 filmes',
      requires: ['movies'],
    },
    { id: 'additions-8', metric: 'additions', target: 8, label: 'Adicione 8 títulos à biblioteca' },
    {
      id: 'collection-10',
      metric: 'collection_items',
      target: 10,
      label: 'Adicione 10 títulos a coleções',
    },
  ],
};

/** FNV-1a: a small stable hash so each person gets their own, repeatable mission draw. */
function hash(value: string) {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193) >>> 0;
  }
  return result;
}

export function pickMissions(period: MissionPeriod, seed: string, categories: MediaType[]) {
  return missionPool[period]
    .filter(
      (mission) => !mission.requires || mission.requires.some((type) => categories.includes(type)),
    )
    .map((mission) => ({ mission, order: hash(`${seed}:${mission.id}`) }))
    .sort((a, b) => a.order - b.order)
    .slice(0, missionCount[period])
    .map(({ mission }) => mission);
}
