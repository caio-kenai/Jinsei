import { z } from 'zod';
import type { CoverAttribution } from '@jinsei/contracts';

type Cover = { url: string; attribution: CoverAttribution };
const cache = new Map<string, { value: Cover | null; expiresAt: number }>();
let queue: Promise<unknown> = Promise.resolve();
let retryAt = 0;
// Query only a known Steam application ID supplied by Wikidata. No guessed asset URLs,
// catalog crawling, affiliate links or deal tracking are needed for cover enrichment.
export function cheapsharkCover(steamId: string): Promise<Cover | null> {
  if (!/^\d+$/.test(steamId)) return Promise.resolve(null);
  const cached = cache.get(steamId);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value);
  const operation = queue.then(async () => {
    const repeated = cache.get(steamId);
    if (repeated && repeated.expiresAt > Date.now()) return repeated.value;
    if (Date.now() < retryAt) return null;
    const response = await fetch(`https://www.cheapshark.com/api/1.0/games?steamAppID=${steamId}`, {
      headers: { 'User-Agent': 'Jinsei/0.1 (https://github.com/caio-kenai/Jinsei)' },
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 429) {
      const retry = response.headers.get('Retry-After');
      const seconds = Number(retry);
      retryAt =
        Date.now() +
        (Number.isFinite(seconds) && seconds > 0
          ? Math.min(seconds * 1000, 3600000)
          : Math.max(60000, Date.parse(retry ?? '') - Date.now() || 60000));
      return null;
    }
    if (!response.ok) return null;
    const games = z
      .array(
        z.object({
          gameID: z.string().regex(/^\d+$/),
          steamAppID: z.string().nullable(),
          thumb: z.url(),
        }),
      )
      .parse(await response.json());
    const game = games.find((item) => item.steamAppID === steamId);
    let value: Cover | null = null;
    if (game) {
      const url = new URL(game.thumb);
      if (
        url.protocol === 'https:' &&
        (url.hostname.endsWith('.steamstatic.com') ||
          url.hostname.endsWith('.steamcdn-a.akamaihd.net') ||
          url.hostname === 'www.cheapshark.com')
      )
        value = {
          url: url.href,
          attribution: {
            provider: 'CheapShark',
            sourceUrl: 'https://www.cheapshark.com',
            license: 'Exibição pela API CheapShark; arte dos respectivos titulares',
            licenseUrl: 'https://apidocs.cheapshark.com/',
            artist: null,
            layout: 'landscape',
          },
        };
    }
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(steamId, { value, expiresAt: Date.now() + 86400000 });
    await new Promise((resolve) => setTimeout(resolve, 350));
    return value;
  });
  queue = operation.catch(() => undefined);
  return operation.catch(() => null);
}
