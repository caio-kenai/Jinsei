import { test, expect, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { defaultViewConfig } from '../../packages/contracts/src';

async function register(client: APIRequestContext, name: string) {
  const response = await client.post('/api/auth/register', {
    data: { email: `${name}@example.test`, password: 'Jinsei testes 1234' },
  });
  expect(response.status()).toBe(201);
}

test('biblioteca isola usuários e persiste nota, progresso, tags, filtros e visualização', async ({
  playwright,
}) => {
  const owner = await playwright.request.newContext({
    baseURL: 'http://127.0.0.1:4000',
    extraHTTPHeaders: { Origin: 'http://localhost:3000' },
  });
  const other = await playwright.request.newContext({
    baseURL: 'http://127.0.0.1:4000',
    extraHTTPHeaders: { Origin: 'http://localhost:3000' },
  });
  const id = randomUUID().slice(0, 8);
  await register(owner, `owner-${id}`);
  await register(other, `other-${id}`);
  const input = {
    media: { title: `Obra privada ${id}`, mediaType: 'games', platforms: ['PC'] },
    status: 'in_progress',
    rating: 8.5,
    progress: { hoursPlayed: 12.5, completion: 42 },
    notes: 'Anotação estritamente privada',
    tags: ['Indie', 'indie'],
    favorite: true,
  };
  const created = await owner.post('/api/library/entries', { data: input });
  expect(created.status()).toBe(201);
  const entry = await created.json();
  expect(entry).toMatchObject({
    rating: 8.5,
    progress: input.progress,
    notes: input.notes,
    favorite: true,
  });
  expect(entry.tags).toHaveLength(1);
  expect((await owner.post('/api/library/entries', { data: input })).status()).toBe(409);
  expect((await other.get(`/api/library/entries/${entry.id}`)).status()).toBe(404);
  expect(
    (await other.patch(`/api/library/entries/${entry.id}`, { data: { rating: 0 } })).status(),
  ).toBe(404);
  expect((await other.delete(`/api/library/entries/${entry.id}`)).status()).toBe(404);
  expect(
    (await other.post('/api/library/entries', { data: { mediaId: entry.mediaId } })).status(),
  ).toBe(404);
  expect(
    (await (await other.get('/api/catalog/media', { params: { q: `Obra privada ${id}` } })).json())
      .items,
  ).toHaveLength(0);
  expect(
    (await owner.patch(`/api/library/entries/${entry.id}`, { data: { rating: 8.7 } })).status(),
  ).toBe(400);
  expect(
    (
      await owner.patch(`/api/library/entries/${entry.id}`, {
        data: { progress: { hoursPlayed: 0, completion: 101 } },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await owner.patch(`/api/library/entries/${entry.id}`, {
        data: { status: 'completed', rating: 9.5 },
      })
    ).status(),
  ).toBe(200);
  const filtered = await (
    await owner.get('/api/library/entries', {
      params: { mediaType: 'games', status: 'completed', favorite: 'true', tag: 'indie' },
    })
  ).json();
  expect(filtered.total).toBe(1);
  expect(filtered.items[0].rating).toBe(9.5);
  expect(
    (
      await owner.put('/api/saved-views', {
        data: { mediaType: 'games', config: { ...defaultViewConfig, layout: 'gallery' } },
      })
    ).status(),
  ).toBe(200);
  expect((await (await owner.get('/api/saved-views?mediaType=games')).json()).config.layout).toBe(
    'gallery',
  );
  expect((await (await other.get('/api/saved-views?mediaType=games')).json()).config).toBeNull();
  expect((await owner.delete(`/api/library/entries/${entry.id}`)).status()).toBe(200);
  expect((await owner.get(`/api/library/entries/${entry.id}`)).status()).toBe(404);
  await owner.dispose();
  await other.dispose();
});

test('consulta o Wikidata real e importa uma obra sem duplicar o catálogo', async ({
  playwright,
}) => {
  const client = await playwright.request.newContext({
    baseURL: 'http://127.0.0.1:4000',
    extraHTTPHeaders: { Origin: 'http://localhost:3000' },
  });
  await register(client, `provider-${randomUUID().slice(0, 8)}`);
  const response = await client.get('/api/catalog/media?q=Hollow%20Knight&mediaType=games');
  expect(response.status()).toBe(200);
  const result = await response.json();
  const game = result.items.find(
    (item: { externalId?: string }) => item.externalId === 'Q29300592',
  );
  expect(game).toBeDefined();
  expect(game.attribution.license).toContain('CC0');
  const imported = await client.post('/api/library/entries', {
    data: { source: { provider: 'wikidata', externalId: game.externalId } },
  });
  expect(imported.status()).toBe(201);
  const entry = await imported.json();
  expect(entry.title).toBe('Hollow Knight');
  expect(
    (
      await client.post('/api/library/entries', {
        data: { source: { provider: 'wikidata', externalId: game.externalId } },
      })
    ).status(),
  ).toBe(409);
  await client.delete(`/api/library/entries/${entry.id}`);
  await client.dispose();
});
