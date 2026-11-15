'use client';
import { msg } from '@/i18n/config';
import { useT } from '@/i18n/provider';
import { useState } from 'react';
import {
  collectionInputSchema,
  collectionVisibilities,
  collectionVisibilityLabels,
  type CollectionDetail,
  type CollectionInput,
} from '@jinsei/contracts';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

const visibilityHints = {
  private: msg('Somente você vê esta coleção.'),
  unlisted: msg('Quem tiver o link poderá vê-la quando os perfis públicos estiverem ativos.'),
  public: msg('Aparecerá no seu perfil público quando ele estiver ativo.'),
};

export function CollectionFormDialog({
  open,
  onOpenChange,
  initial,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: CollectionDetail;
  pending: boolean;
  onSubmit: (input: CollectionInput) => void;
}) {
  const t = useT();
  const [error, setError] = useState('');
  const [visibility, setVisibility] = useState(initial?.visibility ?? 'private');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={initial?.updatedAt ?? 'new'}>
        <DialogTitle className="dialog-title">
          {initial ? t('Editar coleção') : t('Nova coleção')}
        </DialogTitle>
        <DialogDescription className="dialog-description">
          {t('Reúna títulos de qualquer categoria em uma lista ou ranking pessoal.')}
        </DialogDescription>
        <form
          className="dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            const parsed = collectionInputSchema.safeParse({
              name: fields.get('name'),
              description: fields.get('description'),
              visibility,
              ranked: fields.get('ranked') === 'on',
              coverUrl: fields.get('coverUrl') ? String(fields.get('coverUrl')) : null,
            });
            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message ?? t('Revise os dados da coleção'));
              return;
            }
            setError('');
            onSubmit(parsed.data);
          }}
        >
          <label className="field">
            {t('Nome')}
            <Input
              name="name"
              required
              maxLength={80}
              autoFocus
              defaultValue={initial?.name}
              placeholder={t('Melhores jogos da minha vida')}
            />
          </label>
          <label className="field">
            {t('Descrição')}
            <Textarea
              name="description"
              maxLength={1000}
              rows={3}
              defaultValue={initial?.description}
              placeholder={t('O que une estes títulos? (opcional)')}
            />
          </label>
          <div className="form-grid">
            <label className="field">
              {t('Visibilidade')}
              <Select
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as typeof visibility)}
              >
                {collectionVisibilities.map((value) => (
                  <option key={value} value={value}>
                    {t(collectionVisibilityLabels[value])}
                  </option>
                ))}
              </Select>
              <small>{t(visibilityHints[visibility])}</small>
            </label>
            <label className="field">
              {t('URL da capa')}
              <Input
                name="coverUrl"
                inputMode="url"
                maxLength={2000}
                defaultValue={initial?.coverUrl ?? ''}
                placeholder={t('Opcional · https://…')}
              />
              <small>{t('Sem capa, a coleção mostra os primeiros títulos.')}</small>
            </label>
          </div>
          <label className="checkbox-field">
            <input type="checkbox" name="ranked" defaultChecked={initial?.ranked} />
            {t('Ranking numerado (a ordem dos títulos indica a posição)')}
          </label>
          {error && (
            <p className="error-banner" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-footer">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('Cancelar')}
            </Button>
            <Button type="submit" disabled={pending}>
              {initial ? t('Salvar coleção') : t('Criar coleção')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
