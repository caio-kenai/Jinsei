import { test, expect, type APIRequestContext } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const options = {
  baseURL: 'http://127.0.0.1:4000',
  extraHTTPHeaders: { Origin: 'http://localhost:3000' },
};
type Context = { request: { newContext: (init: typeof options) => Promise<APIRequestContext> } };

async function person(playwright: Context, name: string) {
  const client = await playwright.request.newContext(options);
  const username = `${name}-${randomUUID().slice(0, 8)}`;
  const email = `${username}@example.test`;
  await client.post('/api/auth/register', { data: { email, password: 'Jinsei testes 1234' } });
  await client.post('/api/users/me/onboarding', {
    data: { displayName: `Pessoa ${name}`, username, categories: ['anime'], theme: 'light' },
  });
  await client.patch('/api/users/me/preferences', { data: { isPublic: true } });
  const me = await (await client.get(`/api/community/relationships/${username}`)).json();
  return { client, username, email, id: me.user.id as string };
}
async function befriend(a: { client: APIRequestContext; username: string }, b: typeof a) {
  await a.client.post('/api/community/friends', { data: { username: b.username } });
  await b.client.post('/api/community/friends', { data: { username: a.username } });
}

test('bloqueios, denúncias e moderação da instância', async ({ playwright }) => {
  const ana = await person(playwright, 'ana');
  const bia = await person(playwright, 'bia');
  const admin = await person(playwright, 'adm');
  await befriend(ana, bia);

  // Blocking ends the friendship and hides both sides from each other.
  await bia.client.post(`/api/community/blocks/${ana.id}`);
  expect(
    (await (await bia.client.get(`/api/community/relationships/${ana.username}`)).json()).state,
  ).toBe('blocked');
  expect(
    (await (await ana.client.get(`/api/community/relationships/${bia.username}`)).json()).state,
  ).toBe('none');
  expect(
    (
      await ana.client.post('/api/community/friends', { data: { username: bia.username } })
    ).status(),
  ).toBe(403);
  expect(
    (
      await ana.client.post(`/api/community/conversations/${bia.id}`, { data: { body: 'Oi' } })
    ).status(),
  ).toBe(403);
  const search = await (await ana.client.get(`/api/community/users?q=${bia.username}`)).json();
  expect(search.users).toEqual([]);
  expect((await (await bia.client.get('/api/community/blocks')).json()).users[0].id).toBe(ana.id);
  await bia.client.delete(`/api/community/blocks/${ana.id}`);
  await befriend(ana, bia);

  // Only the recipient can report a private message, once while it is open.
  const message = await (
    await ana.client.post(`/api/community/conversations/${bia.id}`, {
      data: { body: 'Compre seguidores aqui!' },
    })
  ).json();
  expect(
    (
      await ana.client.post('/api/community/reports', {
        data: { targetType: 'message', targetId: message.id, reason: 'spam' },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await bia.client.post('/api/community/reports', {
        data: {
          targetType: 'message',
          targetId: message.id,
          reason: 'spam',
          details: 'Propaganda',
        },
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await bia.client.post('/api/community/reports', {
        data: { targetType: 'message', targetId: message.id, reason: 'spam' },
      })
    ).status(),
  ).toBe(409);

  // Moderation is only for administrators.
  expect((await admin.client.get('/api/admin/moderation/reports')).status()).toBe(403);
  execFileSync('node', ['dist/scripts/promote-admin.js', admin.email], {
    cwd: 'apps/api',
    stdio: 'ignore',
  });
  const { reports } = await (await admin.client.get('/api/admin/moderation/reports')).json();
  const report = reports.find((item: { targetId: string }) => item.targetId === message.id);
  expect(report).toMatchObject({
    reason: 'spam',
    snapshot: 'Compre seguidores aqui!',
    contentAvailable: true,
    targetUser: { id: ana.id },
  });
  await admin.client.post(`/api/admin/moderation/reports/${report.id}/resolve`, {
    data: { action: 'remove_content', note: 'Spam' },
  });
  const thread = await (await bia.client.get(`/api/community/conversations/${ana.id}`)).json();
  expect(thread.messages).toEqual([]);

  // Suspended accounts lose their sessions and cannot sign in again.
  await admin.client.post(`/api/admin/moderation/users/${ana.id}/suspend`, {
    data: { reason: 'Spam repetido' },
  });
  expect((await ana.client.get('/api/users/me')).status()).toBe(401);
  expect(
    (
      await ana.client.post('/api/auth/login', {
        data: { email: ana.email, password: 'Jinsei testes 1234' },
      })
    ).status(),
  ).toBe(403);
  expect((await bia.client.get(`/api/profiles/${ana.username}`)).status()).toBe(404);
  const users = await (
    await admin.client.get(`/api/admin/moderation/users?q=${ana.username}`)
  ).json();
  expect(users.users[0]).toMatchObject({ id: ana.id, suspensionReason: 'Spam repetido' });
  expect(
    (
      await admin.client.post(`/api/admin/moderation/users/${admin.id}/suspend`, {
        data: { reason: 'teste' },
      })
    ).status(),
  ).toBe(400);
  await admin.client.post(`/api/admin/moderation/users/${ana.id}/unsuspend`);
  expect(
    (
      await ana.client.post('/api/auth/login', {
        data: { email: ana.email, password: 'Jinsei testes 1234' },
      })
    ).status(),
  ).toBe(200);

  const log = await (await admin.client.get('/api/admin/moderation/log')).json();
  expect(log.entries.slice(0, 3).map((entry: { action: string }) => entry.action)).toEqual([
    'unsuspend_user',
    'suspend_user',
    'remove_content',
  ]);
  for (const item of [ana, bia, admin]) await item.client.dispose();
});
