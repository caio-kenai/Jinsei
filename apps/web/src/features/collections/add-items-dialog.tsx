'use client';
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
        <DialogTitle className="dialog-title">Adicionar títulos</DialogTitle>
        <DialogDescription className="dialog-description">
          Escolha títulos da sua biblioteca. Eles continuam com seus dados originais.
        </DialogDescription>
        <label className="library-search picker-search">
          <Search size={12} />
          <Input
            autoFocus
            aria-label="Buscar na biblioteca"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar na sua biblioteca…"
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
                      added ? `${entry.title} já está na coleção` : `Adicionar ${entry.title}`
                    }
                    onClick={() => onAdd(entry.id)}
                  >
                    {added ? <Check size={13} /> : <Plus size={13} />}
                    {added ? 'Na coleção' : 'Adicionar'}
                  </Button>
                </div>
              );
            })
          )}
          {result.data?.items.length === 0 && <p className="muted">Nenhum título encontrado.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
