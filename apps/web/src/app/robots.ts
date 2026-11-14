import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/server-api';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await siteUrl();
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/u/', '/privacy', '/terms'],
      // The private application never needs to be crawled.
      disallow: [
        '/api/',
        '/home',
        '/library',
        '/favorites',
        '/collections',
        '/goals',
        '/journey',
        '/statistics',
        '/discover',
        '/settings',
        '/profile',
        '/onboarding',
      ],
    },
    sitemap: new URL('/sitemap.xml', origin).toString(),
  };
}
