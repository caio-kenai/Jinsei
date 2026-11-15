'use client';
import { issueMessage } from '@/i18n/config';
import { useT } from '@/i18n/provider';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, LoaderCircle, ArrowLeft } from 'lucide-react';
import {
  categoryLabels,
  mediaTypes,
  statusKeys,
  statusLabels,
  entryCreateSchema,
  type CatalogResult,
  type MediaType,
  type LibraryEntry,
} from '@jinsei/contracts';
import { toast } from 'sonner';
import { api, jsonBody } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CatalogSearch } from '@/features/catalog/catalog-search';
import { MediaCover } from './media-cover';
import { StarRatingInput } from '@/components/shared/star-rating';
import { ManualMetadataFields, manualMetadataValues } from './manual-metadata-fields';

export function AddEntryDialog({
  open,
  onOpenChange,
  mediaType = 'games',
  onAdded,
  initialItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaType?: MediaType;
  onAdded?: (entry: LibraryEntry) => void;
  initialItem?: CatalogResult;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <AddEntryContent
          mediaType={mediaType}
          initialItem={initialItem}
          onDone={(entry) => {
            onOpenChange(false);
            onAdded?.(entry);
          }}
        />
      )}
    </Dialog>
  );
}
function AddEntryContent({
  mediaType: initialType,
  initialItem,
  onDone,
}: {
  mediaType: MediaType;
  initialItem?: CatalogResult;
  onDone: (entry: LibraryEntry) => void;
}) {
  const t = useT();
  const [selected, setSelected] = useState<CatalogResult | undefined>(initialItem);
  const [manual, setManual] = useState(false);
  const [title, setTitle] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [mediaType, setMediaType] = useState(initialType);
  const [error, setError] = useState('');
  const client = useQueryClient();
  const create = useMutation({
    mutationFn: (input: unknown) =>
      api<LibraryEntry>('/library/entries', { method: 'POST', body: jsonBody(input) }),
    onSuccess: (entry) => {
      void client.invalidateQueries({ queryKey: ['library'] });
      void client.invalidateQueries({ queryKey: ['summary'] });
      toast.success(t('Título adicionado à sua biblioteca'));
      onDone(entry);
    },
    onError: (error) => setError(error.message),
  });
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const fields = new FormData(event.currentTarget);
    const input = {
      ...(manual
        ? {
            media: {
              mediaType,
              title: String(fields.get('title') ?? ''),
              description: String(fields.get('description') ?? ''),
              coverUrl: fields.get('coverUrl') ? String(fields.get('coverUrl')) : null,
              releaseYear: fields.get('year') ? Number(fields.get('year')) : null,
              platforms: String(fields.get('platforms') ?? '')
                .split(',')
                .map((part) => part.trim())
                .filter(Boolean),
              ...manualMetadataValues(fields, mediaType),
            },
          }
        : selected?.id
          ? { mediaId: selected.id }
          : { source: { provider: selected?.provider, externalId: selected?.externalId } }),
      status: fields.get('status'),
      rating,
    };
    const parsed = entryCreateSchema.safeParse(input);
    if (!parsed.success) {
      setError(issueMessage(parsed.error) ?? t('Revise os dados'));
      return;
    }
    create.mutate(parsed.data);
  }
  const editing = manual || Boolean(selected);
  return (
    <DialogContent className="add-dialog">
      <DialogTitle className="dialog-title">{t('Adicionar à biblioteca')}</DialogTitle>
      <DialogDescription className="dialog-description">
        {t('Encontre uma obra ou crie um registro pessoal. A escolha é sua.')}
      </DialogDescription>
      {!editing ? (
        <>
          <label className="field">
            {t('Categoria')}
            <Select
              aria-label={t('Categoria')}
              value={mediaType}
              onChange={(event) => setMediaType(event.target.value as MediaType)}
            >
              {mediaTypes.map((type) => (
                <option key={type} value={type}>
                  {t(categoryLabels[type])}
                </option>
              ))}
            </Select>
          </label>
          <CatalogSearch
            mediaType={mediaType}
            onSelect={setSelected}
            onManual={(value) => {
              setTitle(value);
              setManual(true);
            }}
          />
        </>
      ) : (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setManual(false);
              setSelected(undefined);
            }}
          >
            <ArrowLeft size={13} />
            {t('Voltar à busca')}
          </Button>
          <form onSubmit={submit} className="dialog-form" style={{ marginTop: 14 }}>
            {manual ? (
              <>
                <label className="field">
                  {t('Nome do título')}
                  <Input
                    autoFocus
                    required
                    name="title"
                    defaultValue={title}
                    maxLength={200}
                    placeholder={t('Como se chama essa experiência?')}
                  />
                </label>
                <div className="form-grid">
                  <label className="field">
                    {t('Ano de lançamento')}
                    <Input
                      name="year"
                      type="number"
                      min={1900}
                      max={2100}
                      placeholder={t('Opcional')}
                    />
                  </label>
                  {mediaType === 'games' && (
                    <label className="field">
                      {t('Plataformas')}
                      <Input
                        name="platforms"
                        placeholder={t('PC, PlayStation, Nintendo Switch…')}
                      />
                    </label>
                  )}
                </div>
                <ManualMetadataFields mediaType={mediaType} />
                <label className="field">
                  {t('URL da capa')}
                  <Input
                    name="coverUrl"
                    type="url"
                    placeholder="https://…"
                    maxLength={2000}
                    aria-label={t('URL da capa')}
                  />
                  <small>
                    {t('Opcional. Informe uma imagem que você tenha permissão para utilizar.')}
                  </small>
                </label>
                <label className="field">
                  {t('Descrição')}
                  <Textarea
                    name="description"
                    maxLength={3000}
                    placeholder={t('Uma breve descrição (opcional)')}
                  />
                </label>
                <small className="muted">
                  {t('Este cadastro será visível somente para você.')}
                </small>
              </>
            ) : (
              selected && (
                <div className="selected-title">
                  <MediaCover title={selected.title} url={selected.coverUrl} />
                  <span>
                    <strong>{selected.title}</strong>
                    <small>
                      {selected.attribution.label} ·{' '}
                      {selected.releaseYear ?? t('Ano não informado')}
                    </small>
                  </span>
                </div>
              )
            )}
            <div className="form-grid">
              <label className="field">
                {t('Status')}
                <Select name="status" aria-label={t('Status')} defaultValue="planned">
                  {statusKeys.map((status) => (
                    <option key={status} value={status}>
                      {t(statusLabels[status])}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="field">
                <span>{t('Sua nota')}</span>
                <StarRatingInput value={rating} onChange={setRating} />
              </div>
            </div>
            {error && (
              <div role="alert" className="error-banner">
                {error}
              </div>
            )}
            <div className="dialog-footer">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? (
                  <LoaderCircle size={15} className="spin" />
                ) : (
                  <Plus size={15} />
                )}
                {t('Adicionar à biblioteca')}
              </Button>
            </div>
          </form>
        </>
      )}
    </DialogContent>
  );
}
