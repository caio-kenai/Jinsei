import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('cadastro, cookie seguro, onboarding persistente, CSRF e revogação', async ({
  playwright,
}) => {
  const client = await playwright.request.newContext({
    baseURL: 'http://127.0.0.1:4000',
    extraHTTPHeaders: { Origin: 'http://localhost:3000' },
  });
  const anonymous = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:4000' });
  const id = randomUUID().slice(0, 8);
  const credentials = { email: `auth-${id}@example.test`, password: `Jinsei teste ${id}` };
  expect((await client.get('/api/users/me')).status()).toBe(401);
  expect((await anonymous.post('/api/auth/register', { data: credentials })).status()).toBe(403);
  const registration = await client.post('/api/auth/register', { data: credentials });
  expect(registration.status()).toBe(201);
  expect(registration.headers()['set-cookie']).toContain('HttpOnly');
  expect(registration.headers()['set-cookie']).toContain('SameSite=Lax');
  const before = await (await client.get('/api/users/me')).json();
  expect(before.preferences.onboarded).toBe(false);
  expect(before).not.toHaveProperty('passwordHash');
  const onboarding = {
    displayName: 'Conta de teste',
    username: `teste-${id}`,
    categories: ['games', 'anime'],
    theme: 'dark',
    accent: 'violet',
  };
  expect((await client.post('/api/users/me/onboarding', { data: onboarding })).status()).toBe(201);
  expect((await client.post('/api/auth/logout')).status()).toBe(200);
  expect((await client.get('/api/users/me')).status()).toBe(401);
  expect(
    (
      await client.post('/api/auth/login', {
        data: { ...credentials, password: 'Outra senha longa' },
      })
    ).status(),
  ).toBe(401);
  expect((await client.post('/api/auth/login', { data: credentials })).status()).toBe(200);
  const after = await (await client.get('/api/users/me')).json();
  expect(after.preferences).toMatchObject({
    categories: ['games', 'anime'],
    theme: 'dark',
    onboarded: true,
  });
  expect(after.profile.username).toBe(onboarding.username);
  expect(
    (await client.patch('/api/users/me/preferences', { data: { userId: 'other-user' } })).status(),
  ).toBe(400);
  const exported = await (await client.get('/api/users/me/export')).json();
  expect(exported.account.email).toBe(credentials.email);
  expect(JSON.stringify(exported)).not.toContain('passwordHash');
  expect((await client.patch('/api/users/me/password', { data: { currentPassword: 'Senha errada 123', newPassword: 'Nova senha longa 456' } })).status()).toBe(401);
  expect((await client.patch('/api/users/me/password', { data: { currentPassword: credentials.password, newPassword: 'Nova senha longa 456' } })).status()).toBe(200);
  expect((await client.get('/api/users/me')).status()).toBe(401);
  expect((await client.post('/api/auth/login', { data: { ...credentials, password: 'Nova senha longa 456' } })).status()).toBe(200);
  expect((await client.delete('/api/users/me', { data: { password: 'Senha errada 123' } })).status()).toBe(401);
  expect((await client.delete('/api/users/me', { data: { password: 'Nova senha longa 456' } })).status()).toBe(200);
  expect((await client.get('/api/users/me')).status()).toBe(401);
  await client.dispose();
  await anonymous.dispose();
});
