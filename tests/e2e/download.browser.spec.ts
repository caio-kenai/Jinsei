import { test, expect } from '@playwright/test';

test('a página de downloads oferece os apps de cada plataforma', async ({ page }) => {
  await page.goto('/download');
  await expect(
    page.getByRole('heading', { name: 'Suas histórias no computador e no celular.' }),
  ).toBeVisible();
  for (const name of ['Windows', 'macOS', 'Linux', 'Android']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'Aplicativo (.apk)' })).toHaveAttribute(
    'href',
    'https://github.com/caio-kenai/Jinsei/releases/latest/download/Jinsei-android.apk',
  );
  await expect(page.getByText('http://localhost:3000', { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Informações do Jinsei' })
      .getByRole('link', { name: 'Apps' }),
  ).toHaveAttribute('href', '/download');
});
