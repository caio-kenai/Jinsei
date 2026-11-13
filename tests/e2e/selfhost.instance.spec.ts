import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appVersion, instanceSettingsSchema } from '@jinsei/contracts';

test('self-host mantém política administrativa e dados privados em containers', async ({
  playwright,
  page,
}) => {
  test.skip(
    process.env.SELFHOST_E2E !== '1',
    'Requer a pilha descartável de containers em localhost:3100',
  );
  test.setTimeout(90000);
  const origin = 'http://localhost:3100';
  const owner = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  const other = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  const anonymous = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  const id = randomUUID().slice(0, 8);
  const email = `selfhost-${id}@example.test`;
  const password = 'Jinsei selfhost test 2026!';
  const publicConfiguration = await (await anonymous.get('/api/instance')).json();
  const original = instanceSettingsSchema.parse({
    name: publicConfiguration.name,
    description: publicConfiguration.description,
    contactEmail: publicConfiguration.contactEmail,
    registrationsEnabled: publicConfiguration.registrationsEnabled,
    externalCatalogEnabled: publicConfiguration.externalCatalogEnabled,
    supportEnabled: publicConfiguration.supportEnabled,
  });
  expect(publicConfiguration.version).toBe(appVersion);
  expect((await owner.post('/api/auth/register', { data: { email, password } })).status()).toBe(
    201,
  );
  expect(
    (
      await owner.post('/api/users/me/onboarding', {
        data: {
          displayName: 'Administrador de teste',
          username: `host-${id}`,
          categories: ['games'],
          theme: 'light',
        },
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await other.post('/api/auth/register', {
        data: { email: `other-${id}@example.test`, password },
      })
    ).status(),
  ).toBe(201);
  expect((await anonymous.patch('/api/instance', { data: original })).status()).toBe(401);
  expect((await other.patch('/api/instance', { data: original })).status()).toBe(403);
  execFileSync(
    'docker',
    [
      'compose',
      '--env-file',
      'tests/fixtures/selfhost.env.example',
      '-f',
      'compose.selfhost.yml',
      '-p',
      'jinsei-selfhost-test',
      'exec',
      '-T',
      'api',
      'node',
      'dist/scripts/promote-admin.js',
      email,
    ],
    { stdio: 'pipe' },
  );
  expect((await (await owner.get('/api/users/me')).json()).isAdmin).toBe(true);
  try {
    const changed = {
      ...original,
      name: 'Comunidade Jinsei de teste',
      registrationsEnabled: false,
      externalCatalogEnabled: false,
      supportEnabled: false,
    };
    expect((await owner.patch('/api/instance', { data: changed })).status()).toBe(200);
    expect((await (await anonymous.get('/api/instance')).json()).name).toBe(changed.name);
    expect(
      (
        await anonymous.post('/api/auth/register', {
          data: { email: `blocked-${id}@example.test`, password },
        })
      ).status(),
    ).toBe(403);
    expect((await (await anonymous.get('/api/support')).json()).enabled).toBe(false);
    const created = await owner.post('/api/library/entries', {
      data: { media: { title: `Jogo privado ${id}`, mediaType: 'games' }, rating: 4.75 },
    });
    expect(created.status()).toBe(201);
    const entry = await created.json();
    expect(entry.rating).toBe(4.75);
    expect((await other.get(`/api/library/entries/${entry.id}`)).status()).toBe(404);
    await page.goto(`${origin}/login`);
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/home/);
    await page.goto(`${origin}/settings/instance`);
    await expect(page.getByLabel('Nome da instância')).toHaveValue(changed.name);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: 'assets/screenshots/instance-settings.png' });
  } finally {
    await owner.patch('/api/instance', { data: original });
    await owner.delete('/api/users/me', { data: { password } });
    await other.delete('/api/users/me', { data: { password } });
    await owner.dispose();
    await other.dispose();
    await anonymous.dispose();
  }
});
