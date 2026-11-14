import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const origin = { Origin: 'http://localhost:3000' };

test('páginas públicas reúnem notas, reviews e rankings sem expor títulos manuais', async ({
  playwright,
}) => {
  test.setTimeout(60000);
  const people = await Promise.all(
    ['ana', 'bia'].map(async (name) => {
      const client = await playwright.request.newContext({
        baseURL: 'http://127.0.0.1:4000',
        extraHTTPHeaders: origin,
      });
      const id = randomUUID().slice(0, 8);
      await client.post('/api/auth/register', {
        data: { email: `${name}-${id}@example.test`, password: 'Jinsei obras 2026!' },
      });
      await client.post('/api/users/me/onboarding', {
        data: {
          displayName: name,
          username: `${name}-${id}`,
          categories: ['series'],
          theme: 'light',
          accent: 'violet',
        },
      });
      await client.patch('/api/users/me/preferences', { data: { isPublic: true } });
      return { client, username: `${name}-${id}` };
    }),
  );
  const [ana, bia] = people;
  const imported = await ana.client.post('/api/library/entries', {
    data: { source: { provider: 'tvmaze', externalId: 'series:169' }, status: 'completed' },
  });
  test.skip(imported.status() >= 500, 'Catálogo externo indisponível');
  expect([201, 409]).toContain(imported.status());
  const listed = await (
    await ana.client.get('/api/library/entries?mediaType=series&q=Breaking')
  ).json();
  const mine = listed.items[0];
  const mediaId = mine.mediaId as string;
  expect(mine.publicWork).toBe(true);
  await ana.client.patch(`/api/library/entries/${mine.id}`, {
    data: {
      rating: 5,
      review: 'Uma aula de roteiro do começo ao fim.',
      reviewPublic: true,
      recommendation: 'recommended',
    },
  });
  const added = await bia.client.post('/api/library/entries', {
    data: { mediaId, status: 'planned' },
  });
  expect(added.status()).toBe(201);
  const entryOfBia = await added.json();
  await bia.client.patch(`/api/library/entries/${entryOfBia.id}`, {
    data: { rating: 4, review: 'Rascunho privado', reviewPublic: false },
  });

  const page = await (await ana.client.get(`/api/works/${mediaId}`)).json();
  expect(page.title).toContain('Breaking Bad');
  expect(page.community.members).toBeGreaterThanOrEqual(2);
  expect(page.community.ratings).toBeGreaterThanOrEqual(2);
  expect(page.community.rank).toBeGreaterThanOrEqual(1);
  const texts = page.reviews.map((review: { text: string }) => review.text);
  expect(texts).toContain('Uma aula de roteiro do começo ao fim.');
  expect(texts).not.toContain('Rascunho privado');
  expect(page.reviewCounts.recommended).toBeGreaterThanOrEqual(1);
  expect((await bia.client.get(`/api/library/works/${mediaId}`)).ok()).toBe(true);

  const ranking = await (await ana.client.get('/api/works/rankings?mediaType=series')).json();
  expect(ranking.items.some((item: { id: string }) => item.id === mediaId)).toBe(true);

  const manual = await (
    await ana.client.post('/api/library/entries', {
      data: { media: { title: `Diário ${randomUUID()}`, mediaType: 'series' } },
    })
  ).json();
  expect((await ana.client.get(`/api/works/${manual.mediaId}`)).status()).toBe(404);
  expect(manual.publicWork).toBe(false);
  for (const person of people) await person.client.dispose();
});
