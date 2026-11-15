'use client';
import { useT } from '@/i18n/provider';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarPlus, LoaderCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { statusLabels, type LibraryEntry, type Viewing } from '@jinsei/contracts';
import { api, jsonBody } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDateFormat } from '@/lib/date-format';

/**
 * Viewing history of a film. It keeps its own list so that recording a session does not reset
 * unsaved changes in the surrounding form.
 */
export function ViewingHistory({
  entry,
  onStatusChange,
}: {
  entry: LibraryEntry;
  onStatusChange: (status: LibraryEntry['status']) => void;
}) {
  const t = useT();
  const formatDate = useDateFormat().date;
  const initial = entry.progress.kind === 'film' ? entry.progress : null;
  const [viewings, setViewings] = useState<Viewing[]>(initial?.viewings ?? []);
  const [total, setTotal] = useState(initial?.timesWatched ?? 0);
  const [status, setStatus] = useState(entry.status);
  const [watchedOn, setWatchedOn] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const client = useQueryClient();
  function applied(updated: LibraryEntry) {
    if (updated.progress.kind === 'film') {
      setViewings(updated.progress.viewings);
      setTotal(updated.progress.timesWatched);
    }
    if (updated.status !== status) {
      setStatus(updated.status);
      onStatusChange(updated.status);
      toast.success(
        t('{title} agora está em {value}', {
          title: updated.title,
          value: t(statusLabels[updated.status]),
        }),
      );
    }
    void client.invalidateQueries({ queryKey: ['library'] });
    void client.invalidateQueries({ queryKey: ['summary'] });
    void client.invalidateQueries({ queryKey: ['progression'] });
    void client.invalidateQueries({ queryKey: ['goals'] });
  }
  const add = useMutation({
    mutationFn: () =>
      api<LibraryEntry>(`/library/entries/${entry.id}/viewings`, {
        method: 'POST',
        body: jsonBody({ watchedOn }),
      }),
    onSuccess: (updated) => {
      applied(updated);
      toast.success(t('Sessão registrada'));
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (viewingId: string) =>
      api<LibraryEntry>(`/library/entries/${entry.id}/viewings/${viewingId}`, {
        method: 'DELETE',
      }),
    onSuccess: applied,
    onError: (error) => toast.error(error.message),
  });
  if (!initial) return null;
  return (
    <section className="viewing-history" aria-label={t('Sessões assistidas')}>
      <div className="viewing-heading">
        <h3>{t('Sessões')}</h3>
        <span className="muted">
          {total
            ? `Assistido ${total === 1 ? '1 vez' : `${total} vezes`}`
            : t('Ainda não assistido')}
        </span>
      </div>
      <form
        className="viewing-form"
        onSubmit={(event) => {
          event.preventDefault();
          add.mutate();
        }}
      >
        <Input
          type="date"
          aria-label={t('Data da sessão')}
          required
          min="1900-01-01"
          max={format(new Date(), 'yyyy-MM-dd')}
          value={watchedOn}
          onChange={(event) => setWatchedOn(event.target.value)}
        />
        <Button type="submit" variant="outline" disabled={add.isPending}>
          {add.isPending ? <LoaderCircle className="spin" size={14} /> : <CalendarPlus size={14} />}
          {t('Registrar sessão')}
        </Button>
      </form>
      {viewings.length > 0 && (
        <ul className="viewing-list">
          {viewings.map((viewing) => (
            <li key={viewing.id}>
              {formatDate(viewing.watchedOn)}
              <button
                type="button"
                className="viewing-remove"
                aria-label={t('Remover sessão de {formatDate}', {
                  formatDate: formatDate(viewing.watchedOn),
                })}
                disabled={remove.isPending}
                onClick={() => remove.mutate(viewing.id)}
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {total > viewings.length && (
        <small className="muted">
          {t('Exibindo as')} {viewings.length} {t('sessões mais recentes.')}
        </small>
      )}
    </section>
  );
}
