import { test, expect } from '@playwright/test';
test('políticas usam navegação pública e o apoio está acessível sem conta', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: 'Termos de uso', exact: true })).toBeVisible();
  await expect(page.locator('.legal-article p').first()).toHaveCSS('font-size', '18px');
  await expect(page.locator('.legal-navigation a[aria-current="page"]')).toHaveText(
    'Termos de uso',
  );
  await page.screenshot({ path: 'assets/screenshots/terms.png' });
  await page
    .locator('.legal-navigation')
    .getByRole('link', { name: 'Privacidade', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Política de privacidade', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'assets/screenshots/privacy.png' });
  const navigation = page.getByRole('navigation', { name: 'Informações do Jinsei' });
  await expect(navigation.locator('a,button')).toHaveText([
    'Código aberto',
    'Buy Me a Monster',
    'Privacidade',
    'Termos',
  ]);
  await navigation.getByRole('button', { name: 'Buy Me a Monster' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Um Monster para o próximo capítulo?' }),
  ).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
