'use client';
import { useT } from '@/i18n/provider';
import { currentLocale } from '@/i18n/config';
import { useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Star, Users } from 'lucide-react';
import {
  categoryLabels,
  mediaTypes,
  type MediaType,
  type RankingResponse,
} from '@jinsei/contracts';
import { categoryIcons } from '@/components/shared/category-icons';
import { MediaCover } from '@/features/library/media-cover';
import { PublicFooter, PublicHeader } from '@/features/presentation/public-navigation';
import { categoryColors } from '@/lib/palette';

type Props = {
  ranking: RankingResponse;
  mediaType?: MediaType;
  sort: 'score' | 'popular';
};
const href = (mediaType: MediaType | undefined, sort: string, page = 1) => {
  const query = new URLSearchParams();
  if (mediaType) query.set('tipo', mediaType);
  if (sort !== 'score') query.set('ordem', sort);
  if (page > 1) query.set('pagina', String(page));
  const value = query.toString();
  return `/rankings${value ? `?${value}` : ''}`;
};

type View = { mediaType?: MediaType; sort: 'score' | 'popular'; page: number };
const apiPath = ({ mediaType, sort, page }: View) => {
  const query = new URLSearchParams({ sort, page: String(page) });
  if (mediaType) query.set('mediaType', mediaType);
  return `/works/rankings?${query}`;
};
const sameView = (a: View, b: View) =>
  a.mediaType === b.mediaType && a.sort === b.sort && a.page === b.page;

/**
 * Rankings switch category, order and page in the browser: the list keeps showing
 * while the next one loads, and hovering a tab fetches it ahead of the click.
 */
export function RankingsPage({
  ranking: initial,
  mediaType: initialType,
  sort: initialSort,
}: Props) {
  const t = useT();
  const client = useQueryClient();
  const first: View = { mediaType: initialType, sort: initialSort, page: initial.page };
  const [view, setView] = useState<View>(first);
  const fetchView = (next: View) => api<RankingResponse>(apiPath(next));
  const query = useQuery({
    queryKey: ['rankings', view.mediaType ?? 'all', view.sort, view.page],
    queryFn: () => fetchView(view),
    initialData: sameView(view, first) ? initial : undefined,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
  const ranking = query.data ?? initial;
  const { mediaType, sort } = view;
  const prefetch = (next: View) =>
    void client.prefetchQuery({
      queryKey: ['rankings', next.mediaType ?? 'all', next.sort, next.page],
      queryFn: () => fetchView(next),
      staleTime: 60_000,
    });
  const go = (next: View) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    setView(next);
    window.history.pushState(null, '', href(next.mediaType, next.sort, next.page));
    if (next.page !== view.page) window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const linkProps = (next: View) => ({
    href: href(next.mediaType, next.sort, next.page),
    onClick: go(next),
    onMouseEnter: () => prefetch(next),
    onFocus: () => prefetch(next),
  });
  return (
    <div className="public-surface rankings-surface">
      <PublicHeader />
      <main className="marketing-container rankings-page">
        <header className="rankings-heading">
          <span className="landing-eyebrow">{t('RANKINGS DA COMUNIDADE')}</span>
          <h1>
            {t('As histórias mais')} <span>{t('amadas do Jinsei')}</span>
          </h1>
          <p>{t('Notas de quem acompanha cada obra, ponderadas pela quantidade de avaliações.')}</p>
        </header>
        <nav className="rankings-tabs" aria-label={t('Categorias')}>
          <a className={!mediaType ? 'active' : ''} {...linkProps({ sort, page: 1 })}>
            {t('Todas')}
          </a>
          {mediaTypes.map((type) => {
            const Icon = categoryIcons[type];
            return (
              <a
                key={type}
                className={mediaType === type ? 'active' : ''}
                {...linkProps({ mediaType: type, sort, page: 1 })}
                style={{ '--tab-color': categoryColors[type] } as React.CSSProperties}
              >
                <Icon size={15} />
                {t(categoryLabels[type])}
              </a>
            );
          })}
        </nav>
        <div className="rankings-sort">
          <a
            className={sort === 'score' ? 'active' : ''}
            {...linkProps({ mediaType, sort: 'score', page: 1 })}
          >
            <Star size={14} />
            {t('Melhor avaliadas')}
          </a>
          <a
            className={sort === 'popular' ? 'active' : ''}
            {...linkProps({ mediaType, sort: 'popular', page: 1 })}
          >
            <Users size={14} />
            {t('Mais populares')}
          </a>
        </div>
        {ranking.items.length ? (
          <ol className={cn('rankings-list', query.isPlaceholderData && 'is-loading')}>
            {ranking.items.map((item) => {
              const Icon = categoryIcons[item.mediaType];
              return (
                <li
                  key={item.id}
                  style={{ '--rank-color': categoryColors[item.mediaType] } as React.CSSProperties}
                >
                  <Link href={`/obras/${item.id}`} className="rankings-row">
                    <span
                      className={`rankings-rank ${item.rank <= 3 ? `is-top is-top-${item.rank}` : ''}`}
                    >
                      {item.rank}
                    </span>
                    <MediaCover title={item.title} url={item.coverUrl} />
                    <span className="rankings-title">
                      <strong>{item.title}</strong>
                      <small>
                        <Icon size={12} />
                        {t(categoryLabels[item.mediaType])}
                        {item.releaseYear && ` · ${item.releaseYear}`}
                      </small>
                    </span>
                    <span className="rankings-score">
                      <Star size={15} fill="currentColor" />
                      {item.average === null
                        ? '—'
                        : item.average.toLocaleString(currentLocale(), {
                            maximumFractionDigits: 2,
                          })}
                      <small>
                        {item.ratings.toLocaleString(currentLocale())}{' '}
                        {item.ratings === 1 ? t('avaliação') : t('avaliações')}
                      </small>
                    </span>
                    <span className="rankings-members">
                      <Users size={14} />
                      {item.members.toLocaleString(currentLocale())}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="rankings-empty">
            <p>
              {t('Ainda não há obras avaliadas nesta categoria. Que tal ser a primeira pessoa?')}
            </p>
          </div>
        )}
        <nav className="rankings-pages" aria-label={t('Páginas')}>
          {ranking.page > 1 && (
            <a {...linkProps({ mediaType, sort, page: ranking.page - 1 })}>
              <ChevronLeft size={15} />
              {t('Anteriores')}
            </a>
          )}
          {ranking.hasMore && (
            <a {...linkProps({ mediaType, sort, page: ranking.page + 1 })}>
              {t('Próximas 50')}
              <ChevronRight size={15} />
            </a>
          )}
        </nav>
      </main>
      <PublicFooter />
    </div>
  );
}
