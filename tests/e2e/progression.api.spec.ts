import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('evolui a jornada pela biblioteca sem conceder prêmios repetidos', async ({ playwright }) => {
  const client = await playwright.request.newContext({
    baseURL: 'http://127.0.0.1:4000',
    extraHTTPHeaders: { Origin: 'http://localhost:3000' },
  });
  const id = randomUUID().slice(0, 8);
  await client.post('/api/auth/register', {
    data: { email: `journey-${id}@example.test`, password: 'Jinsei testes 1234' },
  });
  expect(
    (
      await client.patch('/api/users/me/preferences', { data: { timezone: 'Marte/Olympus' } })
    ).status(),
  ).toBe(400);
  await client.patch('/api/users/me/preferences', { data: { timezone: 'America/Sao_Paulo' } });
  const initial = await (await client.get('/api/progression')).json();
  expect(initial).toMatchObject({ level: 1, xp: 0, timezone: 'America/Sao_Paulo' });
  expect(
    initial.missions.filter((mission: { period: string }) => mission.period === 'daily'),
  ).toHaveLength(3);
  expect(initial.titles.find((title: { key: string }) => title.key === 'aprendiz').unlocked).toBe(
    true,
  );

  const entry = await (
    await client.post('/api/library/entries', {
      data: { media: { title: `Jornada ${id}`, mediaType: 'games' }, status: 'completed' },
    })
  ).json();
  const after = await (await client.get('/api/progression')).json();
  expect(after.xp).toBeGreaterThanOrEqual(60);
  expect(
    after.badges.find((badge: { key: string }) => badge.key === 'first-completion').unlockedAt,
  ).not.toBeNull();
  expect(after.unlocked).toContain('first-completion');
  const again = await (await client.get('/api/progression')).json();
  expect(again.xp).toBe(after.xp);
  expect(again.unlocked).toHaveLength(0);

  // Removing and adding the same work again does not create extra experience.
  await client.delete(`/api/library/entries/${entry.id}`);
  const removed = await (await client.get('/api/progression')).json();
  expect(removed.xp).toBeLessThan(after.xp);
  expect((await client.put('/api/progression/title', { data: { title: 'lenda' } })).status()).toBe(
    400,
  );
  const titled = await (
    await client.put('/api/progression/title', { data: { title: 'aprendiz' } })
  ).json();
  expect(titled.activeTitle).toBe('aprendiz');
  await client.dispose();
});
