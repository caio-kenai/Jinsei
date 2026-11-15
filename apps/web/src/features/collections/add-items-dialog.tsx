'use client';
import { useT } from '@/i18n/provider';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, LoaderCircle, Plus, Search } from 'lucide-react';
import type { LibraryResponse } from '@jinsei/contracts';
import { api } from '@/lib/api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { MediaCover } from '@/features/library/media-cover';
import { StatusBadge } from '@/features/library/status-badge';

export function AddItemsDialog({
  open,
  onOpenChange,
  existing,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: Set<string>;
  onAdd: (entryId: string) => void;
}) {
  const t = useT();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query);
  const result = useQuery({
    queryKey: ['library', 'collection-picker', debounced],
    queryFn: () =>
      api<LibraryResponse>(
        `/library/entries?${new URLSearchParams({ q: debounced, limit: '20', sort: 'updatedAt' })}`,
      ),
    enabled: open,
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="add-dialog">
        <DialogTitle className="dialog-title">{t('Adicionar títulos')}</DialogTitle>
        <DialogDescription className="dialog-description">
          {t('Escolha títulos da sua biblioteca. Eles continuam com seus dados originais.')}
        </DialogDescription>
        <label className="library-search picker-search">
          <Search size={12} />
          <Input
            autoFocus
            aria-label={t('Buscar na biblioteca')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('Buscar na sua biblioteca…')}
          />
        </label>
        <div className="picker-list">
          {result.isPending ? (
            <LoaderCircle className="spin" />
          ) : (
            result.data?.items.map((entry) => {
              const added = existing.has(entry.id);
              return (
                <div className="picker-row" key={entry.id}>
                  <MediaCover
                    title={entry.title}
                    url={entry.coverUrl}
                    layout={entry.coverAttribution?.layout}
                  />
                  <span className="picker-title">{entry.title}</span>
                  <StatusBadge status={entry.status} />
                  <Button
                    size="sm"
                    variant={added ? 'ghost' : 'outline'}
                    disabled={added}
                    aria-label={
                      added
                        ? t('{title} já está na coleção', { title: entry.title })
                        : t('Adicionar {title}', { title: entry.title })
                    }
                    onClick={() => onAdd(entry.id)}
                  >
                    {added ? <Check size={13} /> : <Plus size={13} />}
                    {added ? t('Na coleção') : t('Adicionar')}
                  </Button>
                </div>
              );
            })
          )}
          {result.data?.items.length === 0 && (
            <p className="muted">{t('Nenhum título encontrado.')}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
