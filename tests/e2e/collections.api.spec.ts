import { test, expect, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const context = (playwright: {
  request: { newContext: (options: object) => Promise<APIRequestContext> };
}) =>
  playwright.request.newContext({
    baseURL: 'http://127.0.0.1:4000',
    extraHTTPHeaders: { Origin: 'http://localhost:3000' },
  });

test('organiza coleções e rankings sem expor títulos de outras contas', async ({ playwright }) => {
  const owner = await context(playwright);
  const other = await context(playwright);
  const id = randomUUID().slice(0, 8);
  for (const [client, name] of [
    [owner, `collector-${id}`],
    [other, `intruder-${id}`],
  ] as const)
    expect(
      (
        await client.post('/api/auth/register', {
          data: { email: `${name}@example.test`, password: 'Jinsei testes 1234' },
        })
      ).status(),
    ).toBe(201);
  const entry = async (client: APIRequestContext, title: string, mediaType: string) =>
    (await (
      await client.post('/api/library/entries', {
        data: { media: { title: `${title} ${id}`, mediaType } },
      })
    ).json()) as { id: string };
  const game = await entry(owner, 'Jogo', 'games');
  const movie = await entry(owner, 'Filme', 'movies');
  const foreign = await entry(other, 'Alheio', 'games');

  const created = await owner.post('/api/collections', {
    data: { name: 'Melhores da Vida!', ranked: true },
  });
  expect(created.status()).toBe(201);
  const collection = await created.json();
  expect(collection).toMatchObject({
    slug: 'melhores-da-vida',
    visibility: 'private',
    itemCount: 0,
  });
  const duplicate = await (
    await owner.post('/api/collections', { data: { name: 'Melhores da vida' } })
  ).json();
  expect(duplicate.slug).toBe('melhores-da-vida-2');

  const items = `/api/collections/${collection.id}/items`;
  expect((await owner.post(items, { data: { entryId: game.id } })).status()).toBe(201);
  const mixed = await (await owner.post(items, { data: { entryId: movie.id } })).json();
  expect(mixed.items.map((item: { entry: { id: string } }) => item.entry.id)).toEqual([
    game.id,
    movie.id,
  ]);
  expect((await owner.post(items, { data: { entryId: game.id } })).status()).toBe(409);
  expect((await owner.post(items, { data: { entryId: foreign.id } })).status()).toBe(404);
  expect((await other.get(`/api/collections/${collection.id}`)).status()).toBe(404);
  expect((await other.post(items, { data: { entryId: foreign.id } })).status()).toBe(404);

  const reordered = await (
    await owner.patch(`${items}/${movie.id}`, { data: { position: 0 } })
  ).json();
  expect(reordered.items[0].entry.id).toBe(movie.id);
  const membership = await (await owner.get(`/api/collections?entryId=${game.id}`)).json();
  expect(
    membership.collections.find((item: { id: string }) => item.id === collection.id).contains,
  ).toBe(true);
  expect((await owner.delete(`${items}/${game.id}`)).status()).toBe(200);
  expect((await owner.delete(`/api/library/entries/${movie.id}`)).status()).toBe(200);
  expect((await (await owner.get(`/api/collections/${collection.id}`)).json()).itemCount).toBe(0);
  expect((await other.delete(`/api/collections/${collection.id}`)).status()).toBe(404);
  expect((await owner.delete(`/api/collections/${collection.id}`)).status()).toBe(200);
  await owner.dispose();
  await other.dispose();
});
