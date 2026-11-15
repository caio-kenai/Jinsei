'use client';
import { currentLocale } from '@/i18n/config';
import { useT } from '@/i18n/provider';
import '@/app/profile.css';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Heart,
  Settings,
  LockKeyhole,
  CalendarDays,
  Library,
  CircleCheck,
  Clock3,
  LoaderCircle,
  ArrowRight,
} from 'lucide-react';
import { categoryLabels, type LibraryResponse } from '@jinsei/contracts';
import { api } from '@/lib/api';
import { initials } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/shared/star-rating';
import { MediaCover } from '@/features/library/media-cover';
import { StatusBadge } from '@/features/library/status-badge';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { useProgression } from '@/features/progression/use-progression';

type Summary = {
  total: number;
  byStatus: Record<string, number>;
  averageRating: number | null;
  hoursPlayed: number;
};
export function ProfileScreen() {
  const t = useT();
  const { data: user } = useCurrentUser();
  const progression = useProgression();
  const favorites = useQuery({
    queryKey: ['library', 'profile-favorites'],
    queryFn: () => api<LibraryResponse>('/library/entries?favorite=true&limit=8'),
  });
  const recent = useQuery({
    queryKey: ['library', 'profile-recent'],
    queryFn: () => api<LibraryResponse>('/library/entries?limit=4'),
  });
  const summary = useQuery({
    queryKey: ['summary'],
    queryFn: () => api<Summary>('/library/summary'),
  });
  if (!user) return null;
  const activeTitle = progression.data?.titles.find(
    (title) => title.key === progression.data?.activeTitle,
  )?.label;
  return (
    <div className="profile-page">
      <header className="profile-heading">
        <div className="profile-avatar">{initials(user.profile.displayName)}</div>
        <div className="profile-intro">
          <div className="profile-title">
            <h1>{user.profile.displayName}</h1>
            <span className="private-pill">
              <LockKeyhole size={11} />
              {t('Privado')}
            </span>
          </div>
          <p className="profile-username">
            @{user.profile.username}
            {activeTitle && <span className="profile-title-chip">{activeTitle}</span>}
          </p>
          <p className="profile-bio">
            {user.profile.bio || t('Suas histórias favoritas dizem um pouco sobre você.')}
          </p>
          <span className="profile-joined">
            <CalendarDays size={13} />
            {t('No Jinsei desde')}{' '}
            {new Date(user.createdAt).toLocaleDateString(currentLocale(), {
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings">
            <Settings size={14} />
            {t('Editar perfil')}
          </Link>
        </Button>
      </header>
      <section className="profile-stats" aria-label={t('Estatísticas da sua biblioteca')}>
        <div data-stat="titles">
          <Library size={17} />
          <strong>{summary.data?.total ?? '—'}</strong>
          <span>{t('Títulos')}</span>
        </div>
        <div data-stat="completed">
          <CircleCheck size={17} />
          <strong>{summary.data?.byStatus.completed ?? '—'}</strong>
          <span>{t('Concluídos')}</span>
        </div>
        <div data-stat="hours">
          <Clock3 size={17} />
          <strong>{summary.data?.hoursPlayed.toLocaleString(currentLocale()) ?? '—'}</strong>
          <span>{t('Horas de jogo')}</span>
        </div>
        <div data-stat="rating">
          <StarRating value={summary.data?.averageRating ?? null} size={15} />
          <strong>
            {summary.data?.averageRating?.toLocaleString(currentLocale(), {
              maximumFractionDigits: 2,
            }) ?? '—'}
          </strong>
          <span>{t('Média das avaliações')}</span>
        </div>
      </section>
      {summary.error && (
        <p className="error-banner">{t('Não foi possível carregar suas estatísticas.')}</p>
      )}
      <section className="profile-section">
        <div className="section-title">
          <h2>
            <Heart size={17} />
            {t('Histórias favoritas')}
          </h2>
          <Link href="/favorites">
            {t('Ver todos')} {favorites.data && `(${favorites.data.total})`}
            <ArrowRight size={13} />
          </Link>
        </div>
        <p className="profile-section-description">
          {t('Uma seleção de até oito experiências que você marcou como favoritas.')}
        </p>
        {favorites.isPending ? (
          <LoaderCircle className="spin" size={22} />
        ) : favorites.error ? (
          <p className="error-banner">{t('Não foi possível carregar seus favoritos.')}</p>
        ) : favorites.data?.items.length ? (
          <div className="profile-favorites">
            {favorites.data.items.map((entry) => (
              <Link
                className="profile-favorite-card"
                key={entry.id}
                href={`/library?entry=${entry.id}`}
              >
                <MediaCover
                  title={entry.title}
                  url={entry.coverUrl}
                  layout={entry.coverAttribution?.layout}
                  large
                />
                <h3>{entry.title}</h3>
                <small>{t(categoryLabels[entry.mediaType])}</small>
                <StarRating value={entry.rating} size={12} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="profile-empty">
            <Heart size={28} />
            <h3>{t('O que mais marcou sua jornada?')}</h3>
            <p>{t('Favorite títulos da sua biblioteca para exibi-los aqui.')}</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/library">{t('Explorar minha biblioteca')}</Link>
            </Button>
          </div>
        )}
      </section>
      <section className="profile-section">
        <div className="section-title">
          <h2>{t('Suas últimas experiências')}</h2>
          <Link href="/library">
            {t('Ver biblioteca')}
            <ArrowRight size={13} />
          </Link>
        </div>
        {recent.error ? (
          <p className="error-banner">{t('Não foi possível carregar os registros recentes.')}</p>
        ) : recent.data?.items.length ? (
          <div className="profile-recent">
            {recent.data.items.map((entry) => (
              <Link href={`/library?entry=${entry.id}`} key={entry.id}>
                <MediaCover
                  title={entry.title}
                  url={entry.coverUrl}
                  layout={entry.coverAttribution?.layout}
                />
                <span>
                  <strong>{entry.title}</strong>
                  <small>{t(categoryLabels[entry.mediaType])}</small>
                </span>
                <StatusBadge status={entry.status} />
                <StarRating value={entry.rating} size={11} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted">{t('Os títulos da sua biblioteca aparecerão aqui.')}</p>
        )}
      </section>
    </div>
  );
}
