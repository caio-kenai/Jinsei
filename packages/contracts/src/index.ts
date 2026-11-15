import { z } from 'zod';
import { msg } from './msg';
import {
  entryProgressSchema,
  isoDateSchema,
  mediaMetadataSchema,
  progressInputSchema,
} from './progress';
export * from './progress';
export * from './support';
export * from './i18n';
export const appVersion = '0.1.8';

export const healthSchema = z.object({ status: z.literal('ok'), service: z.literal('jinsei-api') });

export const mediaTypes = ['games', 'anime', 'manga', 'movies', 'series', 'books'] as const;
export const mediaTypeSchema = z.enum(mediaTypes);
export type MediaType = z.infer<typeof mediaTypeSchema>;
export const categoryLabels: Record<MediaType, string> = {
  games: 'Jogos',
  anime: 'Animes',
  manga: 'Mangás',
  movies: 'Filmes',
  series: 'Séries',
  books: 'Livros',
};
export const themeSchema = z.enum(['light', 'dark', 'system']);
export const accentSchema = z.enum([
  'black',
  'rose',
  'violet',
  'blue',
  'emerald',
  'pink',
  'indigo',
  'orange',
  'teal',
  'bronze',
]);
/** Visual themes change surfaces and add a decorative backdrop; accent stays independent. */
export const visualThemeSchema = z.enum([
  'classic',
  'sakura',
  'aurora',
  'ocean',
  'forest',
  'sunset',
  'neon',
]);
export type VisualTheme = z.infer<typeof visualThemeSchema>;
export const visualThemeLabels: Record<VisualTheme, string> = {
  classic: 'Clássico',
  sakura: 'Sakura',
  aurora: 'Aurora',
  ocean: 'Oceano',
  forest: 'Floresta',
  sunset: 'Pôr do sol',
  neon: 'Neon',
};
export const densitySchema = z.enum(['compact', 'comfortable']);
/** IANA time zone used for daily missions and streaks. */
export const timezoneSchema = z
  .string()
  .min(1)
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, 'Fuso horário inválido');
export const emailSchema = z.email('Informe um e-mail válido').max(254).trim().toLowerCase();
export const passwordSchema = z.string().min(12, msg('Use pelo menos 12 caracteres')).max(128);
export const credentialsSchema = z
  .object({ email: emailSchema, password: passwordSchema })
  .strict();
export type Credentials = z.infer<typeof credentialsSchema>;
export const registrationSchema = credentialsSchema.extend({
  displayName: z.string().trim().min(2).max(60).optional(),
});
export type RegistrationInput = z.infer<typeof registrationSchema>;
export const usernameSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9][a-z0-9_-]+$/, msg('Use letras minúsculas, números, _ ou -'));
export const locales = ['pt-BR', 'en', 'es'] as const;
export const localeSchema = z.enum(locales);
export type Locale = z.infer<typeof localeSchema>;
export const defaultLocale: Locale = 'pt-BR';
export const localeLabels: Record<Locale, string> = {
  'pt-BR': 'Português (Brasil)',
  en: 'English',
  es: 'Español',
};
export const onboardingSchema = z
  .object({
    displayName: z.string().trim().min(2).max(60),
    username: usernameSchema,
    categories: z
      .array(mediaTypeSchema)
      .min(1)
      .max(mediaTypes.length)
      .refine((v) => new Set(v).size === v.length),
    theme: themeSchema,
    accent: accentSchema.default('black'),
    locale: localeSchema.optional(),
  })
  .strict();
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export const profileLinkSchema = z
  .object({
    label: z.string().trim().min(1).max(40),
    url: z
      .url()
      .max(500)
      .refine((value) => value.startsWith('https://'), msg('Use um endereço HTTPS')),
  })
  .strict();
export type ProfileLink = z.infer<typeof profileLinkSchema>;
export const dateFormats = ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'] as const;
export const dateFormatSchema = z.enum(dateFormats);
export const timeFormats = ['24h', '12h'] as const;
export const timeFormatSchema = z.enum(timeFormats);
export const preferencesPatchSchema = onboardingSchema
  .partial()
  .extend({
    accent: accentSchema.optional(),
    visualTheme: visualThemeSchema.optional(),
    bio: z.string().trim().max(500).optional(),
    isPublic: z.boolean().optional(),
    sidebarCollapsed: z.boolean().optional(),
    density: densitySchema.optional(),
    timezone: timezoneSchema.optional(),
    dateFormat: dateFormatSchema.optional(),
    timeFormat: timeFormatSchema.optional(),
    celebrations: z.boolean().optional(),
    locale: localeSchema.optional(),
    showFavorites: z.boolean().optional(),
    showStatistics: z.boolean().optional(),
    showReviews: z.boolean().optional(),
    showHistory: z.boolean().optional(),
    showGoals: z.boolean().optional(),
    links: z.array(profileLinkSchema).max(5).optional(),
  })
  .strict();
export type PreferencesPatch = z.infer<typeof preferencesPatchSchema>;
export const currentUserSchema = z.object({
  isAdmin: z.boolean().default(false),
  emailVerified: z.boolean().default(true),
  mfaEnabled: z.boolean().default(false),
  id: z.string(),
  email: z.string(),
  createdAt: z.string(),
  profile: z.object({
    displayName: z.string(),
    username: z.string().nullable(),
    bio: z.string(),
    isPublic: z.boolean(),
    avatarUrl: z.string().nullable(),
    bannerUrl: z.string().nullable(),
    showFavorites: z.boolean(),
    showStatistics: z.boolean(),
    showReviews: z.boolean(),
    showHistory: z.boolean(),
    showGoals: z.boolean(),
    links: z.array(profileLinkSchema),
  }),
  preferences: z.object({
    theme: themeSchema,
    accent: accentSchema,
    visualTheme: visualThemeSchema.default('classic'),
    density: densitySchema,
    sidebarCollapsed: z.boolean(),
    timezone: z.string(),
    dateFormat: dateFormatSchema.default('dd/MM/yyyy'),
    timeFormat: timeFormatSchema.default('24h'),
    celebrations: z.boolean().default(true),
    locale: localeSchema.default('pt-BR'),
    categories: z.array(mediaTypeSchema),
    onboarded: z.boolean(),
  }),
});
export type CurrentUser = z.infer<typeof currentUserSchema>;
export const instanceSettingsSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(280),
    contactEmail: z.union([z.email().max(254), z.literal('')]),
    registrationsEnabled: z.boolean(),
    externalCatalogEnabled: z.boolean(),
  })
  .strict();
export type InstanceSettings = z.infer<typeof instanceSettingsSchema>;
export const publicInstanceSchema = instanceSettingsSchema.extend({
  version: z.string(),
  uploadsEnabled: z.boolean(),
  mailEnabled: z.boolean().default(false),
  publicUrl: z.url(),
});
export type PublicInstance = z.infer<typeof publicInstanceSchema>;
export const forgotPasswordSchema = z.object({ email: emailSchema }).strict();
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export const emailTokenSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, msg('Link inválido ou expirado'));
export const resetPasswordSchema = z
  .object({ token: emailTokenSchema, password: passwordSchema })
  .strict();
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export const verifyEmailSchema = z.object({ token: emailTokenSchema }).strict();
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export const mfaCodeSchema = z.string().trim().min(6).max(12);
export const mfaCodeInputSchema = z.object({ code: mfaCodeSchema }).strict();
export type MfaCodeInput = z.infer<typeof mfaCodeInputSchema>;
export const mfaDisableSchema = z
  .object({ password: z.string().max(128), code: mfaCodeSchema })
  .strict();
export type MfaDisableInput = z.infer<typeof mfaDisableSchema>;
export const loginMfaSchema = z
  .object({ challenge: emailTokenSchema, code: mfaCodeSchema })
  .strict();
export type LoginMfaInput = z.infer<typeof loginMfaSchema>;
export const loginResultSchema = z.union([
  z.object({ authenticated: z.literal(true) }),
  z.object({ mfaRequired: z.literal(true), challenge: z.string() }),
]);
export type LoginResult = z.infer<typeof loginResultSchema>;
export const mfaStatusSchema = z.object({
  enabled: z.boolean(),
  remainingRecoveryCodes: z.number(),
});
export type MfaStatus = z.infer<typeof mfaStatusSchema>;
export const passwordChangeSchema = z
  .object({ currentPassword: z.string().max(128), newPassword: passwordSchema })
  .strict();
export const accountDeleteSchema = z.object({ password: z.string().max(128) }).strict();

export const statusKeys = ['planned', 'in_progress', 'paused', 'completed', 'dropped'] as const;
export const statusSchema = z.enum(statusKeys);
/** How a public review recommends the work. */
export const recommendationSchema = z.enum(['recommended', 'mixed', 'not_recommended']);
export type Recommendation = z.infer<typeof recommendationSchema>;
export const recommendationLabels: Record<Recommendation, string> = {
  recommended: 'Recomendo',
  mixed: 'Sentimentos mistos',
  not_recommended: 'Não recomendo',
};

export type StatusKey = z.infer<typeof statusSchema>;
export const statusLabels: Record<StatusKey, string> = {
  planned: 'Planejado',
  in_progress: 'Em andamento',
  paused: 'Pausado',
  completed: 'Concluído',
  dropped: 'Abandonado',
};
export const ratingSchema = z.number().min(0).max(5).multipleOf(0.25).nullable();
export const ratingValues = Array.from({ length: 20 }, (_, index) => (index + 1) / 4);
export const personalFieldsSchema = z.object({
  status: statusSchema.default('planned'),
  rating: ratingSchema.default(null),
  favorite: z.boolean().default(false),
  notes: z.string().max(10000).default(''),
  tags: z.array(z.string().trim().min(1).max(24)).max(8).default([]),
  progress: progressInputSchema.optional(),
  startedOn: isoDateSchema.nullable().optional(),
  completedOn: isoDateSchema.nullable().optional(),
});
export const manualMediaSchema = z
  .object({
    mediaType: mediaTypeSchema.default('games'),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(3000).default(''),
    coverUrl: z
      .url()
      .max(2000)
      .refine((value) => value.startsWith('https://'), msg('Use uma imagem HTTPS'))
      .nullable()
      .default(null),
    releaseYear: z.number().int().min(1900).max(2100).nullable().default(null),
    platforms: z.array(z.string().trim().min(1).max(50)).max(12).default([]),
    genres: z.array(z.string().trim().min(1).max(50)).max(8).default([]),
    creators: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
    totalEpisodes: z.number().int().min(1).max(100000).nullable().default(null),
    totalSeasons: z.number().int().min(1).max(1000).nullable().default(null),
    totalChapters: z.number().int().min(1).max(100000).nullable().default(null),
    totalVolumes: z.number().int().min(1).max(10000).nullable().default(null),
    totalPages: z.number().int().min(1).max(100000).nullable().default(null),
    runtimeMinutes: z.number().int().min(1).max(2000).nullable().default(null),
  })
  .strict();
export type ManualMediaInput = z.infer<typeof manualMediaSchema>;
export const sourceInputSchema = z
  .object({
    provider: z.enum(['wikidata', 'igdb', 'tvmaze', 'openlibrary', 'tmdb']),
    externalId: z
      .string()
      .regex(/^(Q\d+|\d+|(?:anime|series):\d+|(?:books:)?OL\d+W|(?:movie|tv):\d+)$/)
      .max(40),
  })
  .strict();
export type SourceInput = z.infer<typeof sourceInputSchema>;
export const entryCreateSchema = personalFieldsSchema
  .extend({
    mediaId: z.string().max(100).optional(),
    media: manualMediaSchema.optional(),
    source: sourceInputSchema.optional(),
  })
  .strict()
  .refine(
    (input) => [input.mediaId, input.media, input.source].filter(Boolean).length === 1,
    'Escolha uma obra ou cadastre um título',
  );
export type EntryCreateInput = z.infer<typeof entryCreateSchema>;
export const entryPatchSchema = z
  .object({
    status: statusSchema.optional(),
    rating: ratingSchema.optional(),
    favorite: z.boolean().optional(),
    notes: personalFieldsSchema.shape.notes.removeDefault().optional(),
    tags: personalFieldsSchema.shape.tags.removeDefault().optional(),
    progress: progressInputSchema.optional(),
    startedOn: isoDateSchema.nullable().optional(),
    completedOn: isoDateSchema.nullable().optional(),
    boardRank: z.number().finite().min(-1e9).max(1e9).optional(),
    review: z.string().trim().max(5000).optional(),
    reviewPublic: z.boolean().optional(),
    recommendation: recommendationSchema.nullable().optional(),
  })
  .strict();
export type EntryPatchInput = z.infer<typeof entryPatchSchema>;
export const libraryQuerySchema = z
  .object({
    mediaType: mediaTypeSchema.optional(),
    q: z.string().trim().max(120).default(''),
    status: statusSchema.optional(),
    favorite: z.enum(['true', 'false']).optional(),
    tag: z.string().max(24).optional(),
    sort: z
      .enum(['updatedAt', 'title', 'rating', 'createdAt', 'completedOn', 'boardRank'])
      .default('updatedAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
export type LibraryQuery = z.infer<typeof libraryQuerySchema>;
export const catalogQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .regex(/^[^\u0000-\u001f]+$/),
    mediaType: mediaTypeSchema.default('games'),
  })
  .strict();
export const coverAttributionSchema = z.object({
  layout: z.enum(['portrait', 'landscape']).optional(),
  provider: z.string(),
  sourceUrl: z.url(),
  license: z.string(),
  licenseUrl: z.url().nullable(),
  artist: z.string().nullable(),
});
export type CoverAttribution = z.infer<typeof coverAttributionSchema>;
export const catalogResultSchema = z.object({
  id: z.string().optional(),
  externalId: z.string().optional(),
  provider: z.string(),
  mediaType: mediaTypeSchema,
  title: z.string(),
  description: z.string(),
  releaseYear: z.number().nullable(),
  coverUrl: z.string().nullable(),
  coverAttribution: coverAttributionSchema.nullable().default(null),
  platforms: z.array(z.string()),
  genres: z.array(z.string()),
  developers: z.array(z.string()),
  metadata: mediaMetadataSchema,
  attribution: z.object({ label: z.string(), url: z.string().nullable(), license: z.string() }),
});
export type CatalogResult = z.infer<typeof catalogResultSchema>;
export const libraryEntrySchema = z.object({
  id: z.string(),
  mediaId: z.string(),
  mediaType: mediaTypeSchema,
  title: z.string(),
  description: z.string(),
  coverUrl: z.string().nullable(),
  coverAttribution: catalogResultSchema.shape.coverAttribution,
  releaseYear: z.number().nullable(),
  platforms: z.array(z.string()),
  genres: z.array(z.string()),
  status: statusSchema,
  rating: ratingSchema,
  favorite: z.boolean(),
  notes: z.string(),
  review: z.string(),
  reviewPublic: z.boolean(),
  recommendation: recommendationSchema.nullable().default(null),
  /** Catalog works have a public page; manual titles stay private. */
  publicWork: z.boolean().default(false),
  tags: z.array(z.string()),
  metadata: mediaMetadataSchema,
  progress: entryProgressSchema,
  startedOn: isoDateSchema.nullable(),
  completedOn: isoDateSchema.nullable(),
  boardRank: z.number(),
  updatedAt: z.string(),
  createdAt: z.string(),
  attribution: catalogResultSchema.shape.attribution,
});
export type LibraryEntry = z.infer<typeof libraryEntrySchema>;
export const libraryResponseSchema = z.object({
  items: z.array(libraryEntrySchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  pages: z.number(),
});
export type LibraryResponse = z.infer<typeof libraryResponseSchema>;
export const savedViewConfigSchema = z
  .object({
    version: z.literal(1),
    layout: z.enum(['list', 'gallery', 'board', 'calendar']),
    groupBy: z.enum(['status', 'none']).default('status'),
    density: densitySchema.default('comfortable'),
    columns: z
      .array(z.enum(['title', 'status', 'rating', 'progress', 'platforms', 'tags', 'updatedAt']))
      .min(1)
      .max(7)
      .refine((v) => new Set(v).size === v.length && v.includes('title')),
    filters: z
      .object({
        q: z.string().max(120).default(''),
        status: statusSchema.optional(),
        favorite: z.boolean().optional(),
      })
      .strict(),
    sort: libraryQuerySchema.shape.sort,
    order: libraryQuerySchema.shape.order,
  })
  .strict();
export type SavedViewConfig = z.infer<typeof savedViewConfigSchema>;
export const viewScopeSchema = z.union([mediaTypeSchema, z.enum(['library', 'favorites'])]);
export type ViewScope = z.infer<typeof viewScopeSchema>;
export const viewNameSchema = z.string().trim().min(1).max(40);
export const savedViewSchema = z.object({
  id: z.string(),
  scope: viewScopeSchema,
  name: z.string(),
  position: z.number(),
  config: savedViewConfigSchema,
});
export type SavedView = z.infer<typeof savedViewSchema>;
export const savedViewCreateSchema = z
  .object({ scope: viewScopeSchema, name: viewNameSchema, config: savedViewConfigSchema })
  .strict();
export const savedViewPatchSchema = z
  .object({
    name: viewNameSchema.optional(),
    config: savedViewConfigSchema.optional(),
    position: z.number().int().min(0).max(1000).optional(),
  })
  .strict();
export type SavedViewPatch = z.infer<typeof savedViewPatchSchema>;
export const layoutLabels: Record<SavedViewConfig['layout'], string> = {
  list: 'Lista',
  gallery: 'Galeria',
  board: 'Quadro',
  calendar: 'Calendário',
};
export const defaultViewConfig: SavedViewConfig = {
  version: 1,
  layout: 'list',
  groupBy: 'status',
  density: 'comfortable',
  columns: ['title', 'status', 'rating', 'progress', 'platforms', 'tags'],
  filters: { q: '' },
  sort: 'updatedAt',
  order: 'desc',
};

export const calendarQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
    mediaType: mediaTypeSchema.optional(),
    favorite: z.enum(['true', 'false']).optional(),
  })
  .strict()
  .refine((query) => {
    const days = (Date.parse(query.to) - Date.parse(query.from)) / 86400000;
    return days >= 0 && days <= 62;
  }, 'Consulte no máximo 62 dias por vez');
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
export const calendarEventKinds = ['started', 'completed', 'viewed'] as const;
export const calendarEventLabels: Record<(typeof calendarEventKinds)[number], string> = {
  started: 'Início',
  completed: 'Conclusão',
  viewed: 'Sessão',
};
export const calendarEventSchema = z.object({
  date: isoDateSchema,
  kind: z.enum(calendarEventKinds),
  entryId: z.string(),
  title: z.string(),
  mediaType: mediaTypeSchema,
  status: statusSchema,
  coverUrl: z.string().nullable(),
});
export type CalendarEvent = z.infer<typeof calendarEventSchema>;

export const collectionVisibilities = ['private', 'unlisted', 'public'] as const;
export const collectionVisibilitySchema = z.enum(collectionVisibilities);
export type CollectionVisibility = z.infer<typeof collectionVisibilitySchema>;
export const collectionVisibilityLabels: Record<CollectionVisibility, string> = {
  private: 'Privada',
  unlisted: 'Não listada',
  public: 'Pública',
};
const httpsImageSchema = z
  .string()
  .max(2000)
  .refine(
    (value) =>
      /^\/api\/media\/[a-z0-9]+$/.test(value) ||
      (URL.canParse(value) && value.startsWith('https://')),
    msg('Use uma imagem HTTPS'),
  );
const collectionFields = {
  name: z.string().trim().min(1, msg('Dê um nome à coleção')).max(80),
  description: z.string().trim().max(1000),
  visibility: collectionVisibilitySchema,
  ranked: z.boolean(),
  coverUrl: httpsImageSchema.nullable(),
};
export const collectionInputSchema = z
  .object({
    ...collectionFields,
    description: collectionFields.description.default(''),
    visibility: collectionFields.visibility.default('private'),
    ranked: collectionFields.ranked.default(false),
    coverUrl: collectionFields.coverUrl.default(null),
  })
  .strict();
export type CollectionInput = z.infer<typeof collectionInputSchema>;
export const collectionPatchSchema = z
  .object({
    name: collectionFields.name.optional(),
    description: collectionFields.description.optional(),
    visibility: collectionFields.visibility.optional(),
    ranked: collectionFields.ranked.optional(),
    coverUrl: collectionFields.coverUrl.optional(),
  })
  .strict();
export type CollectionPatch = z.infer<typeof collectionPatchSchema>;
export const collectionSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  visibility: collectionVisibilitySchema,
  ranked: z.boolean(),
  coverUrl: z.string().nullable(),
  itemCount: z.number(),
  covers: z.array(z.string()),
  updatedAt: z.string(),
  contains: z.boolean().optional(),
});
export type CollectionSummary = z.infer<typeof collectionSummarySchema>;
export const collectionItemSchema = z.object({
  position: z.number(),
  note: z.string(),
  entry: libraryEntrySchema,
});
export type CollectionItem = z.infer<typeof collectionItemSchema>;
export const collectionDetailSchema = collectionSummarySchema.extend({
  items: z.array(collectionItemSchema),
});
export type CollectionDetail = z.infer<typeof collectionDetailSchema>;
export const collectionItemCreateSchema = z
  .object({ entryId: z.string().min(1).max(100), note: z.string().trim().max(280).default('') })
  .strict();
export const collectionItemPatchSchema = z
  .object({
    position: z.number().finite().min(-1e9).max(1e9).optional(),
    note: z.string().trim().max(280).optional(),
  })
  .strict();
export type CollectionItemPatch = z.infer<typeof collectionItemPatchSchema>;

export const goalMetrics = [
  'titles_completed',
  'titles_started',
  'episodes_watched',
  'chapters_read',
  'pages_read',
  'hours_played',
  'movies_watched',
  'collection_completed',
] as const;
export const goalMetricSchema = z.enum(goalMetrics);
export type GoalMetric = z.infer<typeof goalMetricSchema>;
export const goalMetricLabels: Record<GoalMetric, string> = {
  titles_completed: 'Concluir títulos',
  titles_started: 'Começar títulos',
  episodes_watched: 'Assistir episódios',
  chapters_read: 'Ler capítulos',
  pages_read: 'Ler páginas',
  hours_played: 'Jogar horas',
  movies_watched: 'Assistir filmes',
  collection_completed: 'Concluir uma coleção',
};
export const goalUnits: Record<GoalMetric, [string, string]> = {
  titles_completed: ['título', 'títulos'],
  titles_started: ['título', 'títulos'],
  episodes_watched: ['episódio', 'episódios'],
  chapters_read: ['capítulo', 'capítulos'],
  pages_read: ['página', 'páginas'],
  hours_played: ['hora', 'horas'],
  movies_watched: ['sessão', 'sessões'],
  collection_completed: ['título', 'títulos'],
};
/** Categories each metric can be limited to; an empty list means it has no category. */
export const goalScopes: Record<GoalMetric, MediaType[]> = {
  titles_completed: [...mediaTypes],
  titles_started: [...mediaTypes],
  episodes_watched: ['anime', 'series'],
  chapters_read: ['manga'],
  pages_read: ['books'],
  hours_played: ['games'],
  movies_watched: ['movies'],
  collection_completed: [],
};
export const goalStates = ['active', 'achieved', 'expired', 'archived'] as const;
export type GoalState = (typeof goalStates)[number];
export const goalStateLabels: Record<GoalState, string> = {
  active: 'Em andamento',
  achieved: 'Concluída',
  expired: 'Encerrada',
  archived: 'Arquivada',
};
const goalFields = z.object({
  name: z.string().trim().min(1, msg('Dê um nome à meta')).max(80),
  description: z.string().trim().max(500).default(''),
  metric: goalMetricSchema,
  mediaType: mediaTypeSchema.nullable().default(null),
  collectionId: z.string().max(100).nullable().default(null),
  target: z.number().int().min(1).max(1000000),
  startsOn: isoDateSchema,
  endsOn: isoDateSchema.nullable().default(null),
});
const goalRules = (goal: {
  metric?: GoalMetric;
  mediaType?: MediaType | null;
  collectionId?: string | null;
  startsOn?: string;
  endsOn?: string | null;
}) =>
  (!goal.metric ||
    ((goal.metric === 'collection_completed') === Boolean(goal.collectionId) &&
      (!goal.mediaType || goalScopes[goal.metric].includes(goal.mediaType)))) &&
  (!goal.startsOn || !goal.endsOn || goal.endsOn >= goal.startsOn);
export const goalInputSchema = goalFields
  .strict()
  .refine(goalRules, msg('Revise a categoria, a coleção e o período da meta'));
export type GoalInput = z.infer<typeof goalInputSchema>;
export const goalPatchSchema = goalFields
  .partial()
  .extend({ archived: z.boolean().optional() })
  .strict()
  .refine(goalRules, msg('Revise a categoria, a coleção e o período da meta'));
export type GoalPatch = z.infer<typeof goalPatchSchema>;
export const goalSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  metric: goalMetricSchema,
  mediaType: mediaTypeSchema.nullable(),
  collectionId: z.string().nullable(),
  collectionName: z.string().nullable(),
  target: z.number(),
  current: z.number(),
  startsOn: isoDateSchema,
  endsOn: isoDateSchema.nullable(),
  state: z.enum(goalStates),
  createdAt: z.string(),
});
export type Goal = z.infer<typeof goalSchema>;

export const missionPeriods = ['daily', 'weekly', 'monthly'] as const;
export type MissionPeriod = (typeof missionPeriods)[number];
export const missionPeriodLabels: Record<MissionPeriod, string> = {
  daily: 'Diárias',
  weekly: 'Semanais',
  monthly: 'Mensais',
};
export const missionSchema = z.object({
  key: z.string(),
  period: z.enum(missionPeriods),
  label: z.string(),
  progress: z.number(),
  target: z.number(),
  xp: z.number(),
  completed: z.boolean(),
  endsAt: z.string(),
});
export type Mission = z.infer<typeof missionSchema>;
export const badgeSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  icon: z.string(),
  unlockedAt: z.string().nullable(),
  progress: z.number(),
  target: z.number(),
});
export type Badge = z.infer<typeof badgeSchema>;
export const profileTitleSchema = z.object({
  key: z.string(),
  label: z.string(),
  requirement: z.string(),
  unlocked: z.boolean(),
});
export type ProfileTitle = z.infer<typeof profileTitleSchema>;
export const progressionSchema = z.object({
  level: z.number(),
  xp: z.number(),
  levelXp: z.number(),
  nextLevelXp: z.number(),
  streak: z.object({
    current: z.number(),
    best: z.number(),
    today: z.boolean(),
    days: z.array(isoDateSchema),
  }),
  missions: z.array(missionSchema),
  badges: z.array(badgeSchema),
  titles: z.array(profileTitleSchema),
  activeTitle: z.string().nullable(),
  unlocked: z.array(z.string()),
  timezone: z.string(),
});
export type Progression = z.infer<typeof progressionSchema>;
export const activeTitleSchema = z.object({ title: z.string().max(40).nullable() }).strict();

/** Total experience required to reach a level: 100, 300, 600, 1000… */
export const xpForLevel = (level: number) => 50 * level * (level - 1);
export function levelForXp(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  return level;
}

export const statisticsSchema = z.object({
  totals: z.object({
    entries: z.number(),
    completed: z.number(),
    favorites: z.number(),
    averageRating: z.number().nullable(),
    hoursPlayed: z.number(),
    episodesWatched: z.number(),
    chaptersRead: z.number(),
    pagesRead: z.number(),
    timesWatched: z.number(),
  }),
  byStatus: z.array(z.object({ status: statusSchema, count: z.number() })),
  byCategory: z.array(
    z.object({ mediaType: mediaTypeSchema, total: z.number(), completed: z.number() }),
  ),
  ratings: z.array(z.object({ rating: z.number(), count: z.number() })),
  completionsByMonth: z.array(z.object({ month: z.string(), count: z.number() })),
  activity: z.array(z.object({ day: isoDateSchema, count: z.number() })),
});
export type Statistics = z.infer<typeof statisticsSchema>;

const publicWorkSchema = z.object({
  /** Public page of the work, when it comes from the shared catalog. */
  workId: z.string().nullable().default(null),
  title: z.string(),
  mediaType: mediaTypeSchema,
  coverUrl: z.string().nullable(),
  releaseYear: z.number().nullable(),
  rating: ratingSchema,
});
export type PublicWork = z.infer<typeof publicWorkSchema>;
export const publicCollectionSummarySchema = collectionSummarySchema
  .omit({ id: true, visibility: true, contains: true })
  .extend({ itemCount: z.number() });
export const publicProfileSchema = z.object({
  username: z.string(),
  displayName: z.string(),
  bio: z.string(),
  avatarUrl: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  title: z.string().nullable(),
  memberSince: z.string(),
  links: z.array(profileLinkSchema),
  statistics: z
    .object({
      entries: z.number(),
      completed: z.number(),
      averageRating: z.number().nullable(),
      byCategory: z.array(z.object({ mediaType: mediaTypeSchema, total: z.number() })),
      categories: z
        .array(
          z.object({
            mediaType: mediaTypeSchema,
            total: z.number(),
            favorites: z.number(),
            averageRating: z.number().nullable(),
            statuses: z.record(statusSchema, z.number()),
            units: z.array(z.object({ label: z.string(), value: z.number() })),
          }),
        )
        .default([]),
    })
    .nullable(),
  favorites: z.array(publicWorkSchema).nullable(),
  collections: z.array(publicCollectionSummarySchema),
  reviews: z
    .array(publicWorkSchema.extend({ review: z.string(), updatedAt: z.string() }))
    .nullable(),
  history: z
    .array(
      publicWorkSchema.extend({
        status: statusSchema,
        updatedAt: z.string(),
        progressLabel: z.string().nullable().default(null),
        progressPercent: z.number().nullable().default(null),
      }),
    )
    .nullable(),
  goals: z
    .array(
      z.object({
        name: z.string(),
        metric: goalMetricSchema,
        current: z.number(),
        target: z.number(),
        state: z.enum(goalStates),
      }),
    )
    .nullable(),
});
export type PublicProfile = z.infer<typeof publicProfileSchema>;
export const publicCollectionSchema = publicCollectionSummarySchema.extend({
  ranked: z.boolean(),
  unlisted: z.boolean(),
  owner: z.object({
    username: z.string(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  items: z.array(publicWorkSchema.extend({ note: z.string() })),
});
export type PublicCollection = z.infer<typeof publicCollectionSchema>;
export const sitemapSchema = z.object({
  profiles: z.array(z.object({ username: z.string(), updatedAt: z.string() })),
  collections: z.array(z.object({ username: z.string(), slug: z.string(), updatedAt: z.string() })),
});

// Public work pages, community ratings, reviews and rankings.
const personSchema = z.object({ name: z.string(), image: z.string().nullable() });
/** Rich information gathered from free catalogs for a public work page. */
export const workDetailSchema = z.object({
  synopsis: z.string(),
  facts: z.array(z.object({ label: z.string(), value: z.string() })),
  genres: z.array(z.string()),
  characters: z.array(
    personSchema.extend({
      role: z.string(),
      voice: personSchema.extend({ language: z.string() }).nullable(),
    }),
  ),
  staff: z.array(personSchema.extend({ role: z.string() })),
  externalScore: z.object({ value: z.number(), max: z.number(), source: z.string() }).nullable(),
  links: z.array(z.object({ label: z.string(), url: z.url() })),
  source: z
    .object({ label: z.string(), url: z.string().nullable(), license: z.string() })
    .nullable(),
});
export type WorkDetail = z.infer<typeof workDetailSchema>;

export const workCommunitySchema = z.object({
  average: z.number().nullable(),
  ratings: z.number(),
  members: z.number(),
  favorites: z.number(),
  rank: z.number().nullable(),
  popularity: z.number().nullable(),
  statuses: z.record(statusSchema, z.number()),
});
export type WorkCommunity = z.infer<typeof workCommunitySchema>;

export const workReviewSchema = z.object({
  id: z.string(),
  author: z.object({
    username: z.string(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  rating: z.number().nullable(),
  recommendation: recommendationSchema.nullable(),
  status: statusSchema,
  text: z.string(),
  updatedAt: z.string(),
});
export type WorkReview = z.infer<typeof workReviewSchema>;

export const publicWorkPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  mediaType: mediaTypeSchema,
  releaseYear: z.number().nullable(),
  coverUrl: z.string().nullable(),
  coverAttribution: coverAttributionSchema.nullable(),
  description: z.string(),
  attribution: z.object({ label: z.string(), url: z.string().nullable(), license: z.string() }),
  detail: workDetailSchema,
  community: workCommunitySchema,
  reviews: z.array(workReviewSchema),
  reviewCounts: z.record(recommendationSchema, z.number()),
});
export type PublicWorkPage = z.infer<typeof publicWorkPageSchema>;

export const rankingSortSchema = z.enum(['score', 'popular']);
export const rankingQuerySchema = z
  .object({
    mediaType: mediaTypeSchema.optional(),
    sort: rankingSortSchema.default('score'),
    page: z.coerce.number().int().min(1).max(1000).default(1),
  })
  .strict();
export type RankingQuery = z.infer<typeof rankingQuerySchema>;
export const rankingItemSchema = z.object({
  rank: z.number(),
  id: z.string(),
  title: z.string(),
  mediaType: mediaTypeSchema,
  releaseYear: z.number().nullable(),
  coverUrl: z.string().nullable(),
  average: z.number().nullable(),
  ratings: z.number(),
  members: z.number(),
});
export type RankingItem = z.infer<typeof rankingItemSchema>;
export const rankingResponseSchema = z.object({
  items: z.array(rankingItemSchema),
  page: z.number(),
  hasMore: z.boolean(),
});
export type RankingResponse = z.infer<typeof rankingResponseSchema>;

/* Community: friends, direct messages and clubs. */
export const communityUserSchema = z.object({
  id: z.string(),
  username: z.string().nullable(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  isPublic: z.boolean(),
});
export type CommunityUser = z.infer<typeof communityUserSchema>;
export const relationshipStates = [
  'self',
  'none',
  'outgoing',
  'incoming',
  'friends',
  'blocked',
] as const;
export const relationshipSchema = z.object({
  state: z.enum(relationshipStates),
  requestId: z.string().nullable(),
  user: communityUserSchema,
});
export type Relationship = z.infer<typeof relationshipSchema>;
export const friendRequestInputSchema = z
  .object({ username: z.string().trim().toLowerCase().min(1).max(40) })
  .strict();
export type FriendRequestInput = z.infer<typeof friendRequestInputSchema>;
export const friendSchema = communityUserSchema.extend({ since: z.string() });
export type Friend = z.infer<typeof friendSchema>;
export const friendRequestSchema = z.object({
  id: z.string(),
  direction: z.enum(['incoming', 'outgoing']),
  user: communityUserSchema,
  createdAt: z.string(),
});
export type FriendRequest = z.infer<typeof friendRequestSchema>;
export const friendsOverviewSchema = z.object({
  friends: z.array(friendSchema),
  requests: z.array(friendRequestSchema),
});
export type FriendsOverview = z.infer<typeof friendsOverviewSchema>;
export const userSearchQuerySchema = z.object({ q: z.string().trim().min(2).max(40) });
export const messageInputSchema = z.object({ body: z.string().trim().min(1).max(2000) }).strict();
export type MessageInput = z.infer<typeof messageInputSchema>;
export const directMessageSchema = z.object({
  id: z.string(),
  body: z.string(),
  mine: z.boolean(),
  createdAt: z.string(),
  readAt: z.string().nullable(),
});
export type DirectMessage = z.infer<typeof directMessageSchema>;
export const conversationSummarySchema = z.object({
  user: communityUserSchema,
  lastMessage: directMessageSchema,
  unread: z.number(),
});
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;
export const conversationSchema = z.object({
  user: communityUserSchema,
  canMessage: z.boolean(),
  messages: z.array(directMessageSchema),
  hasMore: z.boolean(),
});
export type Conversation = z.infer<typeof conversationSchema>;
export const communitySummarySchema = z.object({
  pendingRequests: z.number(),
  unreadMessages: z.number(),
});
export type CommunitySummary = z.infer<typeof communitySummarySchema>;
export const friendActivitySchema = publicWorkSchema.extend({
  user: communityUserSchema,
  status: statusSchema,
  updatedAt: z.string(),
  progressLabel: z.string().nullable(),
  progressPercent: z.number().nullable(),
});
export type FriendActivity = z.infer<typeof friendActivitySchema>;
export const clubRoles = ['owner', 'member'] as const;
export const clubInputSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    description: z.string().trim().max(500).default(''),
    mediaType: mediaTypeSchema.nullable().default(null),
  })
  .strict();
export type ClubInput = z.input<typeof clubInputSchema>;
export const clubPatchSchema = clubInputSchema.partial().strict();
export type ClubPatch = z.input<typeof clubPatchSchema>;
export const clubSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  mediaType: mediaTypeSchema.nullable(),
  owner: communityUserSchema,
  memberCount: z.number(),
  postCount: z.number(),
  role: z.enum(clubRoles).nullable(),
  createdAt: z.string(),
  lastActivityAt: z.string(),
});
export type Club = z.infer<typeof clubSchema>;
export const clubQuerySchema = z
  .object({
    q: z.string().trim().max(60).optional(),
    mine: z.enum(['true', 'false']).optional(),
  })
  .strict();
export const clubPostSchema = z.object({
  id: z.string(),
  body: z.string(),
  author: communityUserSchema,
  createdAt: z.string(),
  canDelete: z.boolean(),
});
export type ClubPost = z.infer<typeof clubPostSchema>;
export const clubDetailSchema = clubSchema.extend({
  members: z.array(communityUserSchema.extend({ role: z.enum(clubRoles) })),
  posts: z.array(clubPostSchema),
  hasMore: z.boolean(),
});
export type ClubDetail = z.infer<typeof clubDetailSchema>;

/** A signed-in browser or device, listed so the account owner can end it. */
export const accountSessionSchema = z.object({
  id: z.string(),
  device: z.string(),
  browser: z.string(),
  system: z.string(),
  createdAt: z.string(),
  lastSeenAt: z.string(),
  expiresAt: z.string(),
  current: z.boolean(),
});
export type AccountSession = z.infer<typeof accountSessionSchema>;

/* Safety: blocks, reports and moderation. */
export const reportTargets = ['user', 'message', 'club', 'club_post', 'review'] as const;
export const reportReasons = ['spam', 'harassment', 'hate', 'sexual', 'violence', 'other'] as const;
export const reportReasonLabels: Record<(typeof reportReasons)[number], string> = {
  spam: 'Spam ou propaganda',
  harassment: 'Assédio ou intimidação',
  hate: 'Discurso de ódio',
  sexual: 'Conteúdo sexual',
  violence: 'Violência ou ameaça',
  other: 'Outro motivo',
};
export const reportInputSchema = z
  .object({
    targetType: z.enum(reportTargets),
    targetId: z.string().min(1).max(60),
    reason: z.enum(reportReasons),
    details: z.string().trim().max(1000).default(''),
  })
  .strict();
export type ReportInput = z.input<typeof reportInputSchema>;
export const blockedUserSchema = communityUserSchema.extend({ since: z.string() });
export type BlockedUser = z.infer<typeof blockedUserSchema>;
export const reportStatuses = ['open', 'resolved', 'dismissed'] as const;
export const moderationActions = ['dismiss', 'remove_content', 'suspend_user'] as const;
export const moderationActionLabels: Record<(typeof moderationActions)[number], string> = {
  dismiss: 'Arquivar sem ação',
  remove_content: 'Remover o conteúdo',
  suspend_user: 'Suspender a conta',
};
export const reportResolutionSchema = z
  .object({ action: z.enum(moderationActions), note: z.string().trim().max(500).default('') })
  .strict();
export type ReportResolution = z.input<typeof reportResolutionSchema>;
export const moderationUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string().nullable(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  role: z.enum(['user', 'admin']),
  createdAt: z.string(),
  emailVerified: z.boolean(),
  mfaEnabled: z.boolean(),
  suspendedAt: z.string().nullable(),
  suspensionReason: z.string().nullable(),
  reports: z.number(),
});
export type ModerationUser = z.infer<typeof moderationUserSchema>;
export const moderationReportSchema = z.object({
  id: z.string(),
  targetType: z.enum(reportTargets),
  targetId: z.string(),
  reason: z.enum(reportReasons),
  details: z.string(),
  snapshot: z.string(),
  status: z.enum(reportStatuses),
  resolution: z.string().nullable(),
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
  reporter: communityUserSchema.nullable(),
  targetUser: moderationUserSchema.nullable(),
  contentAvailable: z.boolean(),
});
export type ModerationReport = z.infer<typeof moderationReportSchema>;
export const moderationLogSchema = z.object({
  id: z.string(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  note: z.string(),
  createdAt: z.string(),
  moderator: communityUserSchema.nullable(),
});
export type ModerationLogEntry = z.infer<typeof moderationLogSchema>;
export const moderationSummarySchema = z.object({
  openReports: z.number(),
  suspendedUsers: z.number(),
  users: z.number(),
  admins: z.number(),
});
export type ModerationSummary = z.infer<typeof moderationSummarySchema>;
export const suspensionInputSchema = z
  .object({ reason: z.string().trim().min(3).max(500) })
  .strict();
export const roleInputSchema = z.object({ role: z.enum(['user', 'admin']) }).strict();
