'use client';
import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
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

type DropTarget = { status: StatusKey; index: number };
type CardData = { status: StatusKey; index: number };

const columnId = (status: StatusKey) => `column:${status}`;

function dropTarget(event: DragOverEvent | DragEndEvent): DropTarget | null {
  const { over, active } = event;
  if (!over) return null;
  const column = over.data.current as { column?: StatusKey; size?: number } | undefined;
  if (column?.column) return { status: column.column, index: column.size ?? 0 };
  const card = over.data.current as CardData | undefined;
  if (!card) return null;
  const moving = active.rect.current.translated;
  const below = moving
    ? moving.top + moving.height / 2 > over.rect.top + over.rect.height / 2
    : false;
  return { status: card.status, index: card.index + (below ? 1 : 0) };
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
  const [target, setTarget] = useState<DropTarget | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const columns = boardColumns.map((status) => ({
    status,
    items: entries.filter((entry) => entry.status === status).sort(byRank),
  }));
  const titleOf = (id: string | number) =>
    entries.find((entry) => entry.id === id)?.title ?? 'Título';
  const announcements: Announcements = {
    onDragStart: ({ active }) => `${titleOf(active.id)} selecionado.`,
    onDragOver: ({ active, over }) =>
      over ? `${titleOf(active.id)} sobre ${describe(over.id)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over ? `${titleOf(active.id)} movido para ${describe(over.id)}.` : 'Movimento cancelado.',
    onDragCancel: ({ active }) => `Movimento de ${titleOf(active.id)} cancelado.`,
  };
  function describe(id: string | number) {
    const key = String(id);
    if (key.startsWith('column:')) return statusLabels[key.slice(7) as StatusKey];
    const entry = entries.find((item) => item.id === key);
    return entry ? `${entry.title}, em ${statusLabels[entry.status]}` : key;
  }
  function move(id: string, status: StatusKey, index: number) {
    const entry = entries.find((item) => item.id === id);
    if (!entry) return;
    const original = columns.find((item) => item.status === status)!.items;
    const from = original.findIndex((item) => item.id === id);
    const column = original.filter((item) => item.id !== id);
    const position = from !== -1 && from < index ? index - 1 : index;
    const boardRank = rankAt(column, Math.min(position, column.length));
    if (entry.status === status && entry.boardRank === boardRank) return;
    onPatch(id, entry.status === status ? { boardRank } : { status, boardRank });
  }
  function reset() {
    setDragging(null);
    setTarget(null);
  }
  const active = dragging ? entries.find((entry) => entry.id === dragging) : undefined;
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'Pressione espaço ou Enter para pegar o título, use as setas para mover e espaço para soltar. Esc cancela.',
        },
      }}
      onDragStart={({ active: item }) => setDragging(String(item.id))}
      onDragOver={(event) => setTarget(dropTarget(event))}
      onDragEnd={(event) => {
        const next = dropTarget(event);
        if (next) move(String(event.active.id), next.status, next.index);
        reset();
      }}
      onDragCancel={reset}
    >
      <div className="board" aria-label="Quadro por status">
        {columns.map(({ status, items }) => (
          <BoardColumn
            key={status}
            status={status}
            size={items.length}
            highlighted={target?.status === status}
          >
            {items.map((entry, index) => (
              <BoardCard
                key={entry.id}
                entry={entry}
                index={index}
                dragging={dragging === entry.id}
                dropBefore={
                  target?.status === status && target.index === index && dragging !== entry.id
                }
                onOpen={onOpen}
                onMove={(next) =>
                  move(entry.id, next, columns.find((c) => c.status === next)!.items.length)
                }
              />
            ))}
            {target?.status === status && target.index >= items.length && (
              <div className="drop-placeholder" aria-hidden="true" />
            )}
            {items.length === 0 && target?.status !== status && (
              <p className="board-empty">Arraste títulos para cá</p>
            )}
          </BoardColumn>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {active ? <CardContent entry={active} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function BoardColumn({
  status,
  size,
  highlighted,
  children,
}: {
  status: StatusKey;
  size: number;
  highlighted: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: columnId(status), data: { column: status, size } });
  return (
    <section
      ref={setNodeRef}
      className={`board-column ${highlighted ? 'drop-target' : ''}`}
      aria-label={`${statusLabels[status]}, ${size} títulos`}
    >
      <header className="board-column-header">
        <StatusBadge status={status} />
        <span className="group-number">{size}</span>
      </header>
      <div className="board-list">{children}</div>
    </section>
  );
}

function BoardCard({
  entry,
  index,
  dragging,
  dropBefore,
  onOpen,
  onMove,
}: {
  entry: LibraryEntry;
  index: number;
  dragging: boolean;
  dropBefore: boolean;
  onOpen: (id: string) => void;
  onMove: (status: StatusKey) => void;
}) {
  const data: CardData = { status: entry.status, index };
  const draggable = useDraggable({ id: entry.id, data });
  const droppable = useDroppable({ id: entry.id, data });
  return (
    <article
      ref={(node) => {
        draggable.setNodeRef(node);
        droppable.setNodeRef(node);
      }}
      className={`board-card ${dragging ? 'dragging' : ''} ${dropBefore ? 'drop-before' : ''}`}
      {...draggable.attributes}
      {...draggable.listeners}
      aria-roledescription="título arrastável"
    >
      <CardContent entry={entry} onOpen={onOpen} onMove={onMove} />
    </article>
  );
}

function CardContent({
  entry,
  overlay = false,
  onOpen,
  onMove,
}: {
  entry: LibraryEntry;
  overlay?: boolean;
  onOpen?: (id: string) => void;
  onMove?: (status: StatusKey) => void;
}) {
  const percent = progressPercent(entry);
  const content = (
    <>
      <div className="board-card-main">
        <MediaCover
          title={entry.title}
          url={entry.coverUrl}
          layout={entry.coverAttribution?.layout}
        />
        <div className="board-card-body">
          {overlay ? (
            <span className="title-open">{entry.title}</span>
          ) : (
            <button
              className="title-open"
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              onClick={() => onOpen?.(entry.id)}
            >
              {entry.title}
            </button>
          )}
          <span className="board-card-meta">{progressSummary(entry)}</span>
          {percent !== null && (
            <span className="progress-track board-progress">
              <span className="progress-fill" style={{ width: `${percent}%`, display: 'block' }} />
            </span>
          )}
        </div>
        {entry.favorite && <Heart size={12} className="board-favorite" fill="currentColor" />}
      </div>
      <div className="board-card-footer">
        {entry.rating !== null ? (
          <StarRating value={entry.rating} size={10} />
        ) : (
          <span className="muted">Sem nota</span>
        )}
        {!overlay && (
          <select
            className="inline-control board-move"
            aria-label={`Mover ${entry.title} para`}
            value={entry.status}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            onChange={(event) => onMove?.(event.target.value as StatusKey)}
          >
            {statusKeys.map((key) => (
              <option key={key} value={key}>
                {statusLabels[key]}
              </option>
            ))}
          </select>
        )}
      </div>
    </>
  );
  return overlay ? <article className="board-card board-card-overlay">{content}</article> : content;
}
