import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

test('perfil privado mostra favoritos e a barra lateral recolhe sem esconder o conteúdo', async ({
  page,
}) => {
  test.setTimeout(60000);
  mkdirSync('assets/screenshots', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill('demo@jinsei.local');
  await page
    .getByLabel('Senha', { exact: true })
    .fill(process.env.DEMO_PASSWORD ?? 'Jinsei-demo-2026!');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/home/);
  const before = (await page.locator('.app-workspace').boundingBox())!.width;
  const collapseSaved = page.waitForResponse(
    (response) =>
      response.url().includes('/api/users/me/preferences') &&
      response.request().method() === 'PATCH' &&
      response.status() === 200,
  );
  await page.getByRole('button', { name: 'Recolher barra lateral', exact: true }).click();
  await collapseSaved;
  await expect(page.locator('.main-sidebar')).not.toBeVisible();
  await expect
    .poll(async () => (await page.locator('.app-workspace').boundingBox())!.width)
    .toBeGreaterThan(before + 100);
  await page.getByRole('button', { name: 'Expandir barra lateral', exact: true }).click();
  await expect(page.locator('.main-sidebar')).toBeVisible();
  await page.getByRole('button', { name: 'Menu da conta', exact: true }).click();
  const menu = page.getByRole('menu');
  await expect(menu.getByText('Alex Costa', { exact: true })).toBeVisible();
  await expect(menu.getByText('demo@jinsei.local', { exact: true })).toBeVisible();
  await expect(menu.locator('.user-menu-favorites .user-menu-cover')).toHaveCount(4);
  await expect
    .poll(
      () =>
        menu
          .locator('.user-menu-favorites img')
          .evaluateAll(
            (images) =>
              images.filter(
                (item) =>
                  (item as HTMLImageElement).complete &&
                  (item as HTMLImageElement).naturalWidth > 0,
              ).length,
          ),
      { timeout: 20000 },
    )
    .toBe(4);
  await page.screenshot({ path: 'assets/screenshots/profile-menu.png' });
  await menu.getByRole('menuitem', { name: 'Meu perfil', exact: true }).click();
  await expect(page).toHaveURL(/profile/);
  await expect(page.getByRole('heading', { name: 'Alex Costa', exact: true })).toBeVisible();
  await expect(page.getByText('Privado', { exact: true })).toBeVisible();
  expect(await page.locator('.profile-favorite-card').count()).toBeLessThanOrEqual(8);
  await expect(page.locator('.profile-favorite-card')).toHaveCount(5);
  await expect
    .poll(
      () =>
        page
          .locator('.profile-recent img')
          .evaluateAll(
            (images) =>
              images.filter(
                (item) =>
                  (item as HTMLImageElement).complete &&
                  (item as HTMLImageElement).naturalWidth > 0,
              ).length,
          ),
      { timeout: 20000 },
    )
    .toBe(4);
  await page.screenshot({ path: 'assets/screenshots/profile.png' });
  const favorite = page.locator('.profile-favorite-card').first();
  const destination = await favorite.getAttribute('href');
  await favorite.click();
  await expect(page.getByRole('dialog', { name: 'Detalhes do título' })).toBeVisible();
  await page
    .getByRole('dialog', { name: 'Detalhes do título' })
    .getByRole('button', { name: 'Fechar', exact: true })
    .click();
  await expect(page).not.toHaveURL(/entry=/);
  await page.goto(destination!);
  await expect(page.getByRole('dialog', { name: 'Detalhes do título' })).toBeVisible();
  await page
    .getByRole('dialog', { name: 'Detalhes do título' })
    .getByRole('button', { name: 'Fechar', exact: true })
    .click();
  await page.goto('/profile');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Alex Costa', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'assets/screenshots/profile-mobile.png' });
});
