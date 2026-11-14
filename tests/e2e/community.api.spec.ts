import { test, expect, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const options = {
  baseURL: 'http://127.0.0.1:4000',
  extraHTTPHeaders: { Origin: 'http://localhost:3000' },
};

async function member(
  playwright: { request: { newContext: (init: typeof options) => Promise<APIRequestContext> } },
  name: string,
  isPublic = true,
) {
  const client = await playwright.request.newContext(options);
  const username = `${name}-${randomUUID().slice(0, 8)}`;
  await client.post('/api/auth/register', {
    data: { email: `${username}@example.test`, password: 'Jinsei testes 1234' },
  });
  await client.post('/api/users/me/onboarding', {
    data: { displayName: `Pessoa ${name}`, username, categories: ['anime'], theme: 'light' },
  });
  await client.patch('/api/users/me/preferences', { data: { isPublic, showHistory: true } });
  const me = await (await client.get(`/api/community/relationships/${username}`)).json();
  return { client, username, id: me.user.id as string };
}

const json = async (response: Awaited<ReturnType<APIRequestContext['get']>>) => {
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
};

test('amizades, conversas privadas e clubes', async ({ playwright }) => {
  const ana = await member(playwright, 'ana');
  const bia = await member(playwright, 'bia', false);
  const caio = await member(playwright, 'caio');

  // Private profiles are only found by their exact username.
  const partial = await json(
    await ana.client.get(`/api/community/users?q=${bia.username.slice(0, 5)}`),
  );
  expect(partial.users.map((user: { id: string }) => user.id)).not.toContain(bia.id);
  const exact = await json(await ana.client.get(`/api/community/users?q=${bia.username}`));
  expect(exact.users).toEqual([expect.objectContaining({ id: bia.id, isPublic: false })]);
  expect(JSON.stringify(exact)).not.toContain('example.test');

  // Messages require an accepted friendship.
  expect(
    (
      await ana.client.post(`/api/community/conversations/${bia.id}`, { data: { body: 'Oi' } })
    ).status(),
  ).toBe(403);
  const sent = await json(
    await ana.client.post('/api/community/friends', { data: { username: bia.username } }),
  );
  expect(sent.state).toBe('outgoing');
  expect((await json(await bia.client.get('/api/community/summary'))).pendingRequests).toBe(1);
  const incoming = await json(await bia.client.get(`/api/community/relationships/${ana.username}`));
  expect(incoming.state).toBe('incoming');
  await json(await bia.client.post(`/api/community/friends/requests/${incoming.requestId}/accept`));
  expect(
    (await json(await ana.client.get(`/api/community/relationships/${bia.username}`))).state,
  ).toBe('friends');

  await json(
    await ana.client.post(`/api/community/conversations/${bia.id}`, { data: { body: 'Oi, Bia!' } }),
  );
  expect((await json(await bia.client.get('/api/community/summary'))).unreadMessages).toBe(1);
  const list = await json(await bia.client.get('/api/community/conversations'));
  expect(list.conversations[0]).toMatchObject({
    user: { id: ana.id },
    unread: 1,
    lastMessage: { body: 'Oi, Bia!', mine: false },
  });
  const thread = await json(await bia.client.get(`/api/community/conversations/${ana.id}`));
  expect(thread).toMatchObject({ canMessage: true, messages: [{ body: 'Oi, Bia!', mine: false }] });
  expect((await json(await bia.client.get('/api/community/summary'))).unreadMessages).toBe(0);
  // Strangers cannot read someone else's conversation.
  expect((await caio.client.get(`/api/community/conversations/${ana.id}`)).status()).toBe(404);

  // A friend's library updates appear in the feed.
  await bia.client.post('/api/library/entries', {
    data: { media: { title: 'Obra da Bia', mediaType: 'anime' } },
  });
  const feed = await json(await ana.client.get('/api/community/feed'));
  expect(feed.items[0]).toMatchObject({ title: 'Obra da Bia', user: { id: bia.id } });

  // Asking someone who already asked you accepts the pending request.
  await json(
    await caio.client.post('/api/community/friends', { data: { username: ana.username } }),
  );
  const mutual = await json(
    await ana.client.post('/api/community/friends', { data: { username: caio.username } }),
  );
  expect(mutual.state).toBe('friends');
  await json(await ana.client.delete(`/api/community/friends/${caio.id}`));
  expect(
    (await json(await ana.client.get(`/api/community/relationships/${caio.username}`))).state,
  ).toBe('none');

  // Clubs: anyone can read, members post, only the owner moderates.
  const club = await json(
    await ana.client.post('/api/community/clubs', {
      data: { name: 'Clube de Animação', description: 'Para quem ama animes', mediaType: 'anime' },
    }),
  );
  expect(club).toMatchObject({
    slug: expect.stringMatching(/^clube-de-animacao/),
    role: 'owner',
    memberCount: 1,
  });
  expect(
    (
      await caio.client.post(`/api/community/clubs/${club.slug}/posts`, { data: { body: 'Olá' } })
    ).status(),
  ).toBe(403);
  expect(
    (await json(await caio.client.post(`/api/community/clubs/${club.slug}/membership`))).role,
  ).toBe('member');
  const post = await json(
    await caio.client.post(`/api/community/clubs/${club.slug}/posts`, {
      data: { body: 'Olá, clube!' },
    }),
  );
  const detail = await json(await bia.client.get(`/api/community/clubs/${club.slug}`));
  expect(detail).toMatchObject({
    memberCount: 2,
    role: null,
    posts: [{ body: 'Olá, clube!', canDelete: false }],
  });
  expect(
    (
      await bia.client.patch(`/api/community/clubs/${club.slug}`, { data: { name: 'Meu clube' } })
    ).status(),
  ).toBe(403);
  expect((await ana.client.delete(`/api/community/clubs/${club.slug}/membership`)).status()).toBe(
    400,
  );
  await json(await ana.client.delete(`/api/community/clubs/${club.slug}/posts/${post.id}`));
  const mine = await json(await caio.client.get('/api/community/clubs?mine=true'));
  expect(mine.clubs.map((item: { slug: string }) => item.slug)).toEqual([club.slug]);
  await json(await ana.client.delete(`/api/community/clubs/${club.slug}`));
  expect((await caio.client.get(`/api/community/clubs/${club.slug}`)).status()).toBe(404);

  for (const person of [ana, bia, caio]) await person.client.dispose();
});
