import { test, expect } from '@playwright/test';
import { createHmac, randomUUID } from 'node:crypto';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function totp(secret: string, step: number) {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of secret) {
    value = (value << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

test('ativa a verificação em duas etapas e entra com o código', async ({ page }) => {
  test.setTimeout(120000);
  const email = `mfa-tela-${randomUUID().slice(0, 8)}@example.test`;
  const password = 'Jinsei navegador 2026!';
  const headers = { Origin: 'http://localhost:3000' };
  await page.request.post('http://localhost:3000/api/auth/register', {
    data: { email, password },
    headers,
  });
  await page.request.post('http://localhost:3000/api/users/me/onboarding', {
    data: {
      displayName: 'Pessoa segura',
      username: `mfa-${randomUUID().slice(0, 8)}`,
      categories: ['games'],
      theme: 'light',
    },
    headers,
  });
  await page.goto('/settings');
  await page.locator('.settings-nav').getByRole('link', { name: 'Segurança' }).click();
  await page.getByRole('button', { name: 'Ativar', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('img', { name: 'QR Code para o aplicativo autenticador' }),
  ).toBeVisible();
  const secret = (await dialog.locator('.mfa-secret code').innerText()).replace(/\s/g, '');
  const step = Math.floor(Date.now() / 30000);
  await dialog.getByLabel('Código do aplicativo').fill(totp(secret, step));
  await dialog.getByRole('button', { name: 'Confirmar e ativar' }).click();
  await expect(dialog.getByText('Códigos de recuperação')).toBeVisible();
  await expect(dialog.locator('.mfa-codes li')).toHaveCount(10);
  await dialog.getByRole('button', { name: 'Guardei os códigos' }).click();
  await expect(page.getByText('Ativa', { exact: true })).toBeVisible();

  await page.context().clearCookies();
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  const code = page.getByLabel('Código de verificação');
  await expect(code).toBeVisible();
  await code.fill('000000');
  await page.getByRole('button', { name: 'Verificar e entrar' }).click();
  await expect(page.locator('.public-field-error')).toContainText('Código inválido');
  await code.fill(totp(secret, step + 1));
  await page.getByRole('button', { name: 'Verificar e entrar' }).click();
  await expect(page).toHaveURL(/home/);
});
