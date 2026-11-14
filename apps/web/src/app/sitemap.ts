import type { MetadataRoute } from 'next';
import { serverApi, siteUrl } from '@/lib/server-api';

type Sitemap = {
  profiles: { username: string; updatedAt: string }[];
  collections: { username: string; slug: string; updatedAt: string }[];
};

export const revalidate = 3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [origin, data, works] = await Promise.all([
    siteUrl(),
    serverApi<Sitemap>('/profiles/sitemap'),
    serverApi<{ id: string; updatedAt: string }[]>('/works/sitemap'),
  ]);
  const url = (path: string) => new URL(path, origin).toString();
  return [
    { url: url('/'), changeFrequency: 'weekly', priority: 1 },
    { url: url('/privacy'), changeFrequency: 'yearly', priority: 0.2 },
    { url: url('/terms'), changeFrequency: 'yearly', priority: 0.2 },
    { url: url('/rankings'), changeFrequency: 'daily', priority: 0.7 },
    ...(works ?? []).map((work) => ({
      url: url(`/obras/${work.id}`),
      lastModified: work.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...(data?.profiles ?? []).map((profile) => ({
      url: url(`/u/${profile.username}`),
      lastModified: profile.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...(data?.collections ?? []).map((collection) => ({
      url: url(`/u/${collection.username}/collections/${collection.slug}`),
      lastModified: collection.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
  ];
}
