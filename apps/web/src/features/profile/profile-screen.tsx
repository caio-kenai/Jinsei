'use client';
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

type Summary = {
  total: number;
  byStatus: Record<string, number>;
  averageRating: number | null;
  hoursPlayed: number;
};
export function ProfileScreen() {
  const { data: user } = useCurrentUser();
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
  return (
    <div className="profile-page">
      <header className="profile-heading">
        <div className="profile-avatar">{initials(user.profile.displayName)}</div>
        <div className="profile-intro">
          <div className="profile-title">
            <h1>{user.profile.displayName}</h1>
            <span className="private-pill">
              <LockKeyhole size={11} />
              Privado
            </span>
          </div>
          <p className="profile-username">@{user.profile.username}</p>
          <p className="profile-bio">
            {user.profile.bio || 'Suas histórias favoritas dizem um pouco sobre você.'}
          </p>
          <span className="profile-joined">
            <CalendarDays size={13} />
            No Jinsei desde{' '}
            {new Date(user.createdAt).toLocaleDateString('pt-BR', {
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings">
            <Settings size={14} />
            Editar perfil
          </Link>
        </Button>
      </header>
      <section className="profile-stats" aria-label="Estatísticas da sua biblioteca">
        <div>
          <Library size={17} />
          <strong>{summary.data?.total ?? '—'}</strong>
          <span>Títulos</span>
        </div>
        <div>
          <CircleCheck size={17} />
          <strong>{summary.data?.byStatus.completed ?? '—'}</strong>
          <span>Concluídos</span>
        </div>
        <div>
          <Clock3 size={17} />
          <strong>{summary.data?.hoursPlayed.toLocaleString('pt-BR') ?? '—'}</strong>
          <span>Horas de jogo</span>
        </div>
        <div>
          <StarRating value={summary.data?.averageRating ?? null} size={15} />
          <strong>
            {summary.data?.averageRating?.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) ??
              '—'}
          </strong>
          <span>Média das avaliações</span>
        </div>
      </section>
      {summary.error && (
        <p className="error-banner">Não foi possível carregar suas estatísticas.</p>
      )}
      <section className="profile-section">
        <div className="section-title">
          <h2>
            <Heart size={17} />
            Histórias favoritas
          </h2>
          <Link href="/favorites">
            Ver todos {favorites.data && `(${favorites.data.total})`}
            <ArrowRight size={13} />
          </Link>
        </div>
        <p className="profile-section-description">
          Uma seleção de até oito experiências que você marcou como favoritas.
        </p>
        {favorites.isPending ? (
          <LoaderCircle className="spin" size={22} />
        ) : favorites.error ? (
          <p className="error-banner">Não foi possível carregar seus favoritos.</p>
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
                <small>{categoryLabels[entry.mediaType]}</small>
                <StarRating value={entry.rating} size={12} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="profile-empty">
            <Heart size={28} />
            <h3>O que mais marcou sua jornada?</h3>
            <p>Favorite títulos da sua biblioteca para exibi-los aqui.</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/library">Explorar minha biblioteca</Link>
            </Button>
          </div>
        )}
      </section>
      <section className="profile-section">
        <div className="section-title">
          <h2>Suas últimas experiências</h2>
          <Link href="/library">
            Ver biblioteca
            <ArrowRight size={13} />
          </Link>
        </div>
        {recent.error ? (
          <p className="error-banner">Não foi possível carregar os registros recentes.</p>
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
                  <small>{categoryLabels[entry.mediaType]}</small>
                </span>
                <StatusBadge status={entry.status} />
                <StarRating value={entry.rating} size={11} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted">Os títulos da sua biblioteca aparecerão aqui.</p>
        )}
      </section>
    </div>
  );
}
