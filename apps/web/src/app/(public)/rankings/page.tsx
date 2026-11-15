import type { Metadata } from 'next';
import { getT } from '@/i18n/server';
import { mediaTypeSchema, type RankingResponse } from '@jinsei/contracts';
import { serverApi } from '@/lib/server-api';
import { RankingsPage } from '@/features/works/rankings-page';
import '@/app/works.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('Rankings'),
    description: t(
      'Jogos, animes, mangás, filmes, séries e livros mais bem avaliados pela comunidade do Jinsei.',
    ),
    alternates: { canonical: '/rankings' },
    robots: { index: true, follow: true },
  };
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export default async function Page({ searchParams }: Props) {
  const query = await searchParams;
  const mediaType = mediaTypeSchema.safeParse(query.tipo).data;
  const sort = query.ordem === 'popular' ? 'popular' : 'score';
  const page = Math.max(1, Math.min(1000, Number(query.pagina) || 1));
  const params = new URLSearchParams({ sort, page: String(page) });
  if (mediaType) params.set('mediaType', mediaType);
  const ranking = (await serverApi<RankingResponse>(`/works/rankings?${params}`)) ?? {
    items: [],
    page,
    hasMore: false,
  };
  return <RankingsPage ranking={ranking} mediaType={mediaType} sort={sort} />;
}
