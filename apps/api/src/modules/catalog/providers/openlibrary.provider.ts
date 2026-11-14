import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { emptyMetadata, type CatalogResult, type MediaType } from '@jinsei/contracts';
import { type CatalogProvider, ProviderCache, providerFetch } from './catalog-provider';

const workSchema = z.object({
  key: z.string(),
  title: z.string(),
  covers: z.array(z.number()).default([]),
  subjects: z.array(z.string()).default([]),
  first_publish_date: z.string().optional(),
  description: z.union([z.string(), z.object({ value: z.string() })]).optional(),
});
@Injectable()
export class OpenlibraryProvider implements CatalogProvider {
  readonly id = 'openlibrary' as const;
  readonly enabled = true;
  private readonly cache = new ProviderCache();
  private normalize(work: z.infer<typeof workSchema>, year?: number): CatalogResult {
    const externalId = work.key.split('/').at(-1)!;
    const sourceUrl = `https://openlibrary.org/works/${externalId}`;
    const cover = work.covers.find((id) => id > 0);
    return {
      provider: this.id,
      externalId,
      mediaType: 'manga',
      title: work.title,
      description:
        typeof work.description === 'string' ? work.description : (work.description?.value ?? ''),
      releaseYear: year ?? (Number(work.first_publish_date?.match(/\d{4}/)?.[0]) || null),
      coverUrl: cover ? `https://covers.openlibrary.org/b/id/${cover}-L.jpg?default=false` : null,
      coverAttribution: cover
        ? {
            provider: 'Open Library',
            sourceUrl,
            license: 'Exibição pela Covers API; direitos dos respectivos titulares',
            licenseUrl: 'https://openlibrary.org/dev/docs/api/covers',
            artist: null,
          }
        : null,
      platforms: [],
      developers: [],
      genres: work.subjects.slice(0, 8),
      metadata: emptyMetadata('manga'),
      attribution: {
        label: 'Open Library',
        url: sourceUrl,
        license: 'Metadados Open Library; capas sob direitos próprios',
      },
    };
  }
  async search(query: string, mediaType: MediaType = 'manga') {
    if (mediaType !== 'manga') return [];
    return this.cache.get(`search:${query}`, async () => {
      const url = new URL('https://openlibrary.org/search.json');
      url.search = new URLSearchParams({
        q: `${query} subject:manga`,
        limit: '10',
        fields: 'key,title,cover_i,first_publish_year,author_name',
      }).toString();
      const docs = z
        .object({
          docs: z.array(
            z.object({
              key: z.string().regex(/^\/works\/OL\d+W$/),
              title: z.string(),
              cover_i: z.number().optional(),
              first_publish_year: z.number().optional(),
              author_name: z.array(z.string()).default([]),
            }),
          ),
        })
        .parse(await providerFetch(url));
      return docs.docs.map((work) =>
        this.normalize(
          {
            key: work.key,
            title: work.title,
            covers: work.cover_i ? [work.cover_i] : [],
            subjects: [],
            description: work.author_name.join(', '),
          },
          work.first_publish_year,
        ),
      );
    });
  }
  async details(externalId: string) {
    if (!/^OL\d+W$/.test(externalId)) throw new Error('Invalid Open Library identifier');
    const result = await this.cache.get(`details:${externalId}`, async () => {
      const work = workSchema.parse(
        await providerFetch(`https://openlibrary.org/works/${externalId}.json`),
      );
      if (!work.subjects.some((subject) => /manga|comic|graphic novel/i.test(subject)))
        throw new Error('Unsupported work');
      return [this.normalize(work)];
    });
    return result[0];
  }
}
