'use client';
import { useState } from 'react';
import { Heart } from 'lucide-react';
import {
  statusKeys,
  statusLabels,
  type EntryPatchInput,
  type LibraryEntry,
  type StatusKey,
} from '@jinsei/contracts';
import { StarRating } from '@/components/shared/star-rating';
import { MediaCover } from './media-cover';
import { StatusBadge } from './status-badge';
import { progressPercent, progressSummary } from './progress-format';

export const boardColumns: StatusKey[] = [
  'planned',
  'in_progress',
  'paused',
  'completed',
  'dropped',
];
const byRank = (a: LibraryEntry, b: LibraryEntry) => a.boardRank - b.boardRank;

/** Rank between the neighbours of the drop position, so only the moved card is updated. */
export function rankAt(column: LibraryEntry[], index: number) {
  const before = column[index - 1]?.boardRank;
  const after = column[index]?.boardRank;
  if (before === undefined && after === undefined) return 0;
  if (before === undefined) return after! - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}

export function LibraryBoard({
  entries,
  onOpen,
  onPatch,
}: {
  entries: LibraryEntry[];
  onOpen: (id: string) => void;
  onPatch: (id: string, changes: EntryPatchInput) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [target, setTarget] = useState<{ status: StatusKey; index: number } | null>(null);
  const columns = boardColumns.map((status) => ({
    status,
    items: entries.filter((entry) => entry.status === status).sort(byRank),
  }));
  function move(id: string, status: StatusKey, index: number) {
    const entry = entries.find((item) => item.id === id);
    if (!entry) return;
    const column = columns
      .find((item) => item.status === status)!
      .items.filter((item) => item.id !== id);
    const boardRank = rankAt(column, Math.min(index, column.length));
    if (entry.status === status && entry.boardRank === boardRank) return;
    onPatch(id, entry.status === status ? { boardRank } : { status, boardRank });
  }
  function dropIndex(event: React.DragEvent<HTMLElement>, list: HTMLElement) {
    const cards = [...list.querySelectorAll<HTMLElement>('.board-card:not(.dragging)')];
    const position = cards.findIndex((card) => {
      const box = card.getBoundingClientRect();
      return event.clientY < box.top + box.height / 2;
    });
    return position === -1 ? cards.length : position;
  }
  return (
    <div className="board" aria-label="Quadro por status">
      {columns.map(({ status, items }) => (
        <section
          key={status}
          className={`board-column ${target?.status === status ? 'drop-target' : ''}`}
          aria-label={`${statusLabels[status]}, ${items.length} títulos`}
          onDragOver={(event) => {
            if (!dragging) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            const list = event.currentTarget.querySelector<HTMLElement>('.board-list')!;
            setTarget({ status, index: dropIndex(event, list) });
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) setTarget(null);
          }}
          onDrop={(event) => {
            event.preventDefault();
            const id = event.dataTransfer.getData('text/plain') || dragging;
            if (id && target) move(id, status, target.index);
            setTarget(null);
            setDragging(null);
          }}
        >
          <header className="board-column-header">
            <StatusBadge status={status} />
            <span className="group-number">{items.length}</span>
          </header>
          <div className="board-list">
            {items.map((entry, index) => {
              const percent = progressPercent(entry);
              return (
                <article
                  key={entry.id}
                  className={`board-card ${dragging === entry.id ? 'dragging' : ''} ${
                    target?.status === status && target.index === index && dragging !== entry.id
                      ? 'drop-before'
                      : ''
                  }`}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', entry.id);
                    event.dataTransfer.effectAllowed = 'move';
                    setDragging(entry.id);
                  }}
                  onDragEnd={() => {
                    setDragging(null);
                    setTarget(null);
                  }}
                >
                  <div className="board-card-main">
                    <MediaCover
                      title={entry.title}
                      url={entry.coverUrl}
                      layout={entry.coverAttribution?.layout}
                    />
                    <div className="board-card-body">
                      <button className="title-open" onClick={() => onOpen(entry.id)}>
                        {entry.title}
                      </button>
                      <span className="board-card-meta">{progressSummary(entry)}</span>
                      {percent !== null && (
                        <span className="progress-track board-progress">
                          <span
                            className="progress-fill"
                            style={{ width: `${percent}%`, display: 'block' }}
                          />
                        </span>
                      )}
                    </div>
                    {entry.favorite && (
                      <Heart size={12} className="board-favorite" fill="currentColor" />
                    )}
                  </div>
                  <div className="board-card-footer">
                    {entry.rating !== null ? (
                      <StarRating value={entry.rating} size={10} />
                    ) : (
                      <span className="muted">Sem nota</span>
                    )}
                    <select
                      className="inline-control board-move"
                      aria-label={`Mover ${entry.title} para`}
                      value={entry.status}
                      onChange={(event) => {
                        const next = event.target.value as StatusKey;
                        move(entry.id, next, columns.find((c) => c.status === next)!.items.length);
                      }}
                    >
                      {statusKeys.map((key) => (
                        <option key={key} value={key}>
                          {statusLabels[key]}
                        </option>
                      ))}
                    </select>
                  </div>
                </article>
              );
            })}
            {target?.status === status && target.index >= items.length && (
              <div className="drop-placeholder" aria-hidden="true" />
            )}
            {items.length === 0 && target?.status !== status && (
              <p className="board-empty">Arraste títulos para cá</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
