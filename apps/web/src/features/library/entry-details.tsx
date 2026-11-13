'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle, Heart, LockKeyhole, Trash2, Save } from 'lucide-react';
import {
  entryPatchSchema,
  statusKeys,
  statusLabels,
  type LibraryEntry,
  type EntryPatchInput,
} from '@jinsei/contracts';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MediaCover } from './media-cover';
import { useEntryMutation } from './use-library';
import { StarRatingInput } from '@/components/shared/star-rating';

export function EntryDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const result = useQuery({
    queryKey: ['entry', id],
    queryFn: () => api<LibraryEntry>(`/library/entries/${id}`),
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="details-drawer">
        <DialogTitle className="sr-only">Detalhes do título</DialogTitle>
        <DialogDescription className="sr-only">
          Edite seu progresso e seus registros privados
        </DialogDescription>
        {result.isPending ? (
          <div className="empty-state">
            <LoaderCircle className="spin" />
          </div>
        ) : result.error ? (
          <div className="error-banner">{result.error.message}</div>
        ) : (
          result.data && (
            <EntryForm
              key={`${result.data.id}:${result.data.updatedAt}`}
              entry={result.data}
              onClose={onClose}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
function EntryForm({ entry, onClose }: { entry: LibraryEntry; onClose: () => void }) {
  const [tags, setTags] = useState(entry.tags.join(', '));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = useEntryMutation();
  const client = useQueryClient();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EntryPatchInput>({
    resolver: zodResolver(entryPatchSchema),
    defaultValues: {
      status: entry.status,
      rating: entry.rating,
      favorite: entry.favorite,
      notes: entry.notes,
      progress: entry.progress,
    },
  });
  const remove = useMutation({
    mutationFn: () => api(`/library/entries/${entry.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['library'] });
      void client.invalidateQueries({ queryKey: ['summary'] });
      toast.success('Título removido da biblioteca');
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <>
      <div className="details-breadcrumb">
        Minha biblioteca <span>/</span> {entry.title}
      </div>
      <div className="details-layout">
        <section className="details-primary">
          <div className="details-heading">
            <div>
              <h2>{entry.title}</h2>
              <p>
                {[entry.releaseYear, entry.platforms.slice(0, 2).join(', ')]
                  .filter(Boolean)
                  .join(' · ') || 'Sua experiência, do seu jeito'}
              </p>
            </div>
          </div>
          <form
            onSubmit={handleSubmit((values) =>
              update.mutate(
                {
                  id: entry.id,
                  changes: {
                    ...values,
                    tags: tags
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean),
                  },
                },
                { onSuccess: () => toast.success('Alterações salvas') },
              ),
            )}
            className="dialog-form"
          >
            <div className="form-grid">
              <label className="field">
                Status
                <Select aria-label="Status" {...register('status')}>
                  {statusKeys.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="field">
                <span>Sua nota</span>
                <Controller
                  name="rating"
                  control={control}
                  render={({ field }) => (
                    <StarRatingInput value={field.value ?? null} onChange={field.onChange} />
                  )}
                />
              </div>
            </div>
            {entry.mediaType === 'games' && (
              <div className="form-grid">
                <label className="field">
                  Horas jogadas
                  <Input
                    type="number"
                    min={0}
                    max={100000}
                    step="0.5"
                    {...register('progress.hoursPlayed', { valueAsNumber: true })}
                  />
                </label>
                <label className="field">
                  Conclusão (%)
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    {...register('progress.completion', { valueAsNumber: true })}
                  />
                </label>
              </div>
            )}
            <label className="checkbox-field">
              <input type="checkbox" {...register('favorite')} />
              <Heart size={14} />
              Marcar como favorito
            </label>
            <label className="field">
              Tags
              <Input
                value={tags}
                aria-label="Tags"
                onChange={(event) => setTags(event.target.value)}
                placeholder="Indie, Relaxante, Com amigos…"
              />
              <small>Separe por vírgulas. Até 8 tags de 24 caracteres.</small>
            </label>
            <label className="field">
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <LockKeyhole size={13} />
                Anotações privadas
              </span>
              <Textarea
                {...register('notes')}
                rows={5}
                maxLength={10000}
                placeholder="O que você quer lembrar desta experiência?"
              />
              <small>Visíveis somente para você.</small>
            </label>
            {Object.keys(errors).length > 0 && (
              <div role="alert" className="error-banner">
                Revise a nota e os limites de progresso informados.
              </div>
            )}
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />}
              Salvar alterações
            </Button>
          </form>
        </section>
        <aside className="details-metadata">
          <MediaCover
            title={entry.title}
            url={entry.coverUrl}
            layout={entry.coverAttribution?.layout}
            large
          />
          {entry.description && (
            <section className="details-section">
              <h3>SOBRE A OBRA</h3>
              <p className="detail-description">{entry.description}</p>
            </section>
          )}
          <p className="attribution">
            Origem:{' '}
            {entry.attribution.url ? (
              <a href={entry.attribution.url} target="_blank" rel="noreferrer">
                {entry.attribution.label}
              </a>
            ) : (
              entry.attribution.label
            )}
            <br />
            {entry.attribution.license}
          </p>
          {entry.coverAttribution && (
            <p className="attribution">
              Capa:{' '}
              <a href={entry.coverAttribution.sourceUrl} target="_blank" rel="noreferrer">
                {entry.coverAttribution.provider}
              </a>
              {entry.coverAttribution.artist && <> · {entry.coverAttribution.artist}</>}
              <br />
              {entry.coverAttribution.licenseUrl ? (
                <a href={entry.coverAttribution.licenseUrl} target="_blank" rel="noreferrer">
                  {entry.coverAttribution.license}
                </a>
              ) : (
                entry.coverAttribution.license
              )}
            </p>
          )}
          <div className="details-section">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={13} />
              Remover da biblioteca
            </Button>
          </div>
          <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <DialogContent>
              <DialogTitle className="dialog-title">Remover da sua biblioteca?</DialogTitle>
              <DialogDescription className="dialog-description">
                Seu progresso, sua nota e suas anotações de {entry.title} serão removidos.
              </DialogDescription>
              <div className="dialog-footer">
                <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate()}
                >
                  Remover título
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </aside>
      </div>
    </>
  );
}
