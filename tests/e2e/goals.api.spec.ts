import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('calcula metas pela biblioteca e isola as contas', async ({ playwright }) => {
  const options = {
    baseURL: 'http://127.0.0.1:4000',
    extraHTTPHeaders: { Origin: 'http://localhost:3000' },
  };
  const owner = await playwright.request.newContext(options);
  const other = await playwright.request.newContext(options);
  const id = randomUUID().slice(0, 8);
  for (const [client, name] of [
    [owner, `goals-${id}`],
    [other, `goals-other-${id}`],
  ] as const)
    await client.post('/api/auth/register', {
      data: { email: `${name}@example.test`, password: 'Jinsei testes 1234' },
    });
  const today = new Date().toISOString().slice(0, 10);
  const year = today.slice(0, 4);
  const period = { startsOn: `${year}-01-01`, endsOn: `${year}-12-31` };
  const created = await owner.post('/api/goals', {
    data: {
      name: 'Concluir jogos',
      metric: 'titles_completed',
      mediaType: 'games',
      target: 2,
      ...period,
    },
  });
  expect(created.status()).toBe(201);
  const goal = await created.json();
  expect(goal).toMatchObject({ current: 0, target: 2, state: 'active' });
  const episodes = await (
    await owner.post('/api/goals', {
      data: { name: 'Episódios', metric: 'episodes_watched', target: 5, ...period },
    })
  ).json();
  expect(
    (
      await owner.post('/api/goals', {
        data: { name: 'Inválida', metric: 'pages_read', mediaType: 'games', target: 5, ...period },
      })
    ).status(),
  ).toBe(400);

  for (const title of ['Um', 'Dois'])
    await owner.post('/api/library/entries', {
      data: { media: { title: `${title} ${id}`, mediaType: 'games' }, status: 'completed' },
    });
  const anime = await (
    await owner.post('/api/library/entries', {
      data: { media: { title: `Anime ${id}`, mediaType: 'anime' } },
    })
  ).json();
  await owner.patch(`/api/library/entries/${anime.id}`, {
    data: { progress: { kind: 'episodic', episodesWatched: 3 } },
  });
  await owner.patch(`/api/library/entries/${anime.id}`, {
    data: { progress: { kind: 'episodic', episodesWatched: 5 } },
  });
  const goals = (await (await owner.get('/api/goals')).json()).goals;
  expect(goals.find((item: { id: string }) => item.id === goal.id)).toMatchObject({
    current: 2,
    state: 'achieved',
  });
  expect(goals.find((item: { id: string }) => item.id === episodes.id).current).toBe(5);
  expect((await (await other.get('/api/goals')).json()).goals).toHaveLength(0);
  expect((await other.patch(`/api/goals/${goal.id}`, { data: { archived: true } })).status()).toBe(
    404,
  );
  expect(
    (await (await owner.patch(`/api/goals/${goal.id}`, { data: { archived: true } })).json()).state,
  ).toBe('archived');
  expect((await other.delete(`/api/goals/${goal.id}`)).status()).toBe(404);
  expect((await owner.delete(`/api/goals/${goal.id}`)).status()).toBe(200);
  await owner.dispose();
  await other.dispose();
});
