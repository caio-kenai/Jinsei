import { Injectable } from '@nestjs/common';
import type { CatalogResult } from '@jinsei/contracts';
import { z } from 'zod';
import { type CatalogProvider, ProviderCache, providerFetch } from './catalog-provider';

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
const label = (entity: Entity) =>
  entity.labels.pt?.value ?? entity.labels.en?.value ?? entity.labels.mul?.value ?? entity.id;

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

  async search(query: string) {
    return this.cache.get(`search:${query.toLowerCase()}`, async () => {
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
          (item) => ids(item, 'P31').includes('Q7889') || ids(item, 'P400').length > 0,
        ),
      );
    });
  }
  async details(externalId: string) {
    if (!/^Q\d+$/.test(externalId)) throw new Error('Invalid Wikidata identifier');
    const results = await this.cache.get(`details:${externalId}`, async () => {
      const entity = (await this.entities([externalId]))[externalId];
      if (!entity || (!ids(entity, 'P31').includes('Q7889') && !ids(entity, 'P400').length))
        throw new Error('Not a video game');
      return this.normalize([entity]);
    });
    if (!results[0]) throw new Error('Title unavailable');
    return results[0];
  }
  private async normalize(entities: Entity[]): Promise<CatalogResult[]> {
    const referenced = [
      ...new Set(
        entities.flatMap((entity) =>
          ['P400', 'P136', 'P178'].flatMap((property) => ids(entity, property)),
        ),
      ),
    ].slice(0, 50);
    const labels = await this.entities(referenced);
    const named = (entity: Entity, property: string) =>
      ids(entity, property).flatMap((id) => (labels[id] ? [label(labels[id])] : []));
    return entities.map((entity) => {
      const date = z.object({ time: z.string() }).safeParse(values(entity, 'P577')[0]);
      const year = date.success ? Number(date.data.time.match(/^\+(\d{4})/)?.[1]) : null;
      return {
        externalId: entity.id,
        provider: 'wikidata',
        mediaType: 'games',
        title: label(entity),
        description: entity.descriptions.pt?.value ?? entity.descriptions.en?.value ?? '',
        releaseYear: year && year <= 2100 ? year : null,
        coverUrl: null,
        platforms: named(entity, 'P400'),
        genres: named(entity, 'P136'),
        developers: named(entity, 'P178'),
        attribution: {
          label: 'Wikidata',
          url: `https://www.wikidata.org/wiki/${entity.id}`,
          license: 'CC0-1.0 (metadados; imagens excluídas)',
        },
      };
    });
  }
}
