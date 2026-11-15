import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  publicWorkPageSchema,
  rankingResponseSchema,
  recommendationSchema,
  statusKeys,
  workDetailSchema,
  type MediaType,
  type RankingQuery,
  type WorkDetail,
} from '@jinsei/contracts';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { catalogInclude, catalogResult, type MediaWithMetadata } from '../catalog/catalog.service';
import { mediaUrl } from '../uploads/uploads.service';
import {
  anilistDetail,
  localFacts,
  openLibraryDetail,
  tvmazeDetail,
  wikipediaDetail,
  type DetailPart,
} from './enrichers';

const DAY = 86400000;
const FRESH_FOR = 14 * DAY;
/** Ratings needed before an average is trusted as much as the catalog mean. */
const PRIOR_WEIGHT = 2;
const PAGE_SIZE = 50;

@Injectable()
export class WorksService {
  private readonly logger = new Logger(WorksService.name);
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  private async media(id: string) {
    const media = await this.db.mediaItem.findFirst({
      where: { id, ownerId: null },
      include: catalogInclude,
    });
    if (!media) throw new NotFoundException('Obra não encontrada');
    return media;
  }

  /** Detail from the cache, refreshed from free catalogs every two weeks. */
  async detail(media: MediaWithMetadata): Promise<WorkDetail> {
    const cached = await this.db.mediaDetail.findUnique({ where: { mediaId: media.id } });
    // Details cached before artwork existed are refreshed once to look for it.
    const current =
      cached && typeof cached.data === 'object' && cached.data !== null && 'poster' in cached.data;
    if (cached && current && cached.fetchedAt.getTime() > Date.now() - FRESH_FOR) {
      const parsed = workDetailSchema.safeParse(cached.data);
      if (parsed.success) return parsed.data;
    }
    const result = catalogResult(media);
    const type = media.mediaTypeId as MediaType;
    const external = (provider: string) =>
      media.externalIds.find((item) => item.provider === provider)?.externalId;
    const sources: (() => Promise<DetailPart | null>)[] = [];
    if (type === 'anime' || type === 'manga') sources.push(() => anilistDetail(result, type));
    const tvmaze = external('tvmaze');
    if (tvmaze) sources.push(() => tvmazeDetail(tvmaze));
    const openLibrary = external('openlibrary');
    if (openLibrary) sources.push(() => openLibraryDetail(openLibrary));
    const wikidata = external('wikidata');
    if (wikidata) sources.push(() => wikipediaDetail(wikidata, type));
    const parts: DetailPart[] = [];
    let failed = false;
    for (const source of sources) {
      try {
        const part = await source();
        if (part) parts.push(part);
      } catch (error) {
        failed = true;
        this.logger.warn(`Detalhes indisponíveis para ${media.id}: ${String(error)}`);
      }
    }
    const first = <K extends keyof DetailPart>(key: K) =>
      parts.map((part) => part[key]).find((value) => (Array.isArray(value) ? value.length : value));
    // The first source wins for each label; catalog facts only fill the gaps.
    const facts: WorkDetail['facts'] = [];
    for (const fact of [...parts.flatMap((part) => part.facts ?? []), ...localFacts(result)])
      if (!facts.some((item) => item.label === fact.label)) facts.push(fact);
    const detail: WorkDetail = {
      synopsis: (first('synopsis') as string | undefined) || media.description,
      facts,
      genres: [...new Set([...media.genres, ...parts.flatMap((part) => part.genres ?? [])])].slice(
        0,
        12,
      ),
      characters: (first('characters') as WorkDetail['characters'] | undefined) ?? [],
      staff: (first('staff') as WorkDetail['staff'] | undefined) ?? [],
      externalScore: (first('externalScore') as WorkDetail['externalScore'] | undefined) ?? null,
      links: parts.flatMap((part) => part.links ?? []),
      source: (first('source') as WorkDetail['source'] | undefined) ?? null,
      poster: (first('poster') as string | null | undefined) ?? null,
      banner: (first('banner') as string | null | undefined) ?? null,
    };
    const data = workDetailSchema.parse(detail);
    // A failed lookup is retried the next day instead of two weeks later.
    const fetchedAt = new Date(failed ? Date.now() - FRESH_FOR + DAY : Date.now());
    const source = parts.map((part) => part.sourceId).join(',') || 'catalog';
    await this.saveArtwork(media, data, parts);
    await this.db.mediaDetail.upsert({
      where: { mediaId: media.id },
      create: { mediaId: media.id, source, data, fetchedAt },
      update: { source, data, fetchedAt },
    });
    return data;
  }

  /** Keeps the vertical cover and the banner on the work, so every list can use them. */
  private async saveArtwork(media: MediaWithMetadata, detail: WorkDetail, parts: DetailPart[]) {
    if (detail.poster === media.posterUrl && detail.banner === media.bannerUrl) return;
    const origin = parts.find((part) => part.poster === detail.poster)?.sourceId.split(':')[0];
    const providers: Record<string, { provider: string; sourceUrl: string; license: string }> = {
      wikipedia: {
        provider: 'Steam',
        sourceUrl: 'https://store.steampowered.com',
        license: 'Arte oficial exibida pela Steam; direitos dos respectivos titulares',
      },
      anilist: {
        provider: 'AniList',
        sourceUrl: 'https://anilist.co',
        license: 'Imagem exibida pelo AniList; direitos dos respectivos titulares',
      },
      tvmaze: {
        provider: 'TVmaze',
        sourceUrl: 'https://www.tvmaze.com',
        license: 'Imagem exibida pelo TVmaze; direitos dos respectivos titulares',
      },
    };
    const attribution = detail.poster && origin ? providers[origin] : undefined;
    await this.db.mediaItem.update({
      where: { id: media.id },
      data: {
        posterUrl: attribution ? detail.poster : null,
        posterAttribution: attribution
          ? { ...attribution, licenseUrl: null, artist: null, layout: 'portrait' }
          : Prisma.DbNull,
        bannerUrl: detail.banner,
      },
    });
  }

  /** Looks up details for ranked works that were never opened, a few at a time. */
  /** Works being enriched right now, so repeated ranking visits don't fetch them twice. */
  private readonly enriching = new Set<string>();

  private enrichInBackground(ids: string[]) {
    const pending = ids.filter((id) => !this.enriching.has(id)).slice(0, 6);
    pending.forEach((id) => this.enriching.add(id));
    void (async () => {
      for (const id of pending) {
        try {
          const media = await this.db.mediaItem.findUnique({ where: { id }, include: catalogInclude });
          if (media) await this.detail(media);
        } catch (error) {
          this.logger.warn(`Enriquecimento adiado para ${id}: ${String(error)}`);
        } finally {
          this.enriching.delete(id);
        }
      }
    })();
  }

  private async community(media: MediaWithMetadata) {
    const [totals, statuses, standing] = await Promise.all([
      this.db.userMediaEntry.aggregate({
        where: { mediaId: media.id },
        _count: { _all: true, ratingSteps: true },
        _avg: { ratingSteps: true },
      }),
      this.db.$queryRaw<{ key: string; count: bigint }[]>`
        SELECT s."key", COUNT(*) AS count
        FROM "UserMediaEntry" e JOIN "UserStatus" s ON s."id" = e."statusId"
        WHERE e."mediaId" = ${media.id}
        GROUP BY s."key"`,
      this.db.$queryRaw<{ rank: bigint | null; popularity: bigint }[]>`
        WITH stats AS (
          SELECT m."id", COUNT(e."id") AS members, COUNT(e."ratingSteps") AS votes,
                 AVG(e."ratingSteps") / 4.0 AS average
          FROM "MediaItem" m JOIN "UserMediaEntry" e ON e."mediaId" = m."id"
          WHERE m."ownerId" IS NULL AND m."mediaTypeId" = ${media.mediaTypeId}
          GROUP BY m."id"
        ), prior AS (SELECT COALESCE(AVG(average), 0) AS mean FROM stats WHERE votes > 0),
        scored AS (
          SELECT s."id", s.members, s.votes,
                 CASE WHEN s.votes = 0 THEN NULL
                      ELSE (s.votes * s.average + ${PRIOR_WEIGHT} * p.mean) / (s.votes + ${PRIOR_WEIGHT}) END AS score
          FROM stats s, prior p
        ), target AS (SELECT * FROM scored WHERE "id" = ${media.id})
        SELECT
          CASE WHEN t.score IS NULL THEN NULL
               ELSE (SELECT COUNT(*) FROM scored o WHERE o.score > t.score) + 1 END AS rank,
          (SELECT COUNT(*) FROM scored o WHERE o.members > COALESCE(t.members, 0)) + 1 AS popularity
        FROM target t`,
    ]);
    const favorites = await this.db.userMediaEntry.count({
      where: { mediaId: media.id, favorite: true },
    });
    const byStatus = Object.fromEntries(statusKeys.map((key) => [key, 0])) as Record<
      (typeof statusKeys)[number],
      number
    >;
    for (const row of statuses)
      if ((statusKeys as readonly string[]).includes(row.key))
        byStatus[row.key as (typeof statusKeys)[number]] = Number(row.count);
    const average = totals._avg.ratingSteps;
    return {
      average: average === null ? null : Math.round((average / 4) * 100) / 100,
      ratings: totals._count.ratingSteps,
      members: totals._count._all,
      favorites,
      rank: standing[0]?.rank ? Number(standing[0].rank) : null,
      popularity: totals._count._all && standing[0] ? Number(standing[0].popularity) : null,
      statuses: byStatus,
    };
  }

  /** Public reviews from members whose profiles are public. */
  private async reviews(mediaId: string, take = 20) {
    const where = {
      mediaId,
      reviewPublic: true,
      review: { not: '' },
      user: { suspendedAt: null, profile: { isPublic: true, username: { not: null } } },
    } satisfies Prisma.UserMediaEntryWhereInput;
    const [entries, counts] = await Promise.all([
      this.db.userMediaEntry.findMany({
        where,
        include: { status: true, user: { include: { profile: true } } },
        orderBy: { updatedAt: 'desc' },
        take,
      }),
      this.db.userMediaEntry.groupBy({ by: ['recommendation'], where, _count: { _all: true } }),
    ]);
    const reviewCounts = Object.fromEntries(
      recommendationSchema.options.map((key) => [
        key,
        counts.find((row) => row.recommendation === key)?._count._all ?? 0,
      ]),
    );
    return {
      reviewCounts,
      reviews: entries.map((entry) => ({
        id: entry.id,
        author: {
          username: entry.user.profile!.username!,
          displayName: entry.user.profile!.displayName,
          avatarUrl: mediaUrl(entry.user.profile!.avatarId),
        },
        rating: entry.ratingSteps === null ? null : entry.ratingSteps / 4,
        recommendation: recommendationSchema.safeParse(entry.recommendation).data ?? null,
        status: entry.status.key,
        text: entry.review,
        updatedAt: entry.updatedAt.toISOString(),
      })),
    };
  }

  async page(id: string) {
    const media = await this.media(id);
    const result = catalogResult(media);
    const [detail, community, reviews] = await Promise.all([
      this.detail(media),
      this.community(media),
      this.reviews(media.id),
    ]);
    return publicWorkPageSchema.parse({
      id: media.id,
      title: media.title,
      mediaType: media.mediaTypeId,
      releaseYear: media.releaseYear,
      coverUrl: detail.poster ?? media.posterUrl ?? media.coverUrl,
      coverAttribution: result.coverAttribution,
      description: media.description,
      attribution: result.attribution,
      detail,
      community,
      ...reviews,
    });
  }

  async rankings(query: RankingQuery) {
    const offset = (query.page - 1) * PAGE_SIZE;
    const type = query.mediaType ?? null;
    const rows = await this.db.$queryRaw<
      {
        id: string;
        title: string;
        mediaTypeId: string;
        releaseYear: number | null;
        coverUrl: string | null;
        members: bigint;
        votes: bigint;
        average: number | null;
        score: number | null;
        enriched: boolean;
      }[]
    >`
      WITH stats AS (
        SELECT m."id", m."title", m."mediaTypeId", m."releaseYear",
               COALESCE(m."posterUrl", m."coverUrl") AS "coverUrl",
               EXISTS (SELECT 1 FROM "MediaDetail" d WHERE d."mediaId" = m."id") AS "enriched",
               COUNT(e."id") AS members, COUNT(e."ratingSteps") AS votes,
               AVG(e."ratingSteps") / 4.0 AS average
        FROM "MediaItem" m JOIN "UserMediaEntry" e ON e."mediaId" = m."id"
        WHERE m."ownerId" IS NULL AND (${type}::text IS NULL OR m."mediaTypeId" = ${type})
        GROUP BY m."id"
      ), prior AS (SELECT COALESCE(AVG(average), 0) AS mean FROM stats WHERE votes > 0)
      SELECT s.*, CASE WHEN s.votes = 0 THEN NULL
        ELSE (s.votes * s.average + ${PRIOR_WEIGHT} * p.mean) / (s.votes + ${PRIOR_WEIGHT}) END AS score
      FROM stats s, prior p
      WHERE ${query.sort} = 'popular' OR s.votes > 0
      ORDER BY
        CASE WHEN ${query.sort} = 'popular' THEN s.members END DESC NULLS LAST,
        score DESC NULLS LAST, s.members DESC, s."title" ASC
      LIMIT ${PAGE_SIZE + 1} OFFSET ${offset}`;
    this.enrichInBackground(rows.filter((row) => !row.enriched).map((row) => row.id));
    return rankingResponseSchema.parse({
      page: query.page,
      hasMore: rows.length > PAGE_SIZE,
      items: rows.slice(0, PAGE_SIZE).map((row, index) => ({
        rank: offset + index + 1,
        id: row.id,
        title: row.title,
        mediaType: row.mediaTypeId,
        releaseYear: row.releaseYear,
        coverUrl: row.coverUrl,
        average: row.average === null ? null : Math.round(Number(row.average) * 100) / 100,
        ratings: Number(row.votes),
        members: Number(row.members),
      })),
    });
  }

  /** Works with at least one member, for the sitemap. */
  async sitemap() {
    const items = await this.db.mediaItem.findMany({
      where: { ownerId: null, entries: { some: {} } },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    });
    return items.map((item) => ({ id: item.id, updatedAt: item.updatedAt.toISOString() }));
  }
}
