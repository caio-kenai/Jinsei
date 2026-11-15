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
    await page.getByRole('combobox', { name: 'Language' }).click();
    await page.getByRole('option', { name: 'Español' }).click();
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
    await page.getByRole('combobox', { name: 'Idioma' }).click();
    await page.getByRole('option', { name: 'English' }).click();
    await expect(page.getByText('Language updated')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your way' })).toBeVisible();

    // The account choice wins over the cookie on another device.
    await page.context().clearCookies({ name: 'jinsei-locale' });
    await page.goto('/home');
    await expect(page.getByRole('heading', { name: 'Continue your journey' })).toBeVisible();
    const me = await page.request.get('http://localhost:3000/api/users/me');
    expect((await me.json()).preferences.locale).toBe('en');
  });

  test('as telas principais não deixam textos em português no inglês', async ({ page }) => {
    test.setTimeout(120000);
    const headers = { Origin: 'http://localhost:3000' };
    const email = `ingles-${randomUUID().slice(0, 8)}@example.test`;
    await page.request.post('http://localhost:3000/api/auth/register', {
      data: { email, password: 'Jinsei idiomas 2026!' },
      headers,
    });
    await page.request.post('http://localhost:3000/api/users/me/onboarding', {
      data: {
        displayName: 'Polyglot',
        username: `en-${randomUUID().slice(0, 8)}`,
        categories: ['games', 'anime', 'books'],
        theme: 'light',
        locale: 'en',
      },
      headers,
    });
    // Words that only appear in Portuguese UI text.
    const portuguese =
      /\b(você|não|biblioteca|configurações|títulos?|coleç(ão|ões)|amigos|comunidade|sua|seus)\b/i;
    const leaks: string[] = [];
    for (const path of [
      '/home',
      '/library',
      '/collections',
      '/goals',
      '/journey',
      '/statistics',
      '/community',
      '/community/friends',
      '/community/clubs',
      '/discover',
      '/profile',
      '/settings',
      '/rankings',
      '/',
      '/terms',
    ]) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const text = await page.locator('body').innerText();
      leaks.push(
        ...text
          .split('\n')
          .filter((line) => portuguese.test(line))
          .map((line) => `${path}: ${line}`),
      );
    }
    expect(leaks).toEqual([]);
  });
});
