'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Library,
  Heart,
  Plus,
  SlidersHorizontal,
  Columns3,
  ArrowDownUp,
  Search,
  ChevronLeft,
  ChevronRight,
  Save,
  LoaderCircle,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  categoryLabels,
  statusKeys,
  statusLabels,
  defaultViewConfig,
  layoutLabels,
  type EntryPatchInput,
  type LibraryResponse,
  type MediaType,
  type SavedView,
  type SavedViewConfig,
  type ViewScope,
} from '@jinsei/contracts';
import { api, jsonBody } from '@/lib/api';
import { categoryIcons } from '@/components/shared/category-icons';
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
import { StarRating } from '@/components/shared/star-rating';
import { ViewTabs, type Layout } from './view-tabs';
import { LibraryBoard } from './library-board';

type Props = {
  mediaType?: MediaType;
  favorites?: boolean;
  initialQuery?: string;
  initialEntry?: string;
};
const defaultViews = (scope: ViewScope): SavedView[] =>
  (['list', 'gallery'] as const).map((layout, position) => ({
    id: `default:${layout}`,
    scope,
    name: layoutLabels[layout],
    position,
    config: { ...defaultViewConfig, layout },
  }));
const isSaved = (view: SavedView) => !view.id.startsWith('default:');
// The last active view is a light per-browser convenience; the views themselves live in the API.
const rememberedView = (scope: ViewScope) => {
  try {
    return window.localStorage.getItem(`jinsei:view:${scope}`);
  } catch {
    return null;
  }
};
const rememberView = (scope: ViewScope, id: string) => {
  try {
    window.localStorage.setItem(`jinsei:view:${scope}`, id);
  } catch {
    // Storage may be unavailable; the first view is used instead.
  }
};
function uniqueName(views: SavedView[], base: string) {
  const names = new Set(views.filter(isSaved).map((view) => view.name.toLowerCase()));
  if (!names.has(base.toLowerCase())) return base;
  let index = 2;
  while (names.has(`${base} ${index}`.toLowerCase())) index += 1;
  return `${base} ${index}`;
}

export function LibraryScreen(props: Props) {
  const scope: ViewScope = props.favorites ? 'favorites' : (props.mediaType ?? 'library');
  const result = useQuery({
    queryKey: ['saved-views', scope],
    queryFn: () => api<{ views: SavedView[] }>(`/saved-views?scope=${scope}`),
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
      key={`${props.mediaType ?? 'all'}:${props.favorites ?? false}:${props.initialQuery ?? ''}:${props.initialEntry ?? ''}`}
      {...props}
      scope={scope}
      initialViews={result.data.views.length ? result.data.views : defaultViews(scope)}
    />
  );
}
function LibraryWorkspace({
  mediaType,
  favorites,
  initialQuery,
  initialEntry,
  scope,
  initialViews,
}: Props & { scope: ViewScope; initialViews: SavedView[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const client = useQueryClient();
  const [views, setViews] = useState(initialViews);
  const [activeId, setActiveId] = useState(() => {
    const remembered = rememberedView(scope);
    return initialViews.find((view) => view.id === remembered)?.id ?? initialViews[0].id;
  });
  const active = views.find((view) => view.id === activeId) ?? views[0];
  const [config, setConfig] = useState<SavedViewConfig>({
    ...active.config,
    filters: { ...active.config.filters, ...(initialQuery ? { q: initialQuery } : {}) },
  });
  const dirty = JSON.stringify(config) !== JSON.stringify(active.config);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(initialEntry ?? null);
  const debounced = useDebouncedValue(config.filters.q);
  const patch = useEntryMutation();
  function replaceViews(next: SavedView[]) {
    const list = next.length ? next : initialViews.filter((view) => !isSaved(view));
    setViews(list.length ? list : [active]);
    void client.invalidateQueries({ queryKey: ['saved-views', scope] });
  }
  function activate(view: SavedView) {
    setActiveId(view.id);
    setConfig({ ...view.config, filters: { ...view.config.filters } });
    setPage(1);
    setSelected({});
    if (isSaved(view)) rememberView(scope, view.id);
  }
  const save = useMutation({
    mutationFn: (value: SavedViewConfig) =>
      isSaved(active)
        ? api<SavedView>(`/saved-views/${active.id}`, {
            method: 'PATCH',
            body: jsonBody({ config: value }),
          })
        : api<SavedView>('/saved-views', {
            method: 'POST',
            body: jsonBody({ scope, name: uniqueName(views, active.name), config: value }),
          }),
    onSuccess: (saved) => {
      replaceViews(views.map((view) => (view.id === active.id ? saved : view)));
      setActiveId(saved.id);
      rememberView(scope, saved.id);
      toast.success('Visualização salva');
    },
    onError: (error) => toast.error(error.message),
  });
  const create = useMutation({
    mutationFn: (input: { name: string; config: SavedViewConfig }) =>
      api<SavedView>('/saved-views', { method: 'POST', body: jsonBody({ scope, ...input }) }),
    onSuccess: (created) => {
      replaceViews([...views.filter(isSaved), created]);
      activate(created);
    },
    onError: (error) => toast.error(error.message),
  });
  const rename = useMutation({
    mutationFn: ({ view, name }: { view: SavedView; name: string }) =>
      isSaved(view)
        ? api<SavedView>(`/saved-views/${view.id}`, { method: 'PATCH', body: jsonBody({ name }) })
        : api<SavedView>('/saved-views', {
            method: 'POST',
            body: jsonBody({ scope, name, config }),
          }),
    onSuccess: (saved, { view }) => {
      replaceViews(views.map((item) => (item.id === view.id ? saved : item)));
      if (view.id === activeId) {
        setActiveId(saved.id);
        rememberView(scope, saved.id);
      }
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (view: SavedView) =>
      isSaved(view)
        ? api(`/saved-views/${view.id}`, { method: 'DELETE' })
        : Promise.resolve({ deleted: true }),
    onSuccess: (_result, view) => {
      const remaining = views.filter((item) => item.id !== view.id);
      const next = remaining.length ? remaining : defaultViews(scope);
      setViews(next);
      void client.invalidateQueries({ queryKey: ['saved-views', scope] });
      if (view.id === activeId) activate(next[0]);
      toast.success('Visualização excluída');
    },
    onError: (error) => toast.error(error.message),
  });
  const board = config.layout === 'board';
  // The board keeps its own manual order and shows up to 100 titles per page.
  const parameters = new URLSearchParams({
    q: debounced,
    page: String(page),
    limit: board ? '100' : '50',
    sort: board ? 'boardRank' : config.sort,
    order: board ? 'asc' : config.order,
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
  const Icon = favorites ? Heart : mediaType ? categoryIcons[mediaType] : Library;
  function filters(next: SavedViewConfig['filters']) {
    setConfig({ ...config, filters: next });
    setPage(1);
    setSelected({});
  }
  function layout(next: Layout) {
    setConfig({ ...config, layout: next });
  }
  function onPatch(id: string, changes: EntryPatchInput) {
    patch.mutate({ id, changes });
  }
  const selectedIds = Object.entries(selected)
    .filter(([, checked]) => checked)
    .map(([id]) => id);
  function closeDetails() {
    setDetailId(null);
    if (initialEntry) {
      const parameters = new URLSearchParams(window.location.search);
      parameters.delete('entry');
      router.replace(pathname + (parameters.size ? `?${parameters}` : ''), { scroll: false });
    }
  }
  return (
    <>
      <header className="context-header">
        <div className="context-title">
          <span className="context-icon" data-media-type={mediaType}>
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
            onClick={() => save.mutate(config)}
            disabled={save.isPending}
            className={dirty ? 'has-changes' : undefined}
          >
            <Save size={13} />
            {dirty ? 'Salvar alterações' : 'Salvar visualização'}
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} />
            Adicionar título
          </Button>
        </div>
      </header>
      <ViewTabs
        views={views}
        activeId={active.id}
        activeLayout={config.layout}
        count={result.data?.total ?? 0}
        onActivate={activate}
        onLayout={layout}
        onCreate={(next) =>
          create.mutate({
            name: uniqueName(views, layoutLabels[next]),
            config: { ...config, layout: next },
          })
        }
        onDuplicate={(view) =>
          create.mutate({
            name: uniqueName(views, `${view.name} (cópia)`.slice(0, 40)),
            config: view.id === active.id ? config : view.config,
          })
        }
        onRename={(view, name) => rename.mutate({ view, name })}
        onDelete={(view) => remove.mutate(view)}
      />
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
        ) : board ? (
          <LibraryBoard entries={result.data.items} onOpen={setDetailId} onPatch={onPatch} />
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
                  {entry.rating !== null && <StarRating value={entry.rating} size={11} />}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <footer className="pagination">
        <span>
          {result.data?.total ?? 0} títulos · {active.name}
          {save.isPending ? ' · Salvando visualização…' : dirty ? ' · Alterações não salvas' : ''}
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
      {detailId && <EntryDetails id={detailId} onClose={closeDetails} />}
    </>
  );
}
