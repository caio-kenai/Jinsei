import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const options = {
  baseURL: 'http://127.0.0.1:4000',
  extraHTTPHeaders: { Origin: 'http://localhost:3000' },
};

test('publica somente o que o perfil permite', async ({ playwright }) => {
  const owner = await playwright.request.newContext(options);
  const anonymous = await playwright.request.newContext(options);
  const id = randomUUID().slice(0, 8);
  const username = `perfil-${id}`;
  await owner.post('/api/auth/register', {
    data: { email: `${username}@example.test`, password: 'Jinsei testes 1234' },
  });
  await owner.post('/api/users/me/onboarding', {
    data: { displayName: 'Perfil Teste', username, categories: ['games'], theme: 'light' },
  });
  const entry = await (
    await owner.post('/api/library/entries', {
      data: {
        media: { title: `Obra ${id}`, mediaType: 'games' },
        favorite: true,
        notes: 'Anotação secreta',
        tags: ['Segredo'],
        rating: 4,
      },
    })
  ).json();
  await owner.patch(`/api/library/entries/${entry.id}`, {
    data: { review: 'Resenha aberta', reviewPublic: true },
  });
  const publicCollection = await (
    await owner.post('/api/collections', { data: { name: 'Pública', visibility: 'public' } })
  ).json();
  const unlisted = await (
    await owner.post('/api/collections', { data: { name: 'Por link', visibility: 'unlisted' } })
  ).json();
  const hidden = await (await owner.post('/api/collections', { data: { name: 'Oculta' } })).json();
  for (const collection of [publicCollection, unlisted, hidden])
    await owner.post(`/api/collections/${collection.id}/items`, { data: { entryId: entry.id } });

  // A private profile answers like a missing one.
  expect((await anonymous.get(`/api/profiles/${username}`)).status()).toBe(404);
  expect((await anonymous.get(`/api/profiles/${username}/collections/publica`)).status()).toBe(404);
  await owner.patch('/api/users/me/preferences', {
    data: {
      isPublic: true,
      showHistory: false,
      links: [{ label: 'Site', url: 'https://example.com' }],
    },
  });
  expect(
    (
      await owner.patch('/api/users/me/preferences', {
        data: { links: [{ label: 'Inseguro', url: 'http://example.com' }] },
      })
    ).status(),
  ).toBe(400);
  const response = await anonymous.get(`/api/profiles/${username}`);
  expect(response.status()).toBe(200);
  const profile = await response.json();
  const serialized = JSON.stringify(profile);
  expect(serialized).not.toContain('Anotação secreta');
  expect(serialized).not.toContain('Segredo');
  expect(profile.favorites[0]).toMatchObject({ title: `Obra ${id}`, rating: 4 });
  expect(profile.reviews[0].review).toBe('Resenha aberta');
  expect(profile.history).toBeNull();
  expect(profile.links).toEqual([{ label: 'Site', url: 'https://example.com' }]);
  expect(profile.collections.map((item: { slug: string }) => item.slug)).toEqual([
    publicCollection.slug,
  ]);
  expect(
    (await anonymous.get(`/api/profiles/${username}/collections/${unlisted.slug}`)).status(),
  ).toBe(200);
  expect(
    (await anonymous.get(`/api/profiles/${username}/collections/${hidden.slug}`)).status(),
  ).toBe(404);
  const sitemap = await (await anonymous.get('/api/profiles/sitemap')).json();
  const slugs = sitemap.collections
    .filter((item: { username: string }) => item.username === username)
    .map((item: { slug: string }) => item.slug);
  expect(slugs).toEqual([publicCollection.slug]);

  await owner.patch('/api/users/me/preferences', { data: { showReviews: false } });
  expect((await (await anonymous.get(`/api/profiles/${username}`)).json()).reviews).toBeNull();
  await owner.dispose();
  await anonymous.dispose();
});

test('valida imagens enviadas quando o armazenamento está configurado', async ({ playwright }) => {
  const client = await playwright.request.newContext(options);
  const instance = await (await client.get('/api/instance')).json();
  test.skip(!instance.uploadsEnabled, 'Armazenamento S3 não configurado neste ambiente');
  await client.post('/api/auth/register', {
    data: {
      email: `upload-${randomUUID().slice(0, 8)}@example.test`,
      password: 'Jinsei testes 1234',
    },
  });
  const svg = await client.put('/api/users/me/avatar', {
    multipart: { file: { name: 'a.png', mimeType: 'image/png', buffer: Buffer.from('<svg/>') } },
  });
  expect(svg.status()).toBe(415);
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
  const uploaded = await client.put('/api/users/me/avatar', {
    multipart: { file: { name: 'avatar.png', mimeType: 'image/png', buffer: png } },
  });
  expect(uploaded.status()).toBe(200);
  const { url } = await uploaded.json();
  const image = await client.get(url);
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toBe('image/png');
  expect((await client.delete('/api/users/me/avatar')).status()).toBe(200);
  expect((await client.get(url)).status()).toBe(404);
  await client.dispose();
});
