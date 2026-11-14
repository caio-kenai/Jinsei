import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('cria um clube, publica e exclui pela comunidade', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill('demo@jinsei.local');
  await page
    .getByLabel('Senha', { exact: true })
    .fill(process.env.DEMO_PASSWORD ?? 'Jinsei-demo-2026!');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/home/);
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Comunidade' })
    .click();
  await expect(page.getByRole('heading', { name: 'Comunidade', exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Seções da comunidade' })
    .getByRole('link', { name: 'Clubes' })
    .click();
  await page.getByRole('button', { name: 'Novo clube' }).click();
  const name = `Clube de teste ${randomUUID().slice(0, 6)}`;
  const dialog = page.getByRole('dialog', { name: 'Novo clube' });
  await dialog.getByLabel('Nome').fill(name);
  await dialog.getByLabel('Descrição').fill('Conversas sobre a biblioteca');
  await dialog.getByLabel('Categoria').selectOption('anime');
  await dialog.getByRole('button', { name: 'Criar clube' }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await page.getByLabel('Nova publicação').fill('Primeira publicação do clube');
  await page.getByRole('button', { name: 'Publicar' }).click();
  await expect(page.getByText('Primeira publicação do clube')).toBeVisible();
  page.once('dialog', (confirm) => void confirm.accept());
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(page).toHaveURL(/\/community\/clubs$/);
  await expect(page.getByText(name)).toHaveCount(0);
});
