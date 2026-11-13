import { z } from 'zod';

export const healthSchema = z.object({ status: z.literal('ok'), service: z.literal('jinsei-api') });

export const mediaTypes = ['games', 'anime', 'manga', 'movies', 'series'] as const;
export const mediaTypeSchema = z.enum(mediaTypes);
export type MediaType = z.infer<typeof mediaTypeSchema>;
export const categoryLabels: Record<MediaType, string> = {
  games: 'Jogos',
  anime: 'Animes',
  manga: 'Mangás',
  movies: 'Filmes',
  series: 'Séries',
};
export const themeSchema = z.enum(['light', 'dark', 'system']);
export const accentSchema = z.enum(['rose', 'violet', 'blue', 'emerald']);
export const densitySchema = z.enum(['compact', 'comfortable']);
export const emailSchema = z.email('Informe um e-mail válido').max(254).trim().toLowerCase();
export const passwordSchema = z.string().min(12, 'Use pelo menos 12 caracteres').max(128);
export const credentialsSchema = z
  .object({ email: emailSchema, password: passwordSchema })
  .strict();
export type Credentials = z.infer<typeof credentialsSchema>;
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
      .max(5)
      .refine((v) => new Set(v).size === v.length),
    theme: themeSchema,
    accent: accentSchema.default('rose'),
  })
  .strict();
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export const preferencesPatchSchema = onboardingSchema
  .partial()
  .extend({
    bio: z.string().trim().max(500).optional(),
    isPublic: z.boolean().optional(),
    sidebarCollapsed: z.boolean().optional(),
    density: densitySchema.optional(),
  })
  .strict();
export type PreferencesPatch = z.infer<typeof preferencesPatchSchema>;
export const currentUserSchema = z.object({
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
export const passwordChangeSchema = z
  .object({ currentPassword: z.string().max(128), newPassword: passwordSchema })
  .strict();
export const accountDeleteSchema = z.object({ password: z.string().max(128) }).strict();
