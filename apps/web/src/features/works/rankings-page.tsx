'use client';
import { useT } from '@/i18n/provider';
import { currentLocale } from '@/i18n/config';
import Link from 'next/link';
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

export function RankingsPage({ ranking, mediaType, sort }: Props) {
  const t = useT();
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
          <Link className={!mediaType ? 'active' : ''} href={href(undefined, sort)}>
            {t('Todas')}
          </Link>
          {mediaTypes.map((type) => {
            const Icon = categoryIcons[type];
            return (
              <Link
                key={type}
                className={mediaType === type ? 'active' : ''}
                href={href(type, sort)}
                style={{ '--tab-color': categoryColors[type] } as React.CSSProperties}
              >
                <Icon size={15} />
                {t(categoryLabels[type])}
              </Link>
            );
          })}
        </nav>
        <div className="rankings-sort">
          <Link className={sort === 'score' ? 'active' : ''} href={href(mediaType, 'score')}>
            <Star size={14} />
            {t('Melhor avaliadas')}
          </Link>
          <Link className={sort === 'popular' ? 'active' : ''} href={href(mediaType, 'popular')}>
            <Users size={14} />
            {t('Mais populares')}
          </Link>
        </div>
        {ranking.items.length ? (
          <ol className="rankings-list">
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
            <Link href={href(mediaType, sort, ranking.page - 1)}>
              <ChevronLeft size={15} />
              {t('Anteriores')}
            </Link>
          )}
          {ranking.hasMore && (
            <Link href={href(mediaType, sort, ranking.page + 1)}>
              {t('Próximas 50')}
              <ChevronRight size={15} />
            </Link>
          )}
        </nav>
      </main>
      <PublicFooter />
    </div>
  );
}
