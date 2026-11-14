import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

/**
 * Captures the README gallery from a local instance with the demo seed.
 * Run with README_SCREENSHOTS=1 pnpm exec playwright test tests/e2e/readme.screenshots.spec.ts
 */
const directory = 'assets/screenshots/readme';
const web = 'http://localhost:3000';
const api = { baseURL: 'http://127.0.0.1:4000', extraHTTPHeaders: { Origin: web } };
const headers = { Origin: web };

async function settle(page: Page, wait = 1800) {
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(wait);
}
async function capture(page: Page, name: string, wait?: number) {
  await settle(page, wait);
  // The development overlay is not part of the product.
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.screenshot({ path: `${directory}/${name}.png` });
}
async function theme(page: Page, value: 'light' | 'dark') {
  await page.request.patch(`${web}/api/users/me/preferences`, { data: { theme: value }, headers });
}

async function login(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill('demo@jinsei.local');
  await page
    .getByLabel('Senha', { exact: true })
    .fill(process.env.DEMO_PASSWORD ?? 'Jinsei-demo-2026!');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/home/, { timeout: 60000 });
}

test.skip(!process.env.README_SCREENSHOTS, 'Somente ao gerar as capturas do README');
test.beforeAll(() => mkdirSync(directory, { recursive: true }));

test('apresentação e biblioteca', async ({ page }) => {
  test.setTimeout(170000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await capture(page, 'presentation', 2500);
  await login(page);
  await theme(page, 'light');
  await page.goto('/home');
  await capture(page, 'home');
  await page.goto('/library/games');
  await page.getByRole('tab', { name: 'Lista', exact: true }).click();
  await capture(page, 'library-list');
  await page.getByRole('button', { name: /Opções de/ }).click();
  await page.getByRole('menuitem', { name: 'Quadro' }).click();
  await capture(page, 'library-board');
  await page.getByRole('button', { name: /Opções de/ }).click();
  await page.getByRole('menuitem', { name: 'Calendário' }).click();
  await capture(page, 'library-calendar');
  await page.getByRole('button', { name: /Opções de/ }).click();
  await page.getByRole('menuitem', { name: 'Lista' }).click();
  await theme(page, 'dark');
  await page.goto('/library/games');
  await page.getByRole('tab', { name: 'Galeria', exact: true }).click();
  await capture(page, 'library-gallery-dark');
  await page.goto('/statistics');
  await capture(page, 'statistics-dark');
  await theme(page, 'light');
});

test('obras, perfil e comunidade', async ({ page, playwright }) => {
  test.setTimeout(170000);
  // A friend with some activity, a conversation and a club for the community screens.
  const friend = await playwright.request.newContext(api);
  const username = `lia-${randomUUID().slice(0, 6)}`;
  await friend.post('/api/auth/register', {
    data: { email: `${username}@example.test`, password: 'Jinsei capturas 2026' },
  });
  await friend.post('/api/users/me/onboarding', {
    data: {
      displayName: 'Lia Matsuda',
      username,
      categories: ['anime', 'games', 'books'],
      theme: 'light',
    },
  });
  await friend.patch('/api/users/me/preferences', { data: { isPublic: true, showHistory: true } });
  for (const [title, mediaType, rating] of [
    ['Cowboy Bebop', 'anime', 5],
    ['Duna', 'books', 4.5],
    ['Celeste', 'games', 4.75],
  ] as const)
    await friend.post('/api/library/entries', { data: { media: { title, mediaType }, rating } });
  await login(page);
  await theme(page, 'light');
  await page.request.patch(`${web}/api/users/me/preferences`, {
    data: { isPublic: true, showHistory: true },
    headers,
  });
  await page.request.post(`${web}/api/community/friends`, { data: { username }, headers });
  const relationship = await (await friend.get('/api/community/relationships/alex-demo')).json();
  await friend.post(`/api/community/friends/requests/${relationship.requestId}/accept`);
  await friend.post(`/api/community/conversations/${relationship.user.id}`, {
    data: { body: 'Oi, Alex! Vi que você terminou Breaking Bad. Vale a pena?' },
  });
  const club = await (
    await page.request.post(`${web}/api/community/clubs`, {
      data: {
        name: `Clube dos RPGs ${username.slice(4)}`,
        description: 'Para quem passa 100 horas em um mundo aberto e ainda quer mais.',
        mediaType: 'games',
      },
      headers,
    })
  ).json();
  await friend.post(`/api/community/clubs/${club.slug}/membership`);
  await friend.post(`/api/community/clubs/${club.slug}/posts`, {
    data: { body: 'Alguém aí jogando Baldur’s Gate 3 no modo tático? Quero dicas de grupo.' },
  });
  const friends = await (await page.request.get(`${web}/api/community/friends`)).json();
  const lia = friends.friends.find((item: { username: string }) => item.username === username);

  const ranking = await (
    await page.request.get(`${web}/api/works/rankings?mediaType=anime&sort=popular`)
  ).json();
  if (ranking.items[0]) {
    await page.goto(`/obras/${ranking.items[0].id}`);
    await capture(page, 'work', 3000);
  }
  await page.goto('/rankings');
  await capture(page, 'rankings');
  await page.goto('/u/alex-demo');
  await capture(page, 'public-profile');
  await page.goto('/community');
  await expect(page.getByText('Cowboy Bebop').first()).toBeVisible({ timeout: 30000 });
  await capture(page, 'community');
  await page.goto(`/community/messages?com=${lia.id}`);
  await page
    .getByLabel('Mensagem', { exact: true })
    .fill('Vale muito! A última temporada é impecável.');
  await page.keyboard.press('Enter');
  await capture(page, 'messages');
  await page.goto(`/community/clubs/${club.slug}`);
  await capture(page, 'club');

  // Leaves the demo account as the seed created it.
  await page.request.delete(`${web}/api/community/clubs/${club.slug}`, { headers });
  await page.request.delete(`${web}/api/community/friends/${lia.id}`, { headers });
  await page.request.patch(`${web}/api/users/me/preferences`, {
    data: { isPublic: false, showHistory: false },
    headers,
  });
  await friend.dispose();
});

test('jornada, configurações e celular', async ({ page }) => {
  test.setTimeout(170000);
  await login(page);
  await page.goto('/journey');
  await capture(page, 'journey');
  await page.goto('/settings');
  await page.locator('#aparencia').scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 260);
  await capture(page, 'settings');
  await page.goto('/profile');
  await capture(page, 'profile');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/library/games');
  await page.getByRole('tab', { name: 'Galeria', exact: true }).click();
  await capture(page, 'mobile-library');
});
