export type ProgressionStats = {
  entries: number;
  completions: number;
  categories: number;
  episodes: number;
  chapters: number;
  pages: number;
  minutes: number;
  viewings: number;
  collections: number;
  rankedCollection: number;
  goalsAchieved: number;
  bestStreak: number;
  accountDays: number;
  level: number;
  createdYear: number;
};
type Definition = {
  key: string;
  label: string;
  description: string;
  icon: string;
  target: number;
  value: (stats: ProgressionStats) => number;
};
const badge = (
  key: string,
  label: string,
  description: string,
  icon: string,
  target: number,
  value: (stats: ProgressionStats) => number,
): Definition => ({ key, label, description, icon, target, value });

export const badgeDefinitions: Definition[] = [
  badge(
    'first-entry',
    'Primeiro passo',
    'Adicione o primeiro título',
    'footprints',
    1,
    (s) => s.entries,
  ),
  badge(
    'first-completion',
    'Primeira conclusão',
    'Conclua um título',
    'circle-check',
    1,
    (s) => s.completions,
  ),
  badge('completions-10', 'Dezena', 'Conclua 10 títulos', 'medal', 10, (s) => s.completions),
  badge(
    'completions-50',
    'Meio centenário',
    'Conclua 50 títulos',
    'award',
    50,
    (s) => s.completions,
  ),
  badge(
    'completions-100',
    'Centenário',
    'Conclua 100 títulos',
    'trophy',
    100,
    (s) => s.completions,
  ),
  badge(
    'categories-3',
    'Eclético',
    'Tenha títulos de 3 categorias',
    'shapes',
    3,
    (s) => s.categories,
  ),
  badge(
    'categories-6',
    'Onívoro',
    'Tenha títulos de todas as categorias',
    'sparkles',
    6,
    (s) => s.categories,
  ),
  badge('episodes-500', 'Maratonista', 'Assista 500 episódios', 'tv', 500, (s) => s.episodes),
  badge(
    'chapters-1000',
    'Leitor voraz',
    'Leia 1.000 capítulos',
    'book-open',
    1000,
    (s) => s.chapters,
  ),
  badge(
    'pages-5000',
    'Devorador de páginas',
    'Leia 5.000 páginas',
    'book-marked',
    5000,
    (s) => s.pages,
  ),
  badge('hours-100', 'Jogador dedicado', 'Jogue 100 horas', 'gamepad-2', 6000, (s) => s.minutes),
  badge(
    'viewings-25',
    'Cinéfilo',
    'Registre 25 sessões de filmes',
    'clapperboard',
    25,
    (s) => s.viewings,
  ),
  badge('collector', 'Curador', 'Crie uma coleção', 'folder-heart', 1, (s) => s.collections),
  badge(
    'critic',
    'Crítico',
    'Monte um ranking com 10 títulos',
    'list-ordered',
    10,
    (s) => s.rankedCollection,
  ),
  badge('goal-achieved', 'Meta alcançada', 'Conclua uma meta', 'target', 1, (s) => s.goalsAchieved),
  badge(
    'streak-7',
    'Semana firme',
    'Mantenha uma sequência de 7 dias',
    'flame',
    7,
    (s) => s.bestStreak,
  ),
  badge(
    'streak-30',
    'Constância',
    'Mantenha uma sequência de 30 dias',
    'flame',
    30,
    (s) => s.bestStreak,
  ),
  badge(
    'streak-100',
    'Cem dias',
    'Mantenha uma sequência de 100 dias',
    'flame',
    100,
    (s) => s.bestStreak,
  ),
  badge(
    'age-30',
    'Primeiro mês',
    'Complete 30 dias de conta',
    'calendar-heart',
    30,
    (s) => s.accountDays,
  ),
  badge(
    'age-365',
    'Um ano de jornada',
    'Complete um ano de conta',
    'cake',
    365,
    (s) => s.accountDays,
  ),
  badge(
    'age-730',
    'Dois anos de jornada',
    'Complete dois anos de conta',
    'cake',
    730,
    (s) => s.accountDays,
  ),
  badge('level-10', 'Nível 10', 'Alcance o nível 10', 'crown', 10, (s) => s.level),
];

type TitleDefinition = {
  key: string;
  label: string;
  requirement: string;
  unlocked: (stats: ProgressionStats) => boolean;
};
export const titleDefinitions: TitleDefinition[] = [
  {
    key: 'aprendiz',
    label: 'Aprendiz',
    requirement: 'Disponível desde o início',
    unlocked: () => true,
  },
  { key: 'explorador', label: 'Explorador', requirement: 'Nível 5', unlocked: (s) => s.level >= 5 },
  {
    key: 'contador',
    label: 'Contador de histórias',
    requirement: 'Nível 10',
    unlocked: (s) => s.level >= 10,
  },
  { key: 'veterano', label: 'Veterano', requirement: 'Nível 20', unlocked: (s) => s.level >= 20 },
  {
    key: 'mestre',
    label: 'Mestre das jornadas',
    requirement: 'Nível 35',
    unlocked: (s) => s.level >= 35,
  },
  {
    key: 'lenda',
    label: 'Lenda do Jinsei',
    requirement: 'Nível 50',
    unlocked: (s) => s.level >= 50,
  },
  {
    key: 'pioneiro',
    label: 'Pioneiro',
    requirement: 'Conta criada no primeiro ano do Jinsei',
    unlocked: (s) => s.createdYear <= 2026,
  },
  {
    key: 'veterano-jinsei',
    label: 'Veterano do Jinsei',
    requirement: 'Um ano de conta',
    unlocked: (s) => s.accountDays >= 365,
  },
  {
    key: 'constante',
    label: 'Mestre da constância',
    requirement: 'Sequência de 30 dias',
    unlocked: (s) => s.bestStreak >= 30,
  },
  {
    key: 'curador',
    label: 'Curador',
    requirement: 'Criar uma coleção',
    unlocked: (s) => s.collections >= 1,
  },
  {
    key: 'centenario',
    label: 'Centenário',
    requirement: 'Concluir 100 títulos',
    unlocked: (s) => s.completions >= 100,
  },
];
