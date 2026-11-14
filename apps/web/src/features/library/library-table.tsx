'use client';
import { Fragment } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from '@tanstack/react-table';
import { ChevronDown, Heart } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  statusKeys,
  statusLabels,
  type LibraryEntry,
  type EntryPatchInput,
  type SavedViewConfig,
  type StatusKey,
} from '@jinsei/contracts';
import { MediaCover } from './media-cover';
import { StatusBadge } from './status-badge';
import { RatingPicker } from '@/components/shared/star-rating';
import { ProgressCell } from './progress-cell';

export const columnLabels = {
  title: 'Nome',
  status: 'Status',
  rating: 'Nota',
  progress: 'Progresso',
  platforms: 'Plataforma',
  tags: 'Tags',
  updatedAt: 'Atualizado',
};
export function LibraryTable({
  entries,
  config,
  selected,
  onSelection,
  onOpen,
  onPatch,
}: {
  entries: LibraryEntry[];
  config: SavedViewConfig;
  selected: RowSelectionState;
  onSelection: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  onOpen: (id: string) => void;
  onPatch: (id: string, changes: EntryPatchInput) => void;
}) {
  const columns: ColumnDef<LibraryEntry>[] = [
    {
      id: 'select',
      size: 32,
      header: ({ table }) => (
        <input
          type="checkbox"
          className="row-check"
          aria-label="Selecionar títulos desta página"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="row-check"
          aria-label={`Selecionar ${row.original.title}`}
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    },
    ...config.columns.map((key): ColumnDef<LibraryEntry> => ({
      id: key,
      header: columnLabels[key],
      size: key === 'title' ? 300 : key === 'rating' ? 110 : key === 'progress' ? 175 : 125,
      cell: ({ row }) => {
        const item = row.original;
        if (key === 'title')
          return (
            <div className="title-cell">
              <MediaCover
                title={item.title}
                url={item.coverUrl}
                layout={item.coverAttribution?.layout}
              />
              <button className="title-open" onClick={() => onOpen(item.id)}>
                {item.title}
              </button>
              <button
                className={`favorite-button ${item.favorite ? 'is-favorite' : ''}`}
                aria-label={`Favoritar ${item.title}`}
                aria-pressed={item.favorite}
                onClick={() => onPatch(item.id, { favorite: !item.favorite })}
              >
                <Heart size={12} fill={item.favorite ? 'currentColor' : 'none'} />
              </button>
            </div>
          );
        if (key === 'status')
          return (
            <select
              aria-label={`Status de ${item.title}`}
              value={item.status}
              className={`inline-control status-badge status-${item.status}`}
              onChange={(event) => onPatch(item.id, { status: event.target.value as StatusKey })}
            >
              {statusKeys.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          );
        if (key === 'rating')
          return (
            <RatingPicker
              value={item.rating}
              label={`Nota de ${item.title}`}
              onChange={(rating) => onPatch(item.id, { rating })}
            />
          );
        if (key === 'progress')
          return <ProgressCell entry={item} onOpen={onOpen} onPatch={onPatch} />;
        if (key === 'platforms')
          return (
            <span className="muted" title={item.platforms.join(', ')}>
              {item.platforms.slice(0, 2).join(', ') || '—'}
            </span>
          );
        if (key === 'tags')
          return (
            <>
              {item.tags.slice(0, 2).map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
              {item.tags.length > 2 && <span className="muted">+{item.tags.length - 2}</span>}
            </>
          );
        return (
          <span className="muted">
            {formatDistanceToNowStrict(new Date(item.updatedAt), { addSuffix: true, locale: ptBR })}
          </span>
        );
      },
    })),
  ];
  const table = useReactTable({
    data: entries,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    state: { rowSelection: selected },
    onRowSelectionChange: onSelection,
    enableRowSelection: true,
  });
  const rows = table.getRowModel().rows;
  const groups =
    config.groupBy === 'status'
      ? (['in_progress', 'planned', 'paused', 'completed', 'dropped'] as const)
          .map((status) => ({ status, rows: rows.filter((row) => row.original.status === status) }))
          .filter((group) => group.rows.length)
      : [{ status: null, rows }];
  return (
    <table className="library-table">
      <colgroup>
        {table.getAllColumns().map((column) => (
          <col key={column.id} style={{ width: column.getSize() }} />
        ))}
      </colgroup>
      <thead>
        {table.getHeaderGroups().map((group) => (
          <tr key={group.id}>
            {group.headers.map((header) => (
              <th key={header.id} scope="col">
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {groups.map((group) => (
          <Fragment key={group.status ?? 'all'}>
            {group.status && (
              <tr className="group-row">
                <td colSpan={columns.length}>
                  <div className="group-label">
                    <ChevronDown size={13} />
                    <StatusBadge status={group.status} />
                    <span className="group-number">{group.rows.length}</span>
                  </div>
                </td>
              </tr>
            )}
            {group.rows.map((row) => (
              <tr key={row.id} data-selected={row.getIsSelected()}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
