import { z } from 'zod';
import {
  entryProgressSchema,
  isoDateSchema,
  mediaMetadataSchema,
  progressInputSchema,
} from './progress';
export * from './progress';
export const appVersion = '0.0.1';

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
export const densitySchema = z.enum(['compact', 'comfortable']);
export const emailSchema = z.email('Informe um e-mail válido').max(254).trim().toLowerCase();
export const passwordSchema = z.string().min(12, 'Use pelo menos 12 caracteres').max(128);
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
  .regex(/^[a-z0-9][a-z0-9_-]+$/, 'Use letras minúsculas, números, _ ou -');
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
  })
  .strict();
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export const preferencesPatchSchema = onboardingSchema
  .partial()
  .extend({
    accent: accentSchema.optional(),
    bio: z.string().trim().max(500).optional(),
    isPublic: z.boolean().optional(),
    sidebarCollapsed: z.boolean().optional(),
    density: densitySchema.optional(),
  })
  .strict();
export type PreferencesPatch = z.infer<typeof preferencesPatchSchema>;
export const currentUserSchema = z.object({
  isAdmin: z.boolean().default(false),
  id: z.string(),
  email: z.string(),
  createdAt: z.string(),
  profile: z.object({
    displayName: z.string(),
    username: z.string().nullable(),
    bio: z.string(),
    isPublic: z.boolean(),
  }),
  preferences: z.object({
    theme: themeSchema,
    accent: accentSchema,
    density: densitySchema,
    sidebarCollapsed: z.boolean(),
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
    supportEnabled: z.boolean(),
  })
  .strict();
export type InstanceSettings = z.infer<typeof instanceSettingsSchema>;
export const publicInstanceSchema = instanceSettingsSchema.extend({
  version: z.string(),
  publicUrl: z.url(),
});
export type PublicInstance = z.infer<typeof publicInstanceSchema>;
export const passwordChangeSchema = z
  .object({ currentPassword: z.string().max(128), newPassword: passwordSchema })
  .strict();
export const accountDeleteSchema = z.object({ password: z.string().max(128) }).strict();

export const statusKeys = ['planned', 'in_progress', 'paused', 'completed', 'dropped'] as const;
export const statusSchema = z.enum(statusKeys);
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
      .refine((value) => value.startsWith('https://'), 'Use uma imagem HTTPS')
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
