import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test.describe('idioma pelo navegador', () => {
  test.use({ locale: 'en-US' });

  test('segue o navegador, troca na tela pública e salva na conta', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.waitForLoadState('networkidle');
    await page.getByRole('combobox', { name: 'Language' }).selectOption('es');
    await expect(page.getByRole('heading', { name: '¡Bienvenido de nuevo!' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: '¡Bienvenido de nuevo!' })).toBeVisible();

    const email = `idioma-${randomUUID().slice(0, 8)}@example.test`;
    const headers = { Origin: 'http://localhost:3000' };
    await page.request.post('http://localhost:3000/api/auth/register', {
      data: { email, password: 'Jinsei idiomas 2026!' },
      headers,
    });
    await page.goto('/onboarding');
    await expect(page.getByRole('button', { name: 'Empezar mi trayectoria' })).toBeVisible();
    await page.getByLabel('¿Cómo te llamamos?').fill('Pessoa poliglota');
    await page.getByPlaceholder('tu-usuario').fill(`idioma-${randomUUID().slice(0, 8)}`);
    await page.getByRole('button', { name: 'Empezar mi trayectoria' }).click();
    await expect(page).toHaveURL(/home/);
    await expect(page.getByRole('heading', { name: 'Continúa tu trayectoria' })).toBeVisible();

    await page.goto('/settings');
    await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en');
    await expect(page.getByText('Language updated')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your way' })).toBeVisible();

    // The account choice wins over the cookie on another device.
    await page.context().clearCookies({ name: 'jinsei-locale' });
    await page.goto('/home');
    await expect(page.getByRole('heading', { name: 'Continue your journey' })).toBeVisible();
    const me = await page.request.get('http://localhost:3000/api/users/me');
    expect((await me.json()).preferences.locale).toBe('en');
  });
});
