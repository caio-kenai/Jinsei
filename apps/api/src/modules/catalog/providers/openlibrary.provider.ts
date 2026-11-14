import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { CatalogResult, MediaType } from '@jinsei/contracts';
import { type CatalogProvider, ProviderCache, providerFetch } from './catalog-provider';

const workSchema = z.object({
  key: z.string(),
  title: z.string(),
  covers: z.array(z.number()).default([]),
  subjects: z.array(z.string()).default([]),
  first_publish_date: z.string().optional(),
  description: z.union([z.string(), z.object({ value: z.string() })]).optional(),
  authors: z
    .array(z.object({ author: z.object({ key: z.string().regex(/^\/authors\/OL\d+A$/) }) }))
    .catch([]),
});
const editionsSchema = z.object({
  entries: z
    .array(
      z.object({
        number_of_pages: z.number().int().positive().optional().catch(undefined),
        publishers: z.array(z.string()).default([]),
      }),
    )
    .catch([]),
});
type Category = 'manga' | 'books';
type Details = { year?: number; authors: string[]; publishers: string[]; pages: number | null };
const isManga = (subjects: string[]) =>
  subjects.some((subject) => /manga|comic|graphic novel/i.test(subject));
// Books use a prefixed identifier so the same work never collides with a manga record.
const externalIdFor = (workId: string, category: Category) =>
  category === 'books' ? `books:${workId}` : workId;

@Injectable()
export class OpenlibraryProvider implements CatalogProvider {
  readonly id = 'openlibrary' as const;
  readonly enabled = true;
  private readonly cache = new ProviderCache();
  private normalize(
    work: z.infer<typeof workSchema>,
    category: Category,
    details: Details,
  ): CatalogResult {
    const workId = work.key.split('/').at(-1)!;
    const sourceUrl = `https://openlibrary.org/works/${workId}`;
    const cover = work.covers.find((id) => id > 0);
    return {
      provider: this.id,
      externalId: externalIdFor(workId, category),
      mediaType: category,
      title: work.title,
      description:
        typeof work.description === 'string' ? work.description : (work.description?.value ?? ''),
      releaseYear: details.year ?? (Number(work.first_publish_date?.match(/\d{4}/)?.[0]) || null),
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
      metadata: {
        kind: 'reading',
        authors: details.authors,
        publishers: details.publishers,
        totalChapters: null,
        totalVolumes: null,
        totalPages: details.pages,
        releaseStatus: 'unknown',
      },
      attribution: {
        label: 'Open Library',
        url: sourceUrl,
        license: 'Metadados Open Library; capas sob direitos próprios',
      },
    };
  }
  async search(query: string, mediaType: MediaType = 'manga') {
    if (mediaType !== 'manga' && mediaType !== 'books') return [];
    return this.cache.get(`search:${mediaType}:${query}`, async () => {
      const url = new URL('https://openlibrary.org/search.json');
      url.search = new URLSearchParams({
        q: mediaType === 'manga' ? `${query} subject:manga` : query,
        limit: '10',
        fields: 'key,title,cover_i,first_publish_year,author_name,publisher,number_of_pages_median',
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
              publisher: z.array(z.string()).default([]),
              number_of_pages_median: z.number().int().positive().optional().catch(undefined),
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
            authors: [],
          },
          mediaType,
          {
            year: work.first_publish_year,
            authors: work.author_name.slice(0, 6),
            publishers: work.publisher.slice(0, 3),
            pages: work.number_of_pages_median ?? null,
          },
        ),
      );
    });
  }
  private async authors(work: z.infer<typeof workSchema>) {
    const names = await Promise.all(
      work.authors.slice(0, 3).map(async ({ author }) => {
        const result = z
          .object({ name: z.string() })
          .safeParse(
            await providerFetch(`https://openlibrary.org${author.key}.json`).catch(() => null),
          );
        return result.success ? [result.data.name] : [];
      }),
    );
    return names.flat();
  }
  private async editions(workId: string) {
    const result = editionsSchema.safeParse(
      await providerFetch(`https://openlibrary.org/works/${workId}/editions.json?limit=10`).catch(
        () => null,
      ),
    );
    const entries = result.success ? result.data.entries : [];
    return {
      pages: entries.find((edition) => edition.number_of_pages)?.number_of_pages ?? null,
      publishers: [...new Set(entries.flatMap((edition) => edition.publishers))].slice(0, 3),
    };
  }
  async details(externalId: string) {
    const match = /^(books:)?(OL\d+W)$/.exec(externalId);
    if (!match) throw new Error('Invalid Open Library identifier');
    const category: Category = match[1] ? 'books' : 'manga';
    const result = await this.cache.get(`details:${externalId}`, async () => {
      const work = workSchema.parse(
        await providerFetch(`https://openlibrary.org/works/${match[2]}.json`),
      );
      if (category === 'manga' && !isManga(work.subjects)) throw new Error('Unsupported work');
      const [authors, editions] = await Promise.all([this.authors(work), this.editions(match[2])]);
      return [this.normalize(work, category, { authors, ...editions })];
    });
    return result[0];
  }
}
