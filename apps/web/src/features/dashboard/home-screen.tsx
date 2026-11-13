'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Plus, LoaderCircle, Library } from 'lucide-react';
import { statusKeys, type LibraryResponse } from '@jinsei/contracts';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { Button } from '@/components/ui/button';
import { AddEntryDialog } from '@/features/library/add-entry-dialog';
import { EntryDetails } from '@/features/library/entry-details';
import { MediaCover } from '@/features/library/media-cover';
import { StatusBadge } from '@/features/library/status-badge';
import { StarRating } from '@/components/shared/star-rating';

type Summary = {
  total: number;
  byStatus: Record<string, number>;
  averageRating: number | null;
  hoursPlayed: number;
};
export function HomeScreen() {
  const { data: user } = useCurrentUser();
  const [add, setAdd] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const summary = useQuery({
    queryKey: ['summary'],
    queryFn: () => api<Summary>('/library/summary'),
  });
  const playing = useQuery({
    queryKey: ['library', 'home-progress'],
    queryFn: () => api<LibraryResponse>('/library/entries?status=in_progress&limit=6'),
  });
  const recent = useQuery({
    queryKey: ['library', 'home-recent'],
    queryFn: () => api<LibraryResponse>('/library/entries?limit=5&sort=createdAt'),
  });
  if (summary.isPending)
    return (
      <div className="empty-state">
        <LoaderCircle className="spin" />
      </div>
    );
  return (
    <div className="home-page">
      <header className="page-heading home-heading">
        <div>
          <span className="eyebrow" style={{ marginBottom: 8 }}>
            SEU ESPAÇO, SUA HISTÓRIA
          </span>
          <h1>Olá, {user?.profile.displayName.split(' ')[0]}.</h1>
          <p>Um novo dia para descobrir, continuar e guardar boas histórias.</p>
        </div>
        <Button className="home-add" size="sm" onClick={() => setAdd(true)}>
          <Plus size={14} />
          Adicionar título
        </Button>
      </header>
      {summary.error ? (
        <div className="error-banner">{summary.error.message}</div>
      ) : (
        <div className="stats-strip">
          <div className="stat">
            <span>Na sua biblioteca</span>
            <strong>{summary.data?.total ?? 0}</strong>
          </div>
          <div className="stat">
            <span>Experiências concluídas</span>
            <strong>{summary.data?.byStatus.completed ?? 0}</strong>
          </div>
          <div className="stat">
            <span>Horas de jogo registradas</span>
            <strong>
              {summary.data?.hoursPlayed.toLocaleString('pt-BR') ?? 0}
              <small style={{ fontSize: 12, marginLeft: 4 }}>h</small>
            </strong>
          </div>
          <div className="stat">
            <span>Sua nota média</span>
            <strong>
              {summary.data?.averageRating?.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) ??
                '—'}
              <small style={{ fontSize: 12, marginLeft: 4 }}> / 5</small>
            </strong>
          </div>
        </div>
      )}
      <div className="section-title">
        <h2>Continue sua jornada</h2>
        <Link href="/library">
          Ver biblioteca
          <ArrowRight size={12} />
        </Link>
      </div>
      {playing.error ? (
        <p className="error-banner">Não foi possível carregar os títulos em andamento.</p>
      ) : playing.data?.items.length ? (
        <div className="continue-list">
          {playing.data.items.map((entry) => (
            <button
              className="continue-card"
              key={entry.id}
              onClick={() => setDetail(entry.id)}
              style={{ textAlign: 'left', background: 'var(--surface)' }}
            >
              <MediaCover
                title={entry.title}
                url={entry.coverUrl}
                layout={entry.coverAttribution?.layout}
              />
              <span className="continue-info">
                <strong>{entry.title}</strong>
                <span className="continue-meta">
                  {entry.mediaType === 'games'
                    ? `${entry.progress.hoursPlayed} h · ${entry.progress.completion}% concluído`
                    : 'Em andamento'}
                </span>
                <span className="progress-track" style={{ display: 'block' }}>
                  <span
                    className="progress-fill"
                    style={{ display: 'block', width: `${entry.progress.completion}%` }}
                  />
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="quote-card">
          <h3>Qual vai ser o próximo capítulo?</h3>
          <p>Adicione uma obra e marque como “Em andamento” para continuar por aqui.</p>
          <Button
            variant="outline"
            size="sm"
            style={{ marginTop: 15 }}
            onClick={() => setAdd(true)}
          >
            <Plus size={13} />
            Adicionar uma experiência
          </Button>
        </div>
      )}
      <div className="home-columns">
        <section>
          <div className="section-title">
            <h2>Adicionados recentemente</h2>
          </div>
          {recent.error ? (
            <p className="error-banner">Não foi possível carregar os títulos recentes.</p>
          ) : recent.data?.items.length ? (
            <div className="status-summary">
              {recent.data.items.map((entry) => (
                <button
                  key={entry.id}
                  className="catalog-result w-full"
                  onClick={() => setDetail(entry.id)}
                >
                  <MediaCover
                    title={entry.title}
                    url={entry.coverUrl}
                    layout={entry.coverAttribution?.layout}
                  />
                  <span style={{ flex: 1 }}>
                    <strong>{entry.title}</strong>
                    <small>{entry.tags.join(' · ') || 'Minha biblioteca'}</small>
                  </span>
                  <StatusBadge status={entry.status} />
                  <StarRating value={entry.rating} size={11} />
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 25 }}>
              <Library size={24} />
              <p>Suas próximas descobertas vão aparecer aqui.</p>
            </div>
          )}
        </section>
        <section>
          <div className="section-title">
            <h2>Sua biblioteca em perspectiva</h2>
          </div>
          <div className="status-summary">
            {statusKeys.map((status) => (
              <div className="status-summary-row" key={status}>
                <StatusBadge status={status} />
                <span>{summary.data?.byStatus[status] ?? 0}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <AddEntryDialog open={add} onOpenChange={setAdd} onAdded={(entry) => setDetail(entry.id)} />
      {detail && <EntryDetails id={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
