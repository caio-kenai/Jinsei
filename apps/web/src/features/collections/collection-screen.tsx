'use client';
import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  FolderHeart,
  GripVertical,
  ImageUp,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { categoryLabels, collectionVisibilityLabels, type CollectionItem } from '@jinsei/contracts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { StarRating } from '@/components/shared/star-rating';
import { MediaCover } from '@/features/library/media-cover';
import { StatusBadge } from '@/features/library/status-badge';
import { EntryDetails } from '@/features/library/entry-details';
import { progressSummary } from '@/features/library/progress-format';
import { CollectionFormDialog } from './collection-form-dialog';
import { AddItemsDialog } from './add-items-dialog';
import { useCollection, useCollectionMutations } from './use-collections';
import { useInstance } from '@/features/instance/use-instance';
import { uploadImage } from '@/lib/upload';

/** Position between the neighbours of the target index, so only the moved item changes. */
function positionAt(items: CollectionItem[], index: number) {
  const before = items[index - 1]?.position;
  const after = items[index]?.position;
  if (before === undefined && after === undefined) return 1;
  if (before === undefined) return after! - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}

export function CollectionScreen({ id }: { id: string }) {
  const result = useCollection(id);
  const mutations = useCollectionMutations(id);
  const instance = useInstance();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  if (result.isPending)
    return (
      <div className="empty-state">
        <LoaderCircle className="spin" />
      </div>
    );
  if (result.error)
    return (
      <div className="empty-state">
        <h2>Coleção indisponível</h2>
        <p>{result.error.message}</p>
        <Link href="/collections">Voltar às coleções</Link>
      </div>
    );
  const collection = result.data;
  const items = collection.items;
  function move(entryId: string, index: number) {
    const others = items.filter((item) => item.entry.id !== entryId);
    const position = positionAt(others, Math.max(0, Math.min(index, others.length)));
    mutations.updateItem.mutate({ entryId, changes: { position } });
  }
  return (
    <>
      <header className="context-header">
        <div className="context-title">
          <span className="context-icon">
            <FolderHeart size={17} />
          </span>
          <div>
            <h1>{collection.name}</h1>
            <div className="breadcrumb">
              <Link href="/collections">Coleções</Link>
              <ChevronRight size={10} />
              {collectionVisibilityLabels[collection.visibility]}
              {collection.ranked && ' · Ranking'}
            </div>
          </div>
        </div>
        <div className="context-actions">
          {instance.data?.uploadsEnabled && (
            <label className="toolbar-button">
              <ImageUp size={12} />
              Enviar capa
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  try {
                    await uploadImage(`/collections/${id}/cover`, file);
                    await result.refetch();
                    toast.success('Capa atualizada');
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Tente novamente');
                  }
                }}
              />
            </label>
          )}
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil size={13} />
            Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={13} />
            Excluir
          </Button>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus size={14} />
            Adicionar títulos
          </Button>
        </div>
      </header>
      <div className="library-scroll collection-page">
        {collection.description && (
          <p className="collection-description">{collection.description}</p>
        )}
        {items.length === 0 ? (
          <div className="empty-state">
            <h2>Uma coleção esperando por histórias</h2>
            <p>Adicione títulos da sua biblioteca de qualquer categoria.</p>
            <Button variant="outline" onClick={() => setAdding(true)}>
              <Plus size={14} />
              Adicionar títulos
            </Button>
          </div>
        ) : (
          <CollectionItems
            items={items}
            ranked={collection.ranked}
            onMove={move}
            onOpen={setDetailId}
            onRemove={(entryId) => mutations.removeItem.mutate({ collectionId: id, entryId })}
          />
        )}
      </div>
      <CollectionFormDialog
        open={editing}
        onOpenChange={setEditing}
        initial={collection}
        pending={mutations.update.isPending}
        onSubmit={(input) =>
          mutations.update.mutate(input, {
            onSuccess: () => {
              setEditing(false);
              toast.success('Coleção atualizada');
            },
          })
        }
      />
      <AddItemsDialog
        open={adding}
        onOpenChange={setAdding}
        existing={new Set(items.map((item) => item.entry.id))}
        onAdd={(entryId) => mutations.addItem.mutate({ collectionId: id, entryId })}
      />
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogTitle className="dialog-title">Excluir {collection.name}?</DialogTitle>
          <DialogDescription className="dialog-description">
            A coleção será removida. Os títulos continuam na sua biblioteca.
          </DialogDescription>
          <div className="dialog-footer">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={mutations.remove.isPending}
              onClick={() =>
                mutations.remove.mutate(undefined, {
                  onSuccess: () => {
                    toast.success('Coleção excluída');
                    router.replace('/collections');
                  },
                })
              }
            >
              Excluir coleção
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {detailId && <EntryDetails id={detailId} onClose={() => setDetailId(null)} />}
    </>
  );
}

function CollectionItems({
  items,
  ranked,
  onMove,
  onOpen,
  onRemove,
}: {
  items: CollectionItem[];
  ranked: boolean;
  onMove: (entryId: string, index: number) => void;
  onOpen: (entryId: string) => void;
  onRemove: (entryId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map((item) => item.entry.id);
  const titleOf = (id: string | number) =>
    items.find((item) => item.entry.id === id)?.entry.title ?? 'Título';
  const positionOf = (id: string | number) => ids.indexOf(String(id)) + 1;
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) =>
            `${titleOf(active.id)} selecionado na posição ${positionOf(active.id)}.`,
          onDragOver: ({ active, over }) =>
            over ? `${titleOf(active.id)} na posição ${positionOf(over.id)}.` : undefined,
          onDragEnd: ({ active, over }) =>
            over
              ? `${titleOf(active.id)} movido para a posição ${positionOf(over.id)}.`
              : 'Movimento cancelado.',
          onDragCancel: ({ active }) => `Movimento de ${titleOf(active.id)} cancelado.`,
        },
        screenReaderInstructions: {
          draggable:
            'Pressione espaço ou Enter para pegar o título, use as setas para reordenar e espaço para soltar. Esc cancela.',
        },
      }}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return;
        onMove(String(active.id), ids.indexOf(String(over.id)));
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ol className={`collection-items ${ranked ? 'ranked' : ''}`}>
          {items.map((item, index) => (
            <SortableCollectionItem
              key={item.entry.id}
              item={item}
              index={index}
              total={items.length}
              ranked={ranked}
              onMove={onMove}
              onOpen={onOpen}
              onRemove={onRemove}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableCollectionItem({
  item,
  index,
  total,
  ranked,
  onMove,
  onOpen,
  onRemove,
}: {
  item: CollectionItem;
  index: number;
  total: number;
  ranked: boolean;
  onMove: (entryId: string, index: number) => void;
  onOpen: (entryId: string) => void;
  onRemove: (entryId: string) => void;
}) {
  const { entry } = item;
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });
  return (
    <li
      ref={setNodeRef}
      className={`collection-item ${isDragging ? 'dragging' : ''}`}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: transition,
      }}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="collection-grip"
        aria-label={`Reordenar ${entry.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} aria-hidden="true" />
      </button>
      {ranked && <span className="collection-rank">{index + 1}</span>}
      <MediaCover
        title={entry.title}
        url={entry.coverUrl}
        layout={entry.coverAttribution?.layout}
      />
      <span className="collection-item-main">
        <button className="title-open" onClick={() => onOpen(entry.id)}>
          {entry.title}
        </button>
        <small>
          {categoryLabels[entry.mediaType]} · {progressSummary(entry)}
        </small>
      </span>
      <StatusBadge status={entry.status} />
      {entry.rating !== null ? (
        <StarRating value={entry.rating} size={11} />
      ) : (
        <span className="muted collection-norating">Sem nota</span>
      )}
      <span className="collection-item-actions">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Subir ${entry.title}`}
          disabled={index === 0}
          onClick={() => onMove(entry.id, index - 1)}
        >
          <ArrowUp size={13} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Descer ${entry.title}`}
          disabled={index === total - 1}
          onClick={() => onMove(entry.id, index + 1)}
        >
          <ArrowDown size={13} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remover ${entry.title} da coleção`}
          onClick={() => onRemove(entry.id)}
        >
          <X size={13} />
        </Button>
      </span>
    </li>
  );
}
