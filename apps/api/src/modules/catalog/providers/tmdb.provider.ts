import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { CatalogResult, MediaType } from '@jinsei/contracts';
import { env } from '../../../config/env';
import { type CatalogProvider, ProviderCache, providerFetch } from './catalog-provider';

const titleSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  name: z.string().optional(),
  overview: z.string().default(''),
  release_date: z.string().optional(),
  first_air_date: z.string().optional(),
  poster_path: z.string().nullable().optional(),
});
@Injectable()
export class TmdbProvider implements CatalogProvider {
  readonly id = 'tmdb' as const;
  readonly enabled = Boolean(env.TMDB_READ_TOKEN);
  private readonly cache = new ProviderCache();
  private imageBase?: string;
  private async request(path: string, query: Record<string, string> = {}) {
    if (!this.enabled) throw new Error('TMDB not configured');
    const url = new URL(`https://api.themoviedb.org/3/${path}`);
    url.search = new URLSearchParams({ language: 'pt-BR', ...query }).toString();
    return providerFetch(url, { headers: { Authorization: `Bearer ${env.TMDB_READ_TOKEN}` } });
  }
  private async normalize(
    item: z.infer<typeof titleSchema>,
    kind: 'movie' | 'tv',
  ): Promise<CatalogResult> {
    if (!this.imageBase) {
      const config = z
        .object({
          images: z.object({ secure_base_url: z.url(), poster_sizes: z.array(z.string()) }),
        })
        .parse(await this.request('configuration'));
      if (
        new URL(config.images.secure_base_url).hostname !== 'image.tmdb.org' ||
        !config.images.poster_sizes.includes('w500')
      )
        throw new Error('Unexpected image configuration');
      this.imageBase = `${config.images.secure_base_url}w500`;
    }
    const sourceUrl = `https://www.themoviedb.org/${kind}/${item.id}`;
    const coverUrl =
      item.poster_path && /^\/[a-zA-Z0-9]+\.(?:jpg|png)$/.test(item.poster_path)
        ? `${this.imageBase}${item.poster_path}`
        : null;
    const date = item.release_date ?? item.first_air_date;
    return {
      provider: this.id,
      externalId: `${kind}:${item.id}`,
      mediaType: kind === 'movie' ? 'movies' : 'series',
      title: item.title ?? item.name ?? 'Sem título',
      description: item.overview,
      releaseYear: date ? Number(date.slice(0, 4)) : null,
      coverUrl,
      coverAttribution: coverUrl
        ? {
            provider: 'TMDB',
            sourceUrl,
            license: 'Imagem TMDB; direitos dos respectivos titulares',
            licenseUrl: 'https://www.themoviedb.org/terms-of-use',
            artist: null,
          }
        : null,
      platforms: [],
      developers: [],
      genres: [],
      attribution: {
        label: 'TMDB',
        url: sourceUrl,
        license: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
      },
    };
  }
  async search(query: string, mediaType: MediaType = 'movies') {
    if (!this.enabled || !['movies', 'series'].includes(mediaType)) return [];
    const kind = mediaType === 'movies' ? 'movie' : 'tv';
    return this.cache.get(`search:${kind}:${query}`, async () => {
      const result = z
        .object({ results: z.array(titleSchema) })
        .parse(await this.request(`search/${kind}`, { query, include_adult: 'false' }));
      return Promise.all(result.results.slice(0, 10).map((item) => this.normalize(item, kind)));
    });
  }
  async details(externalId: string) {
    const match = /^(movie|tv):(\d+)$/.exec(externalId);
    if (!match) throw new Error('Invalid TMDB identifier');
    const result = await this.cache.get(`details:${externalId}`, async () => [
      await this.normalize(
        titleSchema.parse(await this.request(`${match[1]}/${match[2]}`)),
        match[1] as 'movie' | 'tv',
      ),
    ]);
    return result[0];
  }
}
