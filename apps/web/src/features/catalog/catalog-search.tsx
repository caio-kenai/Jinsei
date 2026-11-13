'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, LoaderCircle, Plus, ArrowRight } from 'lucide-react';
import type { CatalogResult, MediaType } from '@jinsei/contracts';
import { api } from '@/lib/api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Input } from '@/components/ui/input';
import { MediaCover } from '@/features/library/media-cover';

export function CatalogSearch({
  mediaType,
  onSelect,
  onManual,
}: {
  mediaType: MediaType;
  onSelect: (item: CatalogResult) => void;
  onManual: (title: string) => void;
}) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), 450);
  const results = useQuery({
    queryKey: ['catalog', mediaType, debounced],
    queryFn: () =>
      api<{ items: CatalogResult[]; warnings: string[] }>(
        `/catalog/media?${new URLSearchParams({ q: debounced, mediaType })}`,
      ),
    enabled: debounced.length >= 2,
    retry: false,
  });
  return (
    <>
      <div className="catalog-search">
        <Search size={17} />
        <Input
          aria-label="Pesquisar no catálogo"
          placeholder="Pesquise um título…"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="catalog-results" aria-live="polite">
        {debounced.length < 2 ? (
          <p className="muted" style={{ padding: '25px 4px', fontSize: 12 }}>
            Digite pelo menos duas letras para encontrar sua próxima experiência.
          </p>
        ) : results.isFetching ? (
          <div className="empty-state" style={{ padding: 30 }}>
            <LoaderCircle size={20} className="spin" />
            Consultando o catálogo…
          </div>
        ) : results.error ? (
          <div className="error-banner">{results.error.message}</div>
        ) : (
          <>
            {results.data?.warnings.map((warning) => (
              <p key={warning} className="error-banner">
                {warning}
              </p>
            ))}
            {results.data?.items.map((item) => (
              <button
                type="button"
                className="catalog-result"
                key={item.id ?? `${item.provider}:${item.externalId}`}
                onClick={() => onSelect(item)}
              >
                <MediaCover
                  title={item.title}
                  url={item.coverUrl}
                  layout={item.coverAttribution?.layout}
                />
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {[
                      item.releaseYear,
                      item.platforms.slice(0, 2).join(', '),
                      item.attribution.label,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                </span>
                <ArrowRight size={16} />
              </button>
            ))}
            {results.data?.items.length === 0 && (
              <p className="muted" style={{ padding: '22px 0', fontSize: 12 }}>
                Nenhum título encontrado. Você pode fazer um cadastro pessoal.
              </p>
            )}
          </>
        )}
      </div>
      <button type="button" className="manual-link" onClick={() => onManual(query)}>
        <Plus size={15} />
        Não encontrou? Cadastrar manualmente
      </button>
      <p className="attribution">
        Créditos e origem dos metadados e das capas ficam disponíveis nos detalhes de cada obra.
      </p>
    </>
  );
}
