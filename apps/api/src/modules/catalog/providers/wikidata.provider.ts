import { Injectable } from '@nestjs/common';
import type { CatalogResult, MediaMetadata, MediaType, ReleaseStatus } from '@jinsei/contracts';
import { z } from 'zod';
import { type CatalogProvider, ProviderCache, providerFetch } from './catalog-provider';
import { commonsCover } from './commons-cover';
import { cheapsharkCover } from './cheapshark-cover';

const entitySchema = z.object({
  id: z.string(),
  labels: z.record(z.string(), z.object({ value: z.string() })).default({}),
  descriptions: z.record(z.string(), z.object({ value: z.string() })).default({}),
  claims: z
    .record(
      z.string(),
      z.array(
        z.object({
          mainsnak: z.object({ datavalue: z.object({ value: z.unknown() }).optional() }),
        }),
      ),
    )
    .default({}),
});
type Entity = z.infer<typeof entitySchema>;
const values = (entity: Entity, property: string) =>
  (entity.claims[property] ?? []).map((claim) => claim.mainsnak.datavalue?.value);
const entityIdSchema = z.object({ id: z.string().regex(/^Q\d+$/) });
const ids = (entity: Entity, property: string) =>
  values(entity, property).flatMap((value) => {
    const parsed = entityIdSchema.safeParse(value);
    return parsed.success ? [parsed.data.id] : [];
  });
const quantitySchema = z.object({ amount: z.string(), unit: z.string() });
const quantity = (entity: Entity, property: string) => {
  const parsed = quantitySchema.safeParse(values(entity, property)[0]);
  const amount = parsed.success ? Number(parsed.data.amount) : NaN;
  return parsed.success && Number.isFinite(amount)
    ? { amount, unit: parsed.data.unit.split('/').at(-1) }
    : null;
};
const count = (entity: Entity, property: string) => {
  const value = quantity(entity, property)?.amount;
  return value && Number.isInteger(value) && value > 0 ? value : null;
};
// Durations use minute (Q7727), hour (Q25235) or second (Q11574) units.
const minutes = (entity: Entity) => {
  const value = quantity(entity, 'P2047');
  const factor = { Q7727: 1, Q25235: 60, Q11574: 1 / 60 }[value?.unit ?? ''];
  return value && factor ? Math.round(value.amount * factor) || null : null;
};
// An end time (P582) marks a work that is no longer being released.
const release = (entity: Entity): ReleaseStatus =>
  values(entity, 'P582').length ? 'finished' : 'unknown';
const label = (entity: Entity) =>
  entity.labels.pt?.value ?? entity.labels.en?.value ?? entity.labels.mul?.value ?? entity.id;
const category = (entity: Entity): MediaType | null => {
  const types = ids(entity, 'P31');
  const description = entity.descriptions.en?.value ?? '';
  if (types.includes('Q7889') || ids(entity, 'P400').length) return 'games';
  if (/anime.*(?:series|television)|(?:series|television).*anime/i.test(description))
    return 'anime';
  if (/manga (?:series|by)|Japanese manga/i.test(description)) return 'manga';
  if (types.includes('Q11424') || /\bfilm\b/i.test(description)) return 'movies';
  if (types.includes('Q5398426') || /television series/i.test(description)) return 'series';
  return null;
};

@Injectable()
export class WikidataProvider implements CatalogProvider {
  readonly id = 'wikidata' as const;
  readonly enabled = true;
  private readonly cache = new ProviderCache();

  private request(parameters: Record<string, string>) {
    const url = new URL('https://www.wikidata.org/w/api.php');
    url.search = new URLSearchParams({ ...parameters, format: 'json' }).toString();
    return providerFetch(url);
  }
  private async entities(entityIds: string[]) {
    if (!entityIds.length) return {};
    return z.object({ entities: z.record(z.string(), entitySchema) }).parse(
      await this.request({
        action: 'wbgetentities',
        ids: entityIds.join('|'),
        props: 'labels|descriptions|claims',
        languages: 'pt|en|mul',
      }),
    ).entities;
  }

  async search(query: string, mediaType: MediaType = 'games') {
    return this.cache.get(`search:${mediaType}:${query.toLowerCase()}`, async () => {
      const search = z
        .object({ search: z.array(z.object({ id: z.string().regex(/^Q\d+$/) })) })
        .parse(
          await this.request({
            action: 'wbsearchentities',
            search: query,
            language: 'en',
            uselang: 'pt',
            type: 'item',
            limit: '12',
          }),
        );
      return this.normalize(
        Object.values(await this.entities(search.search.map((item) => item.id))).filter(
          (item) => category(item) === mediaType,
        ),
      );
    });
  }
  async details(externalId: string) {
    if (!/^Q\d+$/.test(externalId)) throw new Error('Invalid Wikidata identifier');
    const results = await this.cache.get(`details:${externalId}`, async () => {
      const entity = (await this.entities([externalId]))[externalId];
      if (!entity || !category(entity)) throw new Error('Unsupported media');
      return this.normalize([entity]);
    });
    if (!results[0]) throw new Error('Title unavailable');
    return results[0];
  }
  private async normalize(entities: Entity[]): Promise<CatalogResult[]> {
    const referenced = [
      ...new Set(
        entities.flatMap((entity) =>
          ['P400', 'P136', 'P178', 'P123', 'P272', 'P50', 'P57'].flatMap((property) =>
            ids(entity, property),
          ),
        ),
      ),
    ].slice(0, 50);
    const labels = await this.entities(referenced);
    const named = (entity: Entity, property: string) =>
      ids(entity, property).flatMap((id) => (labels[id] ? [label(labels[id])] : []));
    const metadata = (entity: Entity, type: MediaType): MediaMetadata => {
      switch (type) {
        case 'games':
          return {
            kind: 'game',
            platforms: named(entity, 'P400'),
            developers: named(entity, 'P178'),
            publishers: named(entity, 'P123'),
          };
        case 'anime':
        case 'series':
          return {
            kind: 'episodic',
            studios: named(entity, 'P272'),
            totalEpisodes: count(entity, 'P1113'),
            totalSeasons: count(entity, 'P2437'),
            seasons: [],
            releaseStatus: release(entity),
          };
        case 'manga':
        case 'books':
          return {
            kind: 'reading',
            authors: named(entity, 'P50'),
            publishers: named(entity, 'P123'),
            totalChapters: null,
            totalVolumes: count(entity, 'P2635'),
            totalPages: count(entity, 'P1104'),
            releaseStatus: release(entity),
          };
        case 'movies':
          return { kind: 'film', directors: named(entity, 'P57'), runtimeMinutes: minutes(entity) };
      }
    };
    return Promise.all(
      entities.map(async (entity) => {
        const date = z.object({ time: z.string() }).safeParse(values(entity, 'P577')[0]);
        const year = date.success ? Number(date.data.time.match(/^\+(\d{4})/)?.[1]) : null;
        const poster = values(entity, 'P3383').find(
          (value): value is string => typeof value === 'string',
        );
        const filename =
          poster ??
          values(entity, 'P18').find((value): value is string => typeof value === 'string');
        let cover = filename
          ? await commonsCover(filename, Boolean(poster)).catch(() => null)
          : null;
        const steamId = values(entity, 'P1733').find(
          (value): value is string => typeof value === 'string',
        );
        if (!cover && steamId && category(entity) === 'games')
          cover = await cheapsharkCover(steamId);
        return {
          externalId: entity.id,
          provider: 'wikidata',
          mediaType: category(entity)!,
          title: label(entity),
          description: entity.descriptions.pt?.value ?? entity.descriptions.en?.value ?? '',
          releaseYear: year && year <= 2100 ? year : null,
          coverUrl: cover?.url ?? null,
          coverAttribution: cover?.attribution ?? null,
          platforms: named(entity, 'P400'),
          genres: named(entity, 'P136'),
          developers: named(entity, 'P178'),
          metadata: metadata(entity, category(entity)!),
          attribution: {
            label: 'Wikidata',
            url: `https://www.wikidata.org/wiki/${entity.id}`,
            license: 'CC0-1.0 (metadados; imagens excluídas)',
          },
        };
      }),
    );
  }
}
