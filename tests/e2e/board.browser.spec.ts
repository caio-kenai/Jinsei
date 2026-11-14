import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const origin = { Origin: 'http://localhost:3000' };

async function createAccount(page: Page, id: string) {
  await page.request.post('/api/auth/register', {
    headers: origin,
    data: { email: `board-${id}@example.test`, password: 'Jinsei quadro 2026!' },
  });
  await page.request.post('/api/users/me/onboarding', {
    headers: origin,
    data: {
      displayName: 'Pessoa do quadro',
      username: `board-${id}`,
      categories: ['games', 'books'],
      theme: 'light',
      accent: 'violet',
    },
  });
  for (const title of [`Primeiro ${id}`, `Segundo ${id}`]) {
    await page.request.post('/api/library/entries', {
      headers: origin,
      data: { media: { title, mediaType: 'games' }, status: 'planned' },
    });
  }
}

test('move títulos no quadro pelo mouse e mantém as estatísticas acessíveis', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const id = randomUUID().slice(0, 8);
  await createAccount(page, id);
  await page.goto('/library/games');
  await page.getByRole('button', { name: 'Visualização', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Quadro' }).click();
  const planned = page.getByRole('region', { name: /^Planejado/ });
  const playing = page.getByRole('region', { name: /^Em andamento/ });
  const card = planned.locator('.board-card', { hasText: `Primeiro ${id}` });
  await expect(card).toBeVisible();

  const from = (await card.boundingBox())!;
  const to = (await playing.boundingBox())!;
  const saved = page.waitForResponse(
    (response) =>
      response.url().includes('/api/library/entries/') &&
      response.request().method() === 'PATCH' &&
      response.ok(),
  );
  // Grab the card by its cover: the title button opens the details instead.
  await page.mouse.move(from.x + 18, from.y + 20);
  await page.mouse.down();
  await page.mouse.move(from.x + 40, from.y + 40, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + 60, { steps: 12 });
  await page.mouse.up();
  await saved;
  await expect(playing.locator('.board-card', { hasText: `Primeiro ${id}` })).toBeVisible();
  await expect(planned.locator('.board-card')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/board.png', fullPage: true });

  await page.goto('/statistics');
  await page.getByRole('button', { name: 'Ver tabela' }).first().click();
  await expect(page.getByRole('table').first()).toBeVisible();
  await page.getByRole('button', { name: 'Ver gráfico' }).first().click();
  await expect(page.locator('.column-chart .recharts-surface').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/statistics.png', fullPage: true });
  expect(errors).toEqual([]);
});
