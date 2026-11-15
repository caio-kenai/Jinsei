import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const outbox = join(tmpdir(), 'jinsei-e2e-mail');
async function link(to: string, subject: RegExp) {
  let url = '';
  await expect
    .poll(() => {
      const mail = readdirSync(outbox)
        .sort()
        .map((name) => JSON.parse(readFileSync(join(outbox, name), 'utf8')))
        .filter((item) => item.to === to && subject.test(item.subject))
        .at(-1);
      url = mail?.action ?? '';
      return url;
    })
    .not.toBe('');
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}`;
}

test('confirma o e-mail pelo aviso e recupera a senha pela tela de login', async ({ page }) => {
  test.setTimeout(90000);
  const email = `tela-${randomUUID().slice(0, 8)}@example.test`;
  await page.goto('/register');
  await page.getByLabel('Nome completo', { exact: true }).fill('Pessoa de teste');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('Jinsei navegador 2026!');
  await page.getByRole('button', { name: 'Cadastrar-se com e-mail' }).click();
  await expect(page).toHaveURL(/onboarding/);
  await page.getByLabel('Como podemos te chamar?').fill('Pessoa de teste');
  await page
    .getByLabel('Nome de usuário', { exact: true })
    .fill(`tela-${randomUUID().slice(0, 8)}`);
  await page.getByRole('button', { name: 'Começar minha jornada' }).click();
  await expect(page).toHaveURL(/home/);
  await expect(page.getByText('para usar amizades, conversas e clubes')).toBeVisible();

  await page.goto(await link(email, /Confirme/));
  await expect(page.getByText('E-mail confirmado!')).toBeVisible();
  await page.getByRole('link', { name: 'Abrir meu Jinsei' }).click();
  await expect(page).toHaveURL(/home/);
  await expect(page.getByText('para usar amizades, conversas e clubes')).toHaveCount(0);

  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByRole('link', { name: 'Esqueceu a senha?' }).click();
  await expect(page.getByRole('heading', { name: 'Esqueceu sua senha?' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Enviar link' }).click();
  await expect(page.getByText('você vai receber um link')).toBeVisible();
  await page.goto(await link(email, /Redefina/));
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Nova senha', { exact: true }).fill('Senha nova do navegador 2026');
  await page.getByLabel('Confirme a nova senha').fill('Senha nova do navegador 2026');
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('Senha nova do navegador 2026');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/home/);
});
