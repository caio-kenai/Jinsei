import { mediaTypes } from '@jinsei/contracts';
import { PrismaService } from '../src/prisma/prisma.service';
import { hashPassword, initialStatuses } from '../src/modules/auth/auth.service';
import { WikidataProvider } from '../src/modules/catalog/providers/wikidata.provider';
import { IgdbProvider } from '../src/modules/catalog/providers/igdb.provider';
import { TvmazeProvider } from '../src/modules/catalog/providers/tvmaze.provider';
import { OpenlibraryProvider } from '../src/modules/catalog/providers/openlibrary.provider';
import { TmdbProvider } from '../src/modules/catalog/providers/tmdb.provider';
import { CatalogService } from '../src/modules/catalog/catalog.service';
import { LibraryService } from '../src/modules/library/library.service';
import { UsersService } from '../src/modules/users/users.service';
import { env } from '../src/config/env';
import { InstanceService } from '../src/modules/instance/instance.module';

async function seed() {
  if (env.NODE_ENV === 'production')
    throw new Error('O seed de demonstração não pode ser executado em produção');
  const db = new PrismaService();
  await db.$connect();
  try {
    const email = 'demo@jinsei.local';
    const password = process.env.DEMO_PASSWORD ?? 'Jinsei-demo-2026!';
    const user = await db.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: await hashPassword(password),
        profile: { create: { displayName: 'Alex Costa', username: 'alex-demo' } },
        preference: { create: { theme: 'dark', onboardedAt: new Date() } },
        categories: {
          create: mediaTypes.map((mediaTypeId, sortOrder) => ({ mediaTypeId, sortOrder })),
        },
        statuses: {
          create: mediaTypes.flatMap((mediaTypeId) =>
            initialStatuses.map((status, sortOrder) => ({ ...status, mediaTypeId, sortOrder })),
          ),
        },
      },
    });
    const catalog = new CatalogService(
      db,
      new WikidataProvider(),
      new IgdbProvider(),
      new TvmazeProvider(),
      new OpenlibraryProvider(),
      new TmdbProvider(),
      new InstanceService(db),
    );
    const library = new LibraryService(db, catalog);
    const users = new UsersService(db, library);
    await users.update(
      user.id,
      {
        displayName: 'Alex Costa',
        username: 'alex-demo',
        categories: ['games', 'anime', 'manga', 'movies', 'series'],
        theme: 'dark',
        accent: 'black',
      },
      true,
    );
    const games = [
      {
        title: 'Hollow Knight',
        status: 'in_progress',
        rating: 9.5,
        hours: 32.5,
        completion: 64,
        favorite: true,
        tags: ['Metroidvania', 'Indie'],
      },
      {
        title: 'Stardew Valley',
        status: 'in_progress',
        rating: 9,
        hours: 84,
        completion: 42,
        favorite: true,
        tags: ['Relaxante'],
      },
      {
        title: 'Baldur’s Gate 3',
        search: "Baldur's Gate 3",
        status: 'in_progress',
        rating: 9.5,
        hours: 48.5,
        completion: 35,
        favorite: false,
        tags: ['RPG', 'Com amigos'],
      },
      {
        title: 'Celeste',
        status: 'planned',
        rating: null,
        hours: 0,
        completion: 0,
        favorite: false,
        tags: ['Indie'],
      },
      {
        title: 'Outer Wilds',
        status: 'planned',
        rating: null,
        hours: 0,
        completion: 0,
        favorite: false,
        tags: ['Exploração'],
      },
      {
        title: 'Hades',
        status: 'completed',
        rating: 10,
        hours: 57,
        completion: 100,
        favorite: true,
        tags: ['Roguelike'],
      },
      {
        title: 'Disco Elysium',
        status: 'completed',
        rating: 9.5,
        hours: 29.5,
        completion: 100,
        favorite: true,
        tags: ['Narrativa', 'RPG'],
      },
      {
        title: 'Elden Ring',
        status: 'paused',
        rating: 9,
        hours: 61,
        completion: 55,
        favorite: false,
        tags: ['Mundo aberto'],
      },
    ] as const;
    for (const [index, game] of games.entries()) {
      const query = 'search' in game ? game.search : game.title;
      const found = await catalog.search(user.id, query, 'games');
      const item =
        found.items.find(
          (result) =>
            result.title.toLowerCase().replace(/[’']/g, '') ===
            game.title.toLowerCase().replace(/[’']/g, ''),
        ) ?? found.items[0];
      if (!item)
        throw new Error(
          `Catálogo real indisponível para ${game.title}; o seed não substitui respostas por mocks`,
        );
      const media =
        item.externalId && item.provider === 'wikidata'
          ? await catalog.importSource({ provider: 'wikidata', externalId: item.externalId })
          : item.id
            ? await catalog.existing(user.id, item.id)
            : await catalog.importSource({ provider: 'wikidata', externalId: item.externalId! });
      if (
        await db.userMediaEntry.findUnique({
          where: { userId_mediaId: { userId: user.id, mediaId: media.id } },
        })
      )
        continue;
      const entry = await library.create(user.id, {
        mediaId: media.id,
        status: game.status,
        rating: game.rating === null ? null : game.rating / 2,
        favorite: game.favorite,
        tags: [...game.tags],
        notes:
          index === 0
            ? 'Explorar os caminhos que ficaram para trás. Uma jornada para aproveitar sem pressa.'
            : '',
        progress: { kind: 'game', hoursPlayed: game.hours, completion: game.completion },
      });
      await db.userMediaEntry.update({
        where: { id: entry.id },
        data: {
          createdAt: new Date(Date.now() - (index + 1) * 86400000),
          updatedAt: new Date(Date.now() - index * 3600000),
        },
      });
    }
    for (const source of [
      { provider: 'tvmaze', externalId: 'anime:69956' },
      { provider: 'tvmaze', externalId: 'series:169' },
      { provider: 'openlibrary', externalId: 'OL8988597W' },
      { provider: 'wikidata', externalId: 'Q151599' },
    ] as const) {
      // Additional real catalog records exercise the shared cover model across categories.
      const media = await catalog.importSource(source);
      const existing = await db.userMediaEntry.findUnique({
        where: { userId_mediaId: { userId: user.id, mediaId: media.id } },
      });
      if (!existing)
        await library.create(user.id, {
          mediaId: media.id,
          status: 'planned',
          rating: null,
          favorite: false,
          tags: [],
          notes: '',
        });
    }
    console.info(
      'Demonstração pronta: dados pessoais ilustrativos e metadados reais do Wikidata. Credenciais locais descritas no README.',
    );
  } finally {
    await db.$disconnect();
  }
}
void seed().catch(() => {
  console.error('O seed não foi concluído. Confira o PostgreSQL e a disponibilidade do Wikidata.');
  process.exitCode = 1;
});
