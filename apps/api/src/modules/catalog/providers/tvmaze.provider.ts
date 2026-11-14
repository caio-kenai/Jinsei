import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { CatalogResult, MediaType, ReleaseStatus } from '@jinsei/contracts';
import { type CatalogProvider, ProviderCache, providerFetch, plainText } from './catalog-provider';

const showSchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.url(),
  type: z.string(),
  language: z.string().nullable(),
  genres: z.array(z.string()),
  premiered: z.string().nullable(),
  summary: z.string().nullable(),
  image: z.object({ medium: z.url(), original: z.url() }).nullable(),
  status: z.string().nullable().catch(null),
  _embedded: z
    .object({
      seasons: z
        .array(z.object({ number: z.number().nullable(), episodeOrder: z.number().nullable() }))
        .catch([]),
    })
    .optional()
    .catch(undefined),
});
type Show = z.infer<typeof showSchema>;
const releaseStatus = (status: string | null): ReleaseStatus =>
  status === 'Running'
    ? 'releasing'
    : status === 'Ended'
      ? 'finished'
      : status === 'In Development'
        ? 'upcoming'
        : 'unknown';
const isAnime = (show: Show) => show.type === 'Animation' && show.language === 'Japanese';
@Injectable()
export class TvmazeProvider implements CatalogProvider {
  readonly id = 'tvmaze' as const;
  readonly enabled = true;
  private readonly cache = new ProviderCache();
  private normalize(show: Show, mediaType: 'anime' | 'series'): CatalogResult {
    const seasons = (show._embedded?.seasons ?? []).flatMap((season) =>
      season.number === null ? [] : [{ number: season.number, episodes: season.episodeOrder }],
    );
    const known = seasons.filter((season) => season.episodes);
    const image = show.image?.medium;
    const coverUrl = image && new URL(image).hostname === 'static.tvmaze.com' ? image : null;
    return {
      provider: this.id,
      externalId: `${mediaType}:${show.id}`,
      mediaType,
      title: show.name,
      description: plainText(show.summary ?? ''),
      releaseYear: show.premiered ? Number(show.premiered.slice(0, 4)) : null,
      coverUrl,
      coverAttribution: coverUrl
        ? {
            provider: 'TVmaze',
            sourceUrl: show.url,
            license: 'Imagem exibida pelo serviço TVmaze; direitos dos respectivos titulares',
            licenseUrl: 'https://www.tvmaze.com/api#licensing',
            artist: null,
          }
        : null,
      platforms: [],
      developers: [],
      genres: show.genres,
      metadata: {
        kind: 'episodic',
        studios: [],
        totalEpisodes: known.length
          ? known.reduce((sum, season) => sum + (season.episodes ?? 0), 0)
          : null,
        totalSeasons: seasons.length || null,
        seasons,
        releaseStatus: releaseStatus(show.status),
      },
      attribution: { label: 'TVmaze', url: show.url, license: 'CC BY-SA 4.0 (metadados)' },
    };
  }
  async search(query: string, mediaType: MediaType = 'series') {
    if (mediaType !== 'series' && mediaType !== 'anime') return [];
    return this.cache.get(`${mediaType}:${query}`, async () => {
      const url = new URL('https://api.tvmaze.com/search/shows');
      url.searchParams.set('q', query);
      return z
        .array(z.object({ show: showSchema }))
        .parse(await providerFetch(url))
        .map(({ show }) => show)
        .filter((show) => (mediaType === 'anime' ? isAnime(show) : !isAnime(show)))
        .slice(0, 10)
        .map((show) => this.normalize(show, mediaType));
    });
  }
  async details(externalId: string) {
    const match = /^(anime|series):(\d+)$/.exec(externalId);
    if (!match) throw new Error('Invalid TVmaze identifier');
    const result = await this.cache.get(`details:${externalId}`, async () => {
      const show = showSchema.parse(
        await providerFetch(`https://api.tvmaze.com/shows/${match[2]}?embed=seasons`),
      );
      if ((match[1] === 'anime') !== isAnime(show)) throw new Error('Invalid category');
      return [this.normalize(show, match[1] as 'anime' | 'series')];
    });
    return result[0];
  }
}
