import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('resume a biblioteca em estatísticas sem misturar contas', async ({ playwright }) => {
  const client = await playwright.request.newContext({
    baseURL: 'http://127.0.0.1:4000',
    extraHTTPHeaders: { Origin: 'http://localhost:3000' },
  });
  const id = randomUUID().slice(0, 8);
  await client.post('/api/auth/register', {
    data: { email: `stats-${id}@example.test`, password: 'Jinsei testes 1234' },
  });
  await client.post('/api/library/entries', {
    data: {
      media: { title: `Livro ${id}`, mediaType: 'books' },
      status: 'completed',
      rating: 4.25,
    },
  });
  const statistics = await (await client.get('/api/library/statistics')).json();
  expect(statistics.totals).toMatchObject({ entries: 1, completed: 1, averageRating: 4.25 });
  expect(statistics.byCategory).toEqual([{ mediaType: 'books', total: 1, completed: 1 }]);
  expect(statistics.ratings.find((row: { rating: number }) => row.rating === 4.5).count).toBe(1);
  expect(statistics.completionsByMonth).toHaveLength(12);
  expect(statistics.completionsByMonth.at(-1).count).toBe(1);
  expect(statistics.activity.length).toBeGreaterThan(0);
  await client.dispose();
});
