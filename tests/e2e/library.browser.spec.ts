import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';

test('jornada completa no navegador persiste edições, visualização e tema', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const id = randomUUID().slice(0, 8);
  await page.goto('/register');
  await page.getByLabel('Nome completo', { exact: true }).fill('Pessoa de teste');
  await page.getByLabel('E-mail', { exact: true }).fill(`browser-${id}@example.test`);
  await page.getByLabel('Senha', { exact: true }).fill('Jinsei navegador 2026!');
  await page.getByRole('button', { name: 'Cadastrar-se com e-mail' }).click();
  await expect(page).toHaveURL(/onboarding/);
  await page.getByLabel('Como podemos te chamar?').fill('Pessoa de teste');
  await page.getByLabel('Nome de usuário', { exact: true }).fill(`browser-${id}`);
  await page.getByRole('button', { name: 'Escuro', exact: true }).click();
  await page.getByRole('button', { name: 'Começar minha jornada' }).click();
  await expect(page).toHaveURL(/home/);
  await page.goto('/library/games');
  await page.getByRole('button', { name: 'Adicionar título', exact: true }).click();
  await page.getByRole('button', { name: 'Não encontrou? Cadastrar manualmente' }).click();
  await page.getByLabel('Nome do título').fill(`Jogo de teste ${id}`);
  await page.getByLabel('Plataformas', { exact: true }).fill('PC');
  await page.getByLabel('Status', { exact: true }).selectOption('in_progress');
  const ratingInput = page.getByRole('slider', { name: 'Sua nota', exact: true });
  await ratingInput.press('End');
  await ratingInput.press('ArrowLeft');
  await ratingInput.press('ArrowLeft');
  await ratingInput.press('ArrowLeft');
  await expect(ratingInput).toHaveAttribute('aria-valuetext', '4,25 de 5 estrelas');
  await page.getByRole('button', { name: 'Adicionar à biblioteca', exact: true }).click();
  const details = page.getByRole('dialog', { name: 'Detalhes do título' });
  await expect(details).toBeVisible();
  await details.getByLabel('Horas jogadas').fill('12.5');
  await details.getByLabel('Conclusão (%)', { exact: true }).fill('65');
  await details.getByLabel('Tags', { exact: true }).fill('Indie, Exploração');
  await details.getByLabel('Anotações privadas').fill('Progresso salvo no banco de dados.');
  await details.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText('Alterações salvas', { exact: true })).toBeVisible();
  await details.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: `Jogo de teste ${id}`, exact: true }),
  ).toBeVisible();
  await expect(page.getByText('65%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Nota de Jogo de teste ${id}`, exact: true }).click();
  const ratingPopover = page.getByRole('dialog', {
    name: `Nota de Jogo de teste ${id}`,
    exact: true,
  });
  const inlineRating = ratingPopover.getByRole('slider');
  await inlineRating.press('End');
  await inlineRating.press('ArrowLeft');
  const ratingSaved = page.waitForResponse(
    (response) =>
      response.url().includes('/api/library/entries/') &&
      response.request().method() === 'PATCH' &&
      response.status() === 200,
  );
  await ratingPopover.getByRole('button', { name: 'Salvar nota', exact: true }).click();
  await ratingSaved;
  await page.reload();
  await expect(page.getByRole('img', { name: '4,75 de 5 estrelas', exact: true })).toBeVisible();
  const saved = page.waitForResponse(
    (response) =>
      response.url().includes('/api/saved-views') &&
      response.request().method() === 'POST' &&
      response.status() === 201,
  );
  await page.getByRole('tab', { name: 'Galeria', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await saved;
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Galeria', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: 'Alterar tema', exact: true }).click();
  const preferenceSaved = page.waitForResponse(
    (response) =>
      response.url().includes('/api/users/me/preferences') &&
      response.request().method() === 'PATCH' &&
      response.status() === 200,
  );
  await page.getByRole('menuitem', { name: 'Claro', exact: true }).click();
  await preferenceSaved;
  await expect(page.locator('html')).toHaveClass(/light/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/light/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Abrir navegação' }).click();
  await page
    .getByRole('dialog', { name: 'Navegação', exact: true })
    .getByRole('link', { name: 'Jogos', exact: true })
    .click();
  await expect(page.getByRole('dialog', { name: 'Navegação', exact: true })).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});

test('capturas reais de lista, galeria, temas e mobile com conta de demonstração', async ({
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
  const homeAdd = page.getByRole('button', { name: 'Adicionar título', exact: true });
  expect((await homeAdd.boundingBox())!.height).toBeLessThanOrEqual(36);
  await homeAdd.click();
  await expect(page.getByRole('dialog', { name: 'Adicionar à biblioteca' })).toBeVisible();
  await page
    .getByRole('dialog', { name: 'Adicionar à biblioteca' })
    .getByRole('button', { name: 'Fechar', exact: true })
    .click();
  await page.request.patch('/api/users/me/preferences', {
    headers: { Origin: 'http://localhost:3000' },
    data: { theme: 'dark' },
  });
  await page.goto('/home');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.screenshot({ path: 'assets/screenshots/dashboard-dark.png' });
  const gameViews = await (await page.request.get('/api/saved-views?scope=games')).json();
  for (const view of gameViews.views)
    await page.request.delete(`/api/saved-views/${view.id}`, {
      headers: { Origin: 'http://localhost:3000' },
    });
  await page.goto('/library/games');
  await expect(page.getByRole('button', { name: 'Hollow Knight', exact: true })).toBeVisible();
  await expect
    .poll(
      () =>
        page
          .locator('.library-table img')
          .evaluateAll(
            (images) =>
              images.filter(
                (image) =>
                  (image as HTMLImageElement).complete &&
                  (image as HTMLImageElement).naturalWidth > 0,
              ).length,
          ),
      { timeout: 20000 },
    )
    .toBe(8);
  await page.screenshot({ path: 'assets/screenshots/library-list-dark.png' });
  await page.getByRole('button', { name: 'Hollow Knight', exact: true }).click();
  const details = page.getByRole('dialog', { name: 'Detalhes do título' });
  await expect(details.getByRole('link', { name: 'CheapShark', exact: true })).toBeVisible();
  await expect(details.getByRole('img', { name: 'Capa de Hollow Knight' })).toBeVisible();
  await page.screenshot({ path: 'assets/screenshots/entry-details.png' });
  await details.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.getByRole('button', { name: 'Buy Me a Monster', exact: true }).click();
  const support = page.getByRole('dialog');
  await expect(
    support.getByRole('heading', { name: 'Um Monster para o próximo capítulo?' }),
  ).toBeVisible();
  await expect(
    support.getByRole('img', { name: 'QR Code Pix para apoio voluntário' }),
  ).toBeVisible();
  await support.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.getByRole('tab', { name: 'Galeria', exact: true }).click();
  await expect
    .poll(
      () =>
        page
          .locator('.gallery-card img')
          .evaluateAll(
            (images) =>
              images.filter(
                (image) =>
                  (image as HTMLImageElement).complete &&
                  (image as HTMLImageElement).naturalWidth > 0,
              ).length,
          ),
      { timeout: 20000 },
    )
    .toBe(8);
  await page.screenshot({ path: 'assets/screenshots/library-gallery-dark.png' });
  await page.getByRole('button', { name: 'Alterar tema' }).click();
  await page.getByRole('menuitem', { name: 'Claro', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/light/);
  await page.getByRole('tab', { name: 'Lista', exact: true }).click();
  await expect(page.locator('.library-table')).toBeVisible();
  await page.screenshot({ path: 'assets/screenshots/library-list-light.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'Galeria', exact: true }).click();
  await page.screenshot({ path: 'assets/screenshots/library-mobile.png' });
});

test('apresentação e cadastro mantêm o estilo claro, navegação e foco discreto', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Um lugar para todas');
  await page.screenshot({ path: 'assets/screenshots/presentation.png' });
  const closing = page.locator('.closing-showcase');
  await closing.scrollIntoViewIfNeeded();
  await expect(closing).toHaveClass(/is-revealed/);
  await expect
    .poll(() =>
      closing
        .locator('img')
        .evaluateAll(
          (images) =>
            images.filter(
              (item) =>
                (item as HTMLImageElement).complete && (item as HTMLImageElement).naturalWidth > 0,
            ).length,
        ),
    )
    .toBe(3);
  await closing.screenshot({
    path: 'assets/screenshots/presentation-closing.png',
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Cadastre-se', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const input = dialog.getByRole('textbox');
  await input.fill('apresentacao@example.test');
  await expect(input).toHaveCSS('outline-style', 'none');
  await page.screenshot({ path: 'assets/screenshots/signup-dialog.png' });
  await dialog.getByRole('button', { name: 'Cadastre-se GRATUITAMENTE!', exact: true }).click();
  await expect(page).toHaveURL(/register/);
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue('apresentacao@example.test');
  await page.screenshot({ path: 'assets/screenshots/register.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'assets/screenshots/presentation-mobile.png' });
});
