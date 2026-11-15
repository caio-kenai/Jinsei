import { z } from 'zod';
import type { CatalogResult, MediaType, WorkDetail } from '@jinsei/contracts';
import { plainText, providerFetch } from '../catalog/providers/catalog-provider';

/** Partial information returned by one source; merged into the page detail. */
export type DetailPart = Partial<Omit<WorkDetail, 'facts'>> & {
  facts?: WorkDetail['facts'];
  sourceId: string;
};

const releaseLabels: Record<string, string> = {
  releasing: 'Em lançamento',
  finished: 'Finalizado',
  upcoming: 'Anunciado',
  hiatus: 'Em hiato',
  cancelled: 'Cancelado',
};
const join = (values: string[]) => values.filter(Boolean).join(', ');
const number = (value: number) => value.toLocaleString('pt-BR');

/** Facts already stored in the catalog, available without any external call. */
export function localFacts(media: CatalogResult): WorkDetail['facts'] {
  const facts: WorkDetail['facts'] = [];
  const add = (label: string, value: string | null | undefined) => {
    if (value) facts.push({ label, value });
  };
  add('Lançamento', media.releaseYear ? String(media.releaseYear) : null);
  const metadata = media.metadata;
  if (metadata.kind === 'game') {
    add('Plataformas', join(metadata.platforms));
    add('Desenvolvimento', join(metadata.developers));
    add('Publicação', join(metadata.publishers));
  } else if (metadata.kind === 'episodic') {
    add('Episódios', metadata.totalEpisodes ? number(metadata.totalEpisodes) : null);
    add('Temporadas', metadata.totalSeasons ? number(metadata.totalSeasons) : null);
    add('Estúdios', join(metadata.studios));
    add('Situação', releaseLabels[metadata.releaseStatus]);
  } else if (metadata.kind === 'reading') {
    add('Autoria', join(metadata.authors));
    add('Editoras', join(metadata.publishers));
    add('Capítulos', metadata.totalChapters ? number(metadata.totalChapters) : null);
    add('Volumes', metadata.totalVolumes ? number(metadata.totalVolumes) : null);
    add('Páginas', metadata.totalPages ? number(metadata.totalPages) : null);
    add('Situação', releaseLabels[metadata.releaseStatus]);
  } else {
    add('Direção', join(metadata.directors));
    add('Duração', metadata.runtimeMinutes ? `${metadata.runtimeMinutes} min` : null);
  }
  return facts;
}

const anilistPerson = z.object({
  name: z.object({ full: z.string().nullable() }),
  image: z.object({ medium: z.string().nullable() }).nullable(),
});
const anilistSchema = z.object({
  data: z.object({
    Page: z.object({
      media: z.array(
        z.object({
          id: z.number(),
          siteUrl: z.string(),
          title: z.object({ romaji: z.string().nullable(), english: z.string().nullable() }),
          description: z.string().nullable(),
          bannerImage: z.string().nullable().catch(null),
          coverImage: z.object({ extraLarge: z.string().nullable() }).nullable().catch(null),
          genres: z.array(z.string()).catch([]),
          averageScore: z.number().nullable(),
          episodes: z.number().nullable(),
          chapters: z.number().nullable(),
          volumes: z.number().nullable(),
          duration: z.number().nullable(),
          status: z.string().nullable(),
          format: z.string().nullable(),
          source: z.string().nullable(),
          season: z.string().nullable(),
          seasonYear: z.number().nullable(),
          startDate: z.object({
            year: z.number().nullable(),
            month: z.number().nullable(),
            day: z.number().nullable(),
          }),
          endDate: z.object({
            year: z.number().nullable(),
            month: z.number().nullable(),
            day: z.number().nullable(),
          }),
          studios: z
            .object({ nodes: z.array(z.object({ name: z.string() })) })
            .catch({ nodes: [] }),
          staff: z
            .object({
              edges: z.array(z.object({ role: z.string().nullable(), node: anilistPerson })),
            })
            .catch({ edges: [] }),
          characters: z
            .object({
              edges: z.array(
                z.object({
                  role: z.string().nullable(),
                  node: anilistPerson,
                  voiceActors: z.array(anilistPerson).catch([]),
                }),
              ),
            })
            .catch({ edges: [] }),
        }),
      ),
    }),
  }),
});
const anilistQuery = `query ($search: String, $type: MediaType) {
  Page(perPage: 5) {
    media(search: $search, type: $type, sort: SEARCH_MATCH, isAdult: false) {
      id siteUrl title { romaji english } description(asHtml: false) bannerImage
      coverImage { extraLarge } genres averageScore
      episodes chapters volumes duration status format source season seasonYear
      startDate { year month day } endDate { year month day }
      studios(isMain: true) { nodes { name } }
      staff(perPage: 6, sort: RELEVANCE) { edges { role node { name { full } image { medium } } } }
      characters(perPage: 12, sort: [ROLE, RELEVANCE]) {
        edges { role node { name { full } image { medium } }
          voiceActors(language: JAPANESE, sort: RELEVANCE) { name { full } image { medium } } }
      }
    }
  }
}`;
const anilistStatus: Record<string, string> = {
  FINISHED: 'Finalizado',
  RELEASING: 'Em lançamento',
  NOT_YET_RELEASED: 'Anunciado',
  CANCELLED: 'Cancelado',
  HIATUS: 'Em hiato',
};
const anilistFormat: Record<string, string> = {
  TV: 'TV',
  TV_SHORT: 'TV curta',
  MOVIE: 'Filme',
  SPECIAL: 'Especial',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Clipe',
  MANGA: 'Mangá',
  NOVEL: 'Light novel',
  ONE_SHOT: 'One-shot',
};
const seasons: Record<string, string> = {
  WINTER: 'Inverno',
  SPRING: 'Primavera',
  SUMMER: 'Verão',
  FALL: 'Outono',
};
const roles: Record<string, string> = {
  MAIN: 'Principal',
  SUPPORTING: 'Coadjuvante',
  BACKGROUND: 'Figurante',
};
const date = (value: { year: number | null; month: number | null; day: number | null }) =>
  value.year
    ? [value.day, value.month, value.year]
        .filter(Boolean)
        .map((part) => String(part).padStart(2, '0'))
        .join('/')
    : null;
const simplify = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();

/**
 * AniList (free for non-commercial use, attribution required) for anime and manga:
 * synopsis, score, studios, staff and characters with Japanese voice actors.
 */
export async function anilistDetail(
  media: CatalogResult,
  type: Extract<MediaType, 'anime' | 'manga'>,
): Promise<DetailPart | null> {
  const body = await providerFetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      query: anilistQuery,
      variables: { search: media.title.slice(0, 100), type: type === 'anime' ? 'ANIME' : 'MANGA' },
    }),
  });
  const results = anilistSchema.parse(body).data.Page.media;
  const wanted = simplify(media.title);
  const match =
    results.find(
      (item) =>
        [item.title.romaji, item.title.english].some(
          (title) => title && simplify(title) === wanted,
        ) &&
        (!media.releaseYear ||
          !item.startDate.year ||
          Math.abs(item.startDate.year - media.releaseYear) <= 1),
    ) ??
    results.find(
      (item) =>
        !media.releaseYear ||
        !item.startDate.year ||
        Math.abs(item.startDate.year - media.releaseYear) <= 1,
    );
  if (!match) return null;
  const facts: WorkDetail['facts'] = [];
  const add = (label: string, value: string | null | undefined) => {
    if (value) facts.push({ label, value });
  };
  add('Formato', match.format ? (anilistFormat[match.format] ?? match.format) : null);
  add('Episódios', match.episodes ? number(match.episodes) : null);
  add('Duração', match.duration ? `${match.duration} min por episódio` : null);
  add('Capítulos', match.chapters ? number(match.chapters) : null);
  add('Volumes', match.volumes ? number(match.volumes) : null);
  add('Situação', match.status ? anilistStatus[match.status] : null);
  const start = date(match.startDate);
  const end = date(match.endDate);
  add(
    type === 'anime' ? 'Exibição' : 'Publicação',
    start ? (end && end !== start ? `${start} a ${end}` : start) : null,
  );
  add(
    'Temporada',
    match.season && match.seasonYear ? `${seasons[match.season]} de ${match.seasonYear}` : null,
  );
  add('Estúdios', join(match.studios.nodes.map((studio) => studio.name)));
  return {
    sourceId: `anilist:${match.id}`,
    synopsis: plainText((match.description ?? '').replace(/<br\s*\/?>/gi, '\n')).replace(
      /\n{3,}/g,
      '\n\n',
    ),
    genres: match.genres,
    facts,
    poster: match.coverImage?.extraLarge ?? null,
    banner: match.bannerImage,
    externalScore: match.averageScore
      ? { value: match.averageScore / 10, max: 10, source: 'AniList' }
      : null,
    characters: match.characters.edges.slice(0, 12).map((edge) => ({
      name: edge.node.name.full ?? 'Sem nome',
      image: edge.node.image?.medium ?? null,
      role: roles[edge.role ?? ''] ?? 'Personagem',
      voice: edge.voiceActors[0]
        ? {
            name: edge.voiceActors[0].name.full ?? '',
            image: edge.voiceActors[0].image?.medium ?? null,
            language: 'Japonês',
          }
        : null,
    })),
    staff: match.staff.edges.slice(0, 6).map((edge) => ({
      name: edge.node.name.full ?? 'Sem nome',
      image: edge.node.image?.medium ?? null,
      role: edge.role ?? 'Equipe',
    })),
    links: [{ label: 'AniList', url: match.siteUrl }],
    source: {
      label: 'AniList',
      url: match.siteUrl,
      license: 'Dados do AniList para uso não comercial; imagens dos respectivos titulares',
    },
  };
}

const tvmazePerson = z.object({
  name: z.string(),
  image: z.object({ medium: z.string() }).nullable(),
});
const tvmazeSchema = z.object({
  url: z.string(),
  summary: z.string().nullable(),
  genres: z.array(z.string()).catch([]),
  language: z.string().nullable(),
  status: z.string().nullable(),
  runtime: z.number().nullable(),
  averageRuntime: z.number().nullable().catch(null),
  premiered: z.string().nullable(),
  ended: z.string().nullable().catch(null),
  officialSite: z.string().nullable().catch(null),
  rating: z.object({ average: z.number().nullable() }).catch({ average: null }),
  network: z.object({ name: z.string() }).nullable().catch(null),
  webChannel: z.object({ name: z.string() }).nullable().catch(null),
  _embedded: z
    .object({
      cast: z
        .array(
          z.object({
            person: tvmazePerson,
            character: tvmazePerson.extend({ image: tvmazePerson.shape.image }),
          }),
        )
        .catch([]),
      crew: z.array(z.object({ type: z.string(), person: tvmazePerson })).catch([]),
    })
    .optional()
    .catch(undefined),
});
const tvmazeImages = z.array(
  z.object({
    type: z.string().nullable(),
    main: z.boolean().catch(false),
    resolutions: z.object({ original: z.object({ url: z.string() }).optional() }),
  }),
);
const tvmazeStatus: Record<string, string> = {
  Running: 'Em exibição',
  Ended: 'Finalizada',
  'To Be Determined': 'A definir',
  'In Development': 'Em desenvolvimento',
};
const languages: Record<string, string> = {
  English: 'Inglês',
  Japanese: 'Japonês',
  Korean: 'Coreano',
  Spanish: 'Espanhol',
  Portuguese: 'Português',
  French: 'Francês',
  German: 'Alemão',
  Chinese: 'Chinês',
  Italian: 'Italiano',
};
const brDate = (value: string | null) => (value ? value.split('-').reverse().join('/') : null);

/** TVmaze (CC BY-SA) for series and anime it catalogs: synopsis, network, cast and crew. */
export async function tvmazeDetail(externalId: string): Promise<DetailPart | null> {
  const id = externalId.split(':')[1];
  if (!id || !/^\d+$/.test(id)) return null;
  const [show, images] = await Promise.all([
    providerFetch(`https://api.tvmaze.com/shows/${id}?embed[]=cast&embed[]=crew`).then((body) =>
      tvmazeSchema.parse(body),
    ),
    providerFetch(`https://api.tvmaze.com/shows/${id}/images`)
      .then((body) => tvmazeImages.parse(body))
      .catch(() => []),
  ]);
  const image = (type: string) =>
    images
      .filter((item) => item.type === type)
      .sort((a, b) => Number(b.main) - Number(a.main))[0]?.resolutions.original?.url ?? null;
  const facts: WorkDetail['facts'] = [];
  const add = (label: string, value: string | null | undefined) => {
    if (value) facts.push({ label, value });
  };
  add('Emissora', show.network?.name ?? show.webChannel?.name);
  add('Situação', show.status ? (tvmazeStatus[show.status] ?? show.status) : null);
  const start = brDate(show.premiered);
  const end = brDate(show.ended);
  add('Exibição', start ? (end ? `${start} a ${end}` : `Desde ${start}`) : null);
  const runtime = show.runtime ?? show.averageRuntime;
  add('Duração', runtime ? `${runtime} min por episódio` : null);
  add('Idioma', show.language ? (languages[show.language] ?? show.language) : null);
  return {
    sourceId: `tvmaze:${id}`,
    synopsis: plainText(show.summary ?? ''),
    poster: image('poster'),
    banner: image('background') ?? image('banner'),
    genres: show.genres,
    facts,
    externalScore: show.rating.average
      ? { value: show.rating.average, max: 10, source: 'TVmaze' }
      : null,
    characters: (show._embedded?.cast ?? []).slice(0, 12).map((member) => ({
      name: member.character.name,
      image: member.character.image?.medium ?? member.person.image?.medium ?? null,
      role: 'Elenco',
      voice: {
        name: member.person.name,
        image: member.person.image?.medium ?? null,
        language: 'Ator/atriz',
      },
    })),
    staff: (show._embedded?.crew ?? [])
      .filter((member) => ['Creator', 'Executive Producer', 'Director'].includes(member.type))
      .slice(0, 6)
      .map((member) => ({
        name: member.person.name,
        image: member.person.image?.medium ?? null,
        role:
          member.type === 'Creator'
            ? 'Criação'
            : member.type === 'Director'
              ? 'Direção'
              : 'Produção executiva',
      })),
    links: [
      { label: 'TVmaze', url: show.url },
      ...(show.officialSite && /^https:\/\//.test(show.officialSite)
        ? [{ label: 'Site oficial', url: show.officialSite }]
        : []),
    ],
    source: { label: 'TVmaze', url: show.url, license: 'CC BY-SA 4.0' },
  };
}

const openLibraryWork = z.object({
  description: z.union([z.string(), z.object({ value: z.string() })]).optional(),
  subjects: z.array(z.string()).catch([]).optional(),
  first_publish_date: z.string().optional(),
});

/** Open Library (CC0 data) for books: description and subjects. */
export async function openLibraryDetail(externalId: string): Promise<DetailPart | null> {
  if (!/^OL\d+W$/.test(externalId)) return null;
  const work = openLibraryWork.parse(
    await providerFetch(`https://openlibrary.org/works/${externalId}.json`),
  );
  const description =
    typeof work.description === 'string' ? work.description : (work.description?.value ?? '');
  const url = `https://openlibrary.org/works/${externalId}`;
  return {
    sourceId: `openlibrary:${externalId}`,
    synopsis: plainText(description)
      .replace(/\(\[source\].*?\)/g, '')
      .trim(),
    genres: (work.subjects ?? []).slice(0, 8),
    facts: work.first_publish_date
      ? [{ label: 'Primeira publicação', value: work.first_publish_date }]
      : [],
    links: [{ label: 'Open Library', url }],
    source: { label: 'Open Library', url, license: 'CC0 1.0' },
  };
}

const wikidataLinks = z.object({
  entities: z.record(
    z.string(),
    z.object({
      sitelinks: z.record(z.string(), z.object({ title: z.string() })).catch({}),
      claims: z
        .record(
          z.string(),
          z.array(z.object({ mainsnak: z.object({ datavalue: z.object({ value: z.unknown() }).optional() }) })),
        )
        .catch({}),
    }),
  ),
});
const wikipediaExtract = z.object({
  query: z.object({
    pages: z.array(z.object({ extract: z.string().optional(), missing: z.boolean().optional() })),
  }),
});
const STEAM_ASSETS = 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps';

/** Keeps the first paragraphs of an introduction, cut at a sentence end. */
function summary(text: string, limit = 1400) {
  const clean = text.replace(/\n{3,}/g, '\n\n').trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'));
  return (end > limit / 2 ? cut.slice(0, end + 1) : cut).trim();
}

/** True when the Steam CDN serves this official artwork for the application. */
async function steamAsset(url: string) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Jinsei/0.1 (https://github.com/caio-kenai/Jinsei)' },
      signal: AbortSignal.timeout(6000),
    });
    return response.ok && (response.headers.get('content-type') ?? '').startsWith('image/');
  } catch {
    return false;
  }
}

/**
 * Wikipedia (CC BY-SA 4.0) for the synopsis of any work linked on Wikidata, and the
 * official Steam artwork (vertical cover and wide banner) for games with a Steam ID.
 * The Steam images are only used after the CDN confirms they exist.
 */
export async function wikipediaDetail(qid: string, type: MediaType): Promise<DetailPart | null> {
  if (!/^Q\d+$/.test(qid)) return null;
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: qid,
    props: 'sitelinks|claims',
    sitefilter: 'ptwiki|enwiki|eswiki',
    format: 'json',
  });
  const entity = wikidataLinks.parse(
    await providerFetch(`https://www.wikidata.org/w/api.php?${params}`),
  ).entities[qid];
  if (!entity) return null;
  let synopsis = '';
  let page: { label: string; url: string } | null = null;
  for (const [site, language] of [
    ['ptwiki', 'pt'],
    ['enwiki', 'en'],
  ] as const) {
    const title = entity.sitelinks[site]?.title;
    if (!title) continue;
    const query = new URLSearchParams({
      action: 'query',
      prop: 'extracts',
      exintro: '1',
      explaintext: '1',
      redirects: '1',
      format: 'json',
      formatversion: '2',
      titles: title,
    });
    const extract = wikipediaExtract
      .parse(await providerFetch(`https://${language}.wikipedia.org/w/api.php?${query}`))
      .query.pages[0]?.extract;
    if (extract && extract.length > 80) {
      synopsis = summary(extract);
      page = {
        label: 'Wikipedia',
        url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      };
      break;
    }
  }
  let poster: string | null = null;
  let banner: string | null = null;
  const steam = (entity.claims.P1733 ?? [])
    .map((claim) => claim.mainsnak.datavalue?.value)
    .find((value): value is string => typeof value === 'string' && /^\d+$/.test(value));
  const links: WorkDetail['links'] = page ? [page] : [];
  if (type === 'games' && steam) {
    const [vertical, wide] = [
      `${STEAM_ASSETS}/${steam}/library_600x900_2x.jpg`,
      `${STEAM_ASSETS}/${steam}/library_hero.jpg`,
    ];
    const [hasVertical, hasWide] = await Promise.all([steamAsset(vertical), steamAsset(wide)]);
    poster = hasVertical ? vertical : null;
    banner = hasWide ? wide : null;
    links.push({ label: 'Steam', url: `https://store.steampowered.com/app/${steam}/` });
  }
  if (!synopsis && !poster && !banner) return null;
  return {
    sourceId: `wikipedia:${qid}`,
    synopsis,
    poster,
    banner,
    links,
    source: page ? { label: 'Wikipedia', url: page.url, license: 'CC BY-SA 4.0' } : undefined,
  };
}
