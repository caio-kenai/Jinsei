import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const options = {
  baseURL: 'http://127.0.0.1:4000',
  extraHTTPHeaders: { Origin: 'http://localhost:3000' },
};
const outbox = join(tmpdir(), 'jinsei-e2e-mail');

/** Latest captured e-mail for an address, read from the development outbox. */
async function latestMail(to: string, subject: RegExp) {
  let found: { to: string; subject: string; action: string } | undefined;
  await expect
    .poll(() => {
      const mails = readdirSync(outbox)
        .sort()
        .map((name) => JSON.parse(readFileSync(join(outbox, name), 'utf8')))
        .filter((mail) => mail.to === to && subject.test(mail.subject));
      found = mails.at(-1);
      return Boolean(found);
    })
    .toBe(true);
  return found!;
}
const tokenOf = (url: string) => new URL(url).searchParams.get('token')!;

test('confirma o e-mail e redefine a senha por link de uso único', async ({ playwright }) => {
  const client = await playwright.request.newContext(options);
  const anonymous = await playwright.request.newContext(options);
  const email = `conta-${randomUUID().slice(0, 8)}@example.test`;
  await client.post('/api/auth/register', { data: { email, password: 'Jinsei testes 1234' } });
  expect((await (await client.get('/api/users/me')).json()).emailVerified).toBe(false);
  expect((await (await anonymous.get('/api/instance')).json()).mailEnabled).toBe(true);

  const verification = await latestMail(email, /Confirme/);
  expect(verification.action).toContain('/verify-email?token=');
  const verifyToken = tokenOf(verification.action);
  expect(
    (await anonymous.post('/api/auth/email/verify', { data: { token: verifyToken } })).status(),
  ).toBe(200);
  expect((await (await client.get('/api/users/me')).json()).emailVerified).toBe(true);
  // A link works only once.
  expect(
    (await anonymous.post('/api/auth/email/verify', { data: { token: verifyToken } })).status(),
  ).toBe(400);

  // Unknown addresses get the same answer and no e-mail.
  expect(
    (
      await anonymous.post('/api/auth/password/forgot', {
        data: { email: `ninguem-${randomUUID().slice(0, 6)}@example.test` },
      })
    ).status(),
  ).toBe(200);
  await anonymous.post('/api/auth/password/forgot', { data: { email } });
  const reset = await latestMail(email, /Redefina/);
  const resetToken = tokenOf(reset.action);
  expect(
    (
      await anonymous.post('/api/auth/password/reset', {
        data: { token: resetToken, password: 'curta' },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await anonymous.post('/api/auth/password/reset', {
        data: { token: resetToken, password: 'Nova senha do Jinsei 2026' },
      })
    ).status(),
  ).toBe(200);
  // Resetting ends every session and the old password stops working.
  expect((await client.get('/api/users/me')).status()).toBe(401);
  expect(
    (
      await anonymous.post('/api/auth/login', {
        data: { email, password: 'Jinsei testes 1234' },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await anonymous.post('/api/auth/login', {
        data: { email, password: 'Nova senha do Jinsei 2026' },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await anonymous.post('/api/auth/password/reset', {
        data: { token: resetToken, password: 'Outra senha do Jinsei 2026' },
      })
    ).status(),
  ).toBe(400);
  await client.dispose();
  await anonymous.dispose();
});

test('envia os e-mails no idioma salvo na conta', async ({ playwright }) => {
  const client = await playwright.request.newContext(options);
  const anonymous = await playwright.request.newContext(options);
  const email = `idioma-${randomUUID().slice(0, 8)}@example.test`;
  await client.post('/api/auth/register', { data: { email, password: 'Jinsei testes 1234' } });
  await client.post('/api/users/me/onboarding', {
    data: {
      displayName: 'Reader',
      username: `mail-${randomUUID().slice(0, 8)}`,
      categories: ['books'],
      theme: 'light',
      locale: 'en',
    },
  });
  await anonymous.post('/api/auth/password/forgot', { data: { email } });
  const reset = await latestMail(email, /Reset your Jinsei password/);
  expect(reset.action).toContain('/reset-password?token=');

  await client.patch('/api/users/me/preferences', { data: { locale: 'es' } });
  await client.post('/api/users/me/email/verification');
  await latestMail(email, /Confirma tu correo en Jinsei/);
});
