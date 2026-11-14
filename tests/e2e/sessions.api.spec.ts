import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const options = {
  baseURL: 'http://127.0.0.1:4000',
  extraHTTPHeaders: { Origin: 'http://localhost:3000' },
};
const agents = {
  desktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
  phone:
    'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36',
};

test('lista e encerra sessões e guarda formatos de data e hora', async ({ playwright }) => {
  const email = `sessoes-${randomUUID().slice(0, 8)}@example.test`;
  const password = 'Jinsei testes 1234';
  const desktop = await playwright.request.newContext({
    ...options,
    userAgent: agents.desktop,
  });
  const phone = await playwright.request.newContext({ ...options, userAgent: agents.phone });
  await desktop.post('/api/auth/register', { data: { email, password } });
  await phone.post('/api/auth/login', { data: { email, password } });

  const { sessions } = await (await desktop.get('/api/users/me/sessions')).json();
  expect(sessions).toHaveLength(2);
  expect(sessions[0]).toMatchObject({ current: true, browser: 'Chrome', system: 'Windows' });
  expect(sessions[1]).toMatchObject({ current: false, device: 'Celular', system: 'Android' });
  expect(JSON.stringify(sessions)).not.toContain('Mozilla');

  expect((await desktop.delete(`/api/users/me/sessions/${sessions[0].id}`)).status()).toBe(409);
  await desktop.delete(`/api/users/me/sessions/${sessions[1].id}`);
  expect((await phone.get('/api/users/me')).status()).toBe(401);

  await phone.post('/api/auth/login', { data: { email, password } });
  expect((await (await desktop.delete('/api/users/me/sessions')).json()).ended).toBe(1);
  expect((await phone.get('/api/users/me')).status()).toBe(401);

  const updated = await (
    await desktop.patch('/api/users/me/preferences', {
      data: { dateFormat: 'yyyy-MM-dd', timeFormat: '12h', celebrations: false },
    })
  ).json();
  expect(updated.preferences).toMatchObject({
    dateFormat: 'yyyy-MM-dd',
    timeFormat: '12h',
    celebrations: false,
  });
  expect(
    (await desktop.patch('/api/users/me/preferences', { data: { dateFormat: 'dd-MM' } })).status(),
  ).toBe(400);
  const exported = await (await desktop.get('/api/users/me/export')).json();
  expect(exported.community).toMatchObject({ friendships: [], messages: [], clubs: [] });
  await desktop.dispose();
  await phone.dispose();
});
