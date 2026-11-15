import { test, expect, type APIRequestContext } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const web = 'http://localhost:3000';
const headers = { Origin: web };

async function signUp(request: APIRequestContext, name: string) {
  const username = `${name}-${randomUUID().slice(0, 8)}`;
  const email = `${username}@example.test`;
  await request.post(`${web}/api/auth/register`, {
    data: { email, password: 'Jinsei navegador 2026!' },
    headers,
  });
  await request.post(`${web}/api/users/me/onboarding`, {
    data: { displayName: `Pessoa ${name}`, username, categories: ['anime'], theme: 'light' },
    headers,
  });
  await request.patch(`${web}/api/users/me/preferences`, { data: { isPublic: true }, headers });
  return { username, email };
}

test('denuncia uma mensagem, bloqueia e a moderação remove o conteúdo', async ({
  page,
  browser,
}) => {
  test.setTimeout(150000);
  const sender = await browser.newContext();
  const ana = await signUp(sender.request, 'ana');
  const bia = await signUp(page.request, 'bia');
  await sender.request.post(`${web}/api/community/friends`, {
    data: { username: bia.username },
    headers,
  });
  await page.request.post(`${web}/api/community/friends`, {
    data: { username: ana.username },
    headers,
  });
  const relation = await (
    await page.request.get(`${web}/api/community/relationships/${ana.username}`)
  ).json();
  const anaId = relation.user.id;
  const biaId = (
    await (await sender.request.get(`${web}/api/community/relationships/${bia.username}`)).json()
  ).user.id;
  await sender.request.post(`${web}/api/community/conversations/${biaId}`, {
    data: { body: 'Ganhe seguidores grátis neste link!' },
    headers,
  });

  await page.goto(`/community/messages?com=${anaId}`);
  const message = page.locator('.community-message', { hasText: 'Ganhe seguidores' });
  await message.hover();
  await message.getByRole('button', { name: 'Denunciar mensagem' }).click();
  const dialog = page.getByRole('dialog', { name: 'Denunciar esta mensagem' });
  await dialog.getByRole('radio', { name: 'Spam ou propaganda' }).click();
  await dialog.getByLabel('Detalhes (opcional)').fill('Link suspeito');
  await dialog.getByRole('button', { name: 'Enviar denúncia' }).click();
  await expect(page.getByText('Denúncia enviada')).toBeVisible();

  await page.goto(`/u/${ana.username}`);
  await page.getByRole('button', { name: `Mais opções para Pessoa ana` }).click();
  await page.getByRole('menuitem', { name: 'Bloquear' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Bloquear' }).click();
  await expect(page.getByRole('button', { name: 'Desbloquear' })).toBeVisible();

  const moderator = await browser.newContext();
  const admin = await signUp(moderator.request, 'adm');
  execFileSync('node', ['dist/scripts/promote-admin.js', admin.email], {
    cwd: 'apps/api',
    stdio: 'ignore',
  });
  const adminPage = await moderator.newPage();
  await adminPage.goto('/admin/moderation');
  const report = adminPage.locator('.moderation-report', {
    hasText: 'Ganhe seguidores grátis neste link!',
  });
  await expect(report).toBeVisible({ timeout: 30000 });
  await expect(report).toContainText('Link suspeito');
  if (process.env.SHOTS)
    await adminPage.screenshot({ path: `${process.env.SHOTS}/mod-reports.png` });
  await report.getByLabel('Nota da moderação').fill('Spam com link');
  await report.getByRole('button', { name: 'Remover o conteúdo' }).click();
  await expect(report).toHaveCount(0);
  await adminPage.getByRole('button', { name: 'Registro' }).click();
  await expect(adminPage.getByText('removeu conteúdo').first()).toBeVisible();
  if (process.env.SHOTS) {
    await adminPage.getByRole('button', { name: 'Pessoas' }).click();
    await adminPage.waitForTimeout(1200);
    await adminPage.screenshot({ path: `${process.env.SHOTS}/mod-people.png` });
  }
  await sender.close();
  await moderator.close();
});
