'use client';
import { useT } from '@/i18n/provider';
import { Fragment, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ExternalLink, LoaderCircle, Heart, LockKeyhole, Trash2, Save } from 'lucide-react';
import {
  entryPatchSchema,
  statusKeys,
  statusLabels,
  type LibraryEntry,
  type EntryPatchInput,
  recommendationLabels,
  type Recommendation,
} from '@jinsei/contracts';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MediaCover } from './media-cover';
import { useEntryMutation } from './use-library';
import { StarRatingInput } from '@/components/shared/star-rating';
import { ProgressFields } from './progress-fields';
import { creditsLine, metadataFacts } from './progress-format';
import { ViewingHistory } from './viewing-history';
import { EntryCollections } from '@/features/collections/entry-collections';

export function EntryDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useT();
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
        <DialogTitle className="sr-only">{t('Detalhes do título')}</DialogTitle>
        <DialogDescription className="sr-only">
          {t('Edite seu progresso e seus registros privados')}
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
  const t = useT();
  const [tags, setTags] = useState(entry.tags.join(', '));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = useEntryMutation();
  const client = useQueryClient();
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EntryPatchInput>({
    resolver: zodResolver(entryPatchSchema),
    defaultValues: {
      status: entry.status,
      rating: entry.rating,
      favorite: entry.favorite,
      notes: entry.notes,
      progress: entry.progress.kind === 'film' ? undefined : entry.progress,
      startedOn: entry.startedOn,
      completedOn: entry.completedOn,
      review: entry.review,
      reviewPublic: entry.reviewPublic,
      recommendation: entry.recommendation,
    },
  });
  const remove = useMutation({
    mutationFn: () => api(`/library/entries/${entry.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['library'] });
      void client.invalidateQueries({ queryKey: ['summary'] });
      toast.success(t('Título removido da biblioteca'));
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <>
      <div className="details-breadcrumb">
        {t('Minha biblioteca')} <span>/</span> {entry.title}
      </div>
      <div className="details-layout">
        <section className="details-primary">
          <div className="details-heading">
            <div>
              <h2>{entry.title}</h2>
              {entry.publicWork && (
                <Link
                  className="details-public-link"
                  href={`/obras/${entry.mediaId}`}
                  target="_blank"
                >
                  {t('Ver página da obra, notas e reviews')}
                  <ExternalLink size={12} />
                </Link>
              )}
              <p>
                {[entry.releaseYear, creditsLine(entry)].filter(Boolean).join(' · ') ||
                  t('Sua experiência, do seu jeito')}
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
                { onSuccess: () => toast.success(t('Alterações salvas')) },
              ),
            )}
            className="dialog-form"
          >
            <div className="form-grid">
              <label className="field">
                {t('Status')}
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select
                      aria-label={t('Status')}
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                    >
                      {statusKeys.map((status) => (
                        <option key={status} value={status}>
                          {t(statusLabels[status])}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              </label>
              <div className="field">
                <span>{t('Sua nota')}</span>
                <Controller
                  name="rating"
                  control={control}
                  render={({ field }) => (
                    <StarRatingInput value={field.value ?? null} onChange={field.onChange} />
                  )}
                />
              </div>
            </div>
            <ProgressFields entry={entry} register={register} />
            <div className="form-grid">
              <label className="field">
                {t('Início')}
                <Input
                  type="date"
                  min="1900-01-01"
                  {...register('startedOn', { setValueAs: (value) => value || null })}
                />
              </label>
              <label className="field">
                {t('Conclusão')}
                <Input
                  type="date"
                  min="1900-01-01"
                  {...register('completedOn', { setValueAs: (value) => value || null })}
                />
              </label>
            </div>
            <label className="checkbox-field">
              <input type="checkbox" {...register('favorite')} />
              <Heart size={14} />
              {t('Marcar como favorito')}
            </label>
            <label className="field">
              {t('Tags')}
              <Input
                value={tags}
                aria-label={t('Tags')}
                onChange={(event) => setTags(event.target.value)}
                placeholder={t('Indie, Relaxante, Com amigos…')}
              />
              <small>{t('Separe por vírgulas. Até 8 tags de 24 caracteres.')}</small>
            </label>
            <label className="field">
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <LockKeyhole size={13} />
                {t('Anotações privadas')}
              </span>
              <Textarea
                {...register('notes')}
                rows={5}
                maxLength={10000}
                placeholder={t('O que você quer lembrar desta experiência?')}
              />
              <small>{t('Visíveis somente para você.')}</small>
            </label>
            <label className="field">
              {t('Resenha')}
              <Textarea
                {...register('review')}
                rows={4}
                maxLength={5000}
                placeholder={t('O que você diria a alguém sobre esta obra?')}
              />
            </label>
            <Controller
              control={control}
              name="recommendation"
              render={({ field }) => (
                <div
                  className="recommendation-picker"
                  role="radiogroup"
                  aria-label={t('Sua recomendação')}
                >
                  {(Object.keys(recommendationLabels) as Recommendation[]).map((key) => (
                    <button
                      type="button"
                      key={key}
                      role="radio"
                      aria-checked={field.value === key}
                      className={`recommendation-choice is-${key}`}
                      onClick={() => field.onChange(field.value === key ? null : key)}
                    >
                      {t(recommendationLabels[key])}
                    </button>
                  ))}
                </div>
              )}
            />
            <label className="checkbox-field">
              <input type="checkbox" {...register('reviewPublic')} />
              {t('Publicar a resenha no meu perfil e na página da obra')}
            </label>
            {Object.keys(errors).length > 0 && (
              <div role="alert" className="error-banner">
                {t('Revise a nota e os limites de progresso informados.')}
              </div>
            )}
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />}
              {t('Salvar alterações')}
            </Button>
          </form>
          <ViewingHistory entry={entry} onStatusChange={(status) => setValue('status', status)} />
        </section>
        <aside className="details-metadata">
          <MediaCover
            title={entry.title}
            url={entry.coverUrl}
            layout={entry.coverAttribution?.layout}
            large
          />
          {metadataFacts(entry).length > 0 && (
            <section className="details-section">
              <h3>{t('FICHA')}</h3>
              <dl className="metadata-facts">
                {metadataFacts(entry).map((fact) => (
                  <Fragment key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </Fragment>
                ))}
              </dl>
            </section>
          )}
          <EntryCollections entryId={entry.id} />
          {entry.description && (
            <section className="details-section">
              <h3>{t('SOBRE A OBRA')}</h3>
              <p className="detail-description">{entry.description}</p>
            </section>
          )}
          <p className="attribution">
            {t('Origem:')}{' '}
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
              {t('Capa:')}{' '}
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
              {t('Remover da biblioteca')}
            </Button>
          </div>
          <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <DialogContent>
              <DialogTitle className="dialog-title">{t('Remover da sua biblioteca?')}</DialogTitle>
              <DialogDescription className="dialog-description">
                {t('Seu progresso, sua nota e suas anotações de')} {entry.title}{' '}
                {t('serão removidos.')}
              </DialogDescription>
              <div className="dialog-footer">
                <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                  {t('Cancelar')}
                </Button>
                <Button
                  variant="destructive"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate()}
                >
                  {t('Remover título')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </aside>
      </div>
    </>
  );
}
