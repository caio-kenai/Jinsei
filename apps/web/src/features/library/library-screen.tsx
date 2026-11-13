'use client';
import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import {
  Gamepad2,
  Library,
  Heart,
  Plus,
  List,
  LayoutGrid,
  SlidersHorizontal,
  Columns3,
  ArrowDownUp,
  Search,
  ChevronLeft,
  ChevronRight,
  Save,
  LoaderCircle,
  Layers,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  categoryLabels,
  statusKeys,
  statusLabels,
  defaultViewConfig,
  type EntryPatchInput,
  type LibraryResponse,
  type MediaType,
  type SavedViewConfig,
} from '@jinsei/contracts';
import { api, jsonBody } from '@/lib/api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { LibraryTable, columnLabels } from './library-table';
import { useEntryMutation } from './use-library';
import { AddEntryDialog } from './add-entry-dialog';
import { EntryDetails } from './entry-details';
import { MediaCover } from './media-cover';
import { StatusBadge } from './status-badge';

type Props = {
  mediaType?: MediaType;
  favorites?: boolean;
  initialQuery?: string;
  initialEntry?: string;
};
export function LibraryScreen(props: Props) {
  const result = useQuery({
    queryKey: ['saved-view', props.mediaType ?? 'games'],
    queryFn: () =>
      api<{ config: SavedViewConfig | null }>(
        `/saved-views?mediaType=${props.mediaType ?? 'games'}`,
      ),
  });
  if (result.isPending)
    return (
      <div className="empty-state">
        <LoaderCircle className="spin" size={22} />
      </div>
    );
  if (result.error)
    return (
      <div className="empty-state">
        <p>{result.error.message}</p>
        <Button onClick={() => void result.refetch()}>Tentar novamente</Button>
      </div>
    );
  return (
    <LibraryWorkspace
      key={`${props.mediaType ?? 'all'}:${props.favorites ?? false}:${props.initialQuery ?? ''}`}
      {...props}
      initialConfig={result.data.config ?? defaultViewConfig}
    />
  );
}
function LibraryWorkspace({
  mediaType,
  favorites,
  initialQuery,
  initialEntry,
  initialConfig,
}: Props & { initialConfig: SavedViewConfig }) {
  const [config, setConfig] = useState<SavedViewConfig>({
    ...initialConfig,
    filters: { ...initialConfig.filters, ...(initialQuery ? { q: initialQuery } : {}) },
  });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(initialEntry ?? null);
  const debounced = useDebouncedValue(config.filters.q);
  const patch = useEntryMutation();
  const save = useMutation({
    mutationFn: (value: SavedViewConfig) =>
      api('/saved-views', {
        method: 'PUT',
        body: jsonBody({ mediaType: mediaType ?? 'games', config: value }),
      }),
    onError: (error) => toast.error(error.message),
  });
  const parameters = new URLSearchParams({
    q: debounced,
    page: String(page),
    limit: '50',
    sort: config.sort,
    order: config.order,
  });
  if (mediaType) parameters.set('mediaType', mediaType);
  if (config.filters.status) parameters.set('status', config.filters.status);
  if (favorites || config.filters.favorite) parameters.set('favorite', 'true');
  const query = parameters.toString();
  const result = useQuery({
    queryKey: ['library', query],
    queryFn: () => api<LibraryResponse>(`/library/entries?${query}`),
    placeholderData: keepPreviousData,
  });
  const label = favorites
    ? 'Favoritos'
    : mediaType
      ? categoryLabels[mediaType]
      : 'Minha biblioteca';
  const Icon = favorites ? Heart : mediaType === 'games' ? Gamepad2 : Library;
  function filters(next: SavedViewConfig['filters']) {
    setConfig({ ...config, filters: next });
    setPage(1);
    setSelected({});
  }
  function layout(next: SavedViewConfig['layout']) {
    const value = { ...config, layout: next };
    setConfig(value);
    save.mutate(value);
  }
  function onPatch(id: string, changes: EntryPatchInput) {
    patch.mutate({ id, changes });
  }
  const selectedIds = Object.entries(selected)
    .filter(([, checked]) => checked)
    .map(([id]) => id);
  return (
    <>
      <header className="context-header">
        <div className="context-title">
          <span className="context-icon">
            <Icon size={17} />
          </span>
          <div>
            <h1>{label}</h1>
            <div className="breadcrumb">
              Meu espaço
              <ChevronRight size={10} />
              {label}
            </div>
          </div>
        </div>
        <div className="context-actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              save.mutate(config, { onSuccess: () => toast.success('Visualização salva') });
            }}
            disabled={save.isPending}
          >
            <Save size={13} />
            Salvar visualização
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} />
            Adicionar título
          </Button>
        </div>
      </header>
      <div className="view-tabs" role="tablist" aria-label="Visualização da biblioteca">
        <button
          role="tab"
          aria-selected={config.layout === 'list'}
          className={`view-tab ${config.layout === 'list' ? 'active' : ''}`}
          onClick={() => layout('list')}
        >
          <List size={14} />
          Lista
        </button>
        <button
          role="tab"
          aria-selected={config.layout === 'gallery'}
          className={`view-tab ${config.layout === 'gallery' ? 'active' : ''}`}
          onClick={() => layout('gallery')}
        >
          <LayoutGrid size={14} />
          Galeria
        </button>
        <span className="view-count">{result.data?.total ?? 0} títulos</span>
      </div>
      <div className="toolbar">
        <div className="toolbar-group">
          <button
            className={`toolbar-button ${config.groupBy === 'status' ? 'selected' : ''}`}
            onClick={() =>
              setConfig({ ...config, groupBy: config.groupBy === 'status' ? 'none' : 'status' })
            }
          >
            <Layers size={12} />
            {config.groupBy === 'status' ? 'Grupo: Status' : 'Sem agrupamento'}
          </button>
          <button
            className={`toolbar-button ${filterOpen || config.filters.status || config.filters.favorite ? 'selected' : ''}`}
            onClick={() => setFilterOpen(!filterOpen)}
            aria-expanded={filterOpen}
          >
            <SlidersHorizontal size={12} />
            Filtros
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="toolbar-button">
                <ArrowDownUp size={12} />
                Ordenar
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
              {(
                [
                  { value: 'updatedAt', label: 'Última atualização' },
                  { value: 'title', label: 'Nome do título' },
                  { value: 'rating', label: 'Sua nota' },
                  { value: 'createdAt', label: 'Data de adição' },
                ] as const
              ).map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => setConfig({ ...config, sort: option.value })}
                >
                  {config.sort === option.value ? '✓ ' : ''}
                  {option.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onSelect={() =>
                  setConfig({ ...config, order: config.order === 'asc' ? 'desc' : 'asc' })
                }
              >
                {config.order === 'asc' ? 'Crescente ↑' : 'Decrescente ↓'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {selectedIds.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="toolbar-button selected">
                  {selectedIds.length} selecionados
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Alterar status em lote</DropdownMenuLabel>
                {statusKeys.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onSelect={async () => {
                      for (const id of selectedIds)
                        await patch.mutateAsync({ id, changes: { status } });
                      setSelected({});
                    }}
                  >
                    {statusLabels[status]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="toolbar-group">
          {result.isFetching && <LoaderCircle className="spin muted" size={12} />}
          <div className="library-search">
            <Search size={12} />
            <input
              aria-label="Filtrar títulos da biblioteca"
              value={config.filters.q}
              onChange={(event) => filters({ ...config.filters, q: event.target.value })}
              placeholder="Buscar nesta biblioteca…"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="toolbar-button">
                <Columns3 size={12} />
                Colunas
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
              {Object.entries(columnLabels).map(([key, value]) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  disabled={key === 'title'}
                  checked={config.columns.includes(key as SavedViewConfig['columns'][number])}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      columns: checked
                        ? [...config.columns, key as SavedViewConfig['columns'][number]]
                        : config.columns.filter((column) => column !== key),
                    })
                  }
                >
                  {value}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuLabel>Densidade</DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={() =>
                  setConfig({
                    ...config,
                    density: config.density === 'compact' ? 'comfortable' : 'compact',
                  })
                }
              >
                {config.density === 'compact' ? 'Confortável' : 'Compacta'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {filterOpen && (
        <div className="filter-panel">
          <label className="field">
            Status
            <Select
              value={config.filters.status ?? ''}
              onChange={(event) =>
                filters({
                  ...config.filters,
                  status: (event.target.value || undefined) as SavedViewConfig['filters']['status'],
                })
              }
            >
              <option value="">Todos os status</option>
              {statusKeys.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </Select>
          </label>
          {!favorites && (
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={Boolean(config.filters.favorite)}
                onChange={(event) =>
                  filters({ ...config.filters, favorite: event.target.checked || undefined })
                }
              />
              Somente favoritos
            </label>
          )}
          <Button variant="ghost" size="sm" onClick={() => filters({ q: '' })}>
            Limpar filtros
          </Button>
        </div>
      )}
      <div className="library-scroll" data-density={config.density}>
        {result.error ? (
          <div className="empty-state">
            <h2>Não foi possível carregar sua biblioteca</h2>
            <p>{result.error.message}</p>
            <Button onClick={() => void result.refetch()}>Tentar novamente</Button>
          </div>
        ) : result.isPending ? (
          <div className="empty-state">
            <LoaderCircle className="spin" />
          </div>
        ) : result.data.items.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">
              <Icon size={25} />
            </span>
            <h2>
              {config.filters.q || config.filters.status
                ? 'Nenhum título por aqui'
                : favorites
                  ? 'Suas experiências favoritas'
                  : 'Toda jornada tem um começo'}
            </h2>
            <p>
              {config.filters.q || config.filters.status
                ? 'Tente outros filtros para encontrar o que procura.'
                : favorites
                  ? 'Marque o coração nas suas obras favoritas para reuni-las aqui.'
                  : 'Adicione o que você está vivendo agora ou guarde uma história para depois.'}
            </p>
            <Button variant="outline" onClick={() => setAddOpen(true)}>
              <Plus size={14} />
              Adicionar meu primeiro título
            </Button>
          </div>
        ) : config.layout === 'list' ? (
          <LibraryTable
            entries={result.data.items}
            config={config}
            selected={selected}
            onSelection={setSelected}
            onOpen={setDetailId}
            onPatch={onPatch}
          />
        ) : (
          <div className="gallery">
            {result.data.items.map((entry) => (
              <article className="gallery-card" data-media-type={entry.mediaType} key={entry.id}>
                <button
                  className="gallery-cover-button"
                  onClick={() => setDetailId(entry.id)}
                  aria-label={`Abrir ${entry.title}`}
                >
                  <MediaCover
                    title={entry.title}
                    url={entry.coverUrl}
                    layout={entry.coverAttribution?.layout}
                    large
                  />
                </button>
                <button
                  className={`favorite-button gallery-favorite ${entry.favorite ? 'is-favorite' : ''}`}
                  aria-label={`Favoritar ${entry.title}`}
                  aria-pressed={entry.favorite}
                  onClick={() => onPatch(entry.id, { favorite: !entry.favorite })}
                >
                  <Heart size={13} fill={entry.favorite ? 'currentColor' : 'none'} />
                </button>
                <h3>{entry.title}</h3>
                <div className="gallery-card-footer">
                  <StatusBadge status={entry.status} />
                  {entry.rating !== null && (
                    <span className="rating" style={{ fontSize: 10 }}>
                      <Star size={10} />
                      {entry.rating.toLocaleString('pt-BR')}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <footer className="pagination">
        <span>
          {result.data?.total ?? 0} títulos · {config.layout === 'list' ? 'Lista' : 'Galeria'}
          {save.isPending ? ' · Salvando visualização…' : ''}
        </span>
        <div className="pagination-actions">
          <span>
            Página {page} de {result.data?.pages ?? 1}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Página anterior"
            disabled={page === 1 || result.isFetching}
            onClick={() => {
              setPage(page - 1);
              setSelected({});
            }}
          >
            <ChevronLeft size={15} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Próxima página"
            disabled={page >= (result.data?.pages ?? 1) || result.isFetching}
            onClick={() => {
              setPage(page + 1);
              setSelected({});
            }}
          >
            <ChevronRight size={15} />
          </Button>
        </div>
      </footer>
      <AddEntryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mediaType={mediaType}
        onAdded={(entry) => setDetailId(entry.id)}
      />
      {detailId && <EntryDetails id={detailId} onClose={() => setDetailId(null)} />}
    </>
  );
}
