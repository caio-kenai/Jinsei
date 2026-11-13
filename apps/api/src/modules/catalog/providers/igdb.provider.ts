import { Injectable } from '@nestjs/common';
import type { CatalogResult } from '@jinsei/contracts';
import { z } from 'zod';
import { env } from '../../../config/env';
import { type CatalogProvider, ProviderCache, providerFetch } from './catalog-provider';

const gameSchema = z.object({
  id: z.number(),
  name: z.string(),
  summary: z.string().optional(),
  first_release_date: z.number().optional(),
  cover: z.object({ url: z.string() }).optional(),
  platforms: z.array(z.object({ name: z.string() })).default([]),
  genres: z.array(z.object({ name: z.string() })).default([]),
});

@Injectable()
export class IgdbProvider implements CatalogProvider {
  readonly id = 'igdb' as const;
  readonly enabled =
    env.IGDB_ENABLED === 'true' && Boolean(env.IGDB_CLIENT_ID && env.IGDB_CLIENT_SECRET);
  private token?: { value: string; expiresAt: number };
  private readonly cache = new ProviderCache();
  private async accessToken() {
    if (this.token && this.token.expiresAt > Date.now() + 60000) return this.token.value;
    const result = z.object({ access_token: z.string(), expires_in: z.number() }).parse(
      await providerFetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.IGDB_CLIENT_ID,
          client_secret: env.IGDB_CLIENT_SECRET,
          grant_type: 'client_credentials',
        }),
      }),
    );
    this.token = { value: result.access_token, expiresAt: Date.now() + result.expires_in * 1000 };
    return this.token.value;
  }
  private async query(body: string): Promise<CatalogResult[]> {
    if (!this.enabled) throw new Error('IGDB not configured');
    const games = z.array(gameSchema).parse(
      await providerFetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': env.IGDB_CLIENT_ID,
          Authorization: `Bearer ${await this.accessToken()}`,
          'Content-Type': 'text/plain',
        },
        body: `fields name,summary,first_release_date,cover.url,platforms.name,genres.name; ${body}`,
      }),
    );
    return games.map((game) => ({
      externalId: String(game.id),
      provider: 'igdb',
      mediaType: 'games',
      title: game.name,
      description: game.summary ?? '',
      releaseYear: game.first_release_date
        ? new Date(game.first_release_date * 1000).getUTCFullYear()
        : null,
      coverUrl: game.cover?.url.startsWith('//images.igdb.com/')
        ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}`
        : null,
      platforms: game.platforms.map((item) => item.name),
      genres: game.genres.map((item) => item.name),
      developers: [],
      attribution: {
        label: 'IGDB',
        url: 'https://www.igdb.com',
        license: 'Termos de uso IGDB/Twitch; habilitação depende de autorização',
      },
    }));
  }
  search(query: string) {
    return this.cache.get(`search:${query}`, () =>
      this.query(`search ${JSON.stringify(query)}; limit 10;`),
    );
  }
  async details(externalId: string) {
    if (!/^\d+$/.test(externalId)) throw new Error('Invalid IGDB identifier');
    const results = await this.cache.get(`details:${externalId}`, () =>
      this.query(`where id = ${externalId}; limit 1;`),
    );
    if (!results[0]) throw new Error('Title unavailable');
    return results[0];
  }
}
