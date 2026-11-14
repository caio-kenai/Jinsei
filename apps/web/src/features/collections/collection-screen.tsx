'use client';
import { useState } from 'react';
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
  const [dragging, setDragging] = useState<string | null>(null);
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
          <ol className={`collection-items ${collection.ranked ? 'ranked' : ''}`}>
            {items.map((item, index) => (
              <li
                key={item.entry.id}
                className={`collection-item ${dragging === item.entry.id ? 'dragging' : ''}`}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/plain', item.entry.id);
                  setDragging(item.entry.id);
                }}
                onDragEnd={() => setDragging(null)}
                onDragOver={(event) => dragging && event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const id = event.dataTransfer.getData('text/plain') || dragging;
                  const from = items.findIndex((other) => other.entry.id === id);
                  if (id && from !== index) move(id, index);
                  setDragging(null);
                }}
              >
                <GripVertical size={14} className="collection-grip" aria-hidden="true" />
                {collection.ranked && <span className="collection-rank">{index + 1}</span>}
                <MediaCover
                  title={item.entry.title}
                  url={item.entry.coverUrl}
                  layout={item.entry.coverAttribution?.layout}
                />
                <span className="collection-item-main">
                  <button className="title-open" onClick={() => setDetailId(item.entry.id)}>
                    {item.entry.title}
                  </button>
                  <small>
                    {categoryLabels[item.entry.mediaType]} · {progressSummary(item.entry)}
                  </small>
                </span>
                <StatusBadge status={item.entry.status} />
                {item.entry.rating !== null ? (
                  <StarRating value={item.entry.rating} size={11} />
                ) : (
                  <span className="muted collection-norating">Sem nota</span>
                )}
                <span className="collection-item-actions">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Subir ${item.entry.title}`}
                    disabled={index === 0}
                    onClick={() => move(item.entry.id, index - 1)}
                  >
                    <ArrowUp size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Descer ${item.entry.title}`}
                    disabled={index === items.length - 1}
                    onClick={() => move(item.entry.id, index + 1)}
                  >
                    <ArrowDown size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${item.entry.title} da coleção`}
                    onClick={() =>
                      mutations.removeItem.mutate({ collectionId: id, entryId: item.entry.id })
                    }
                  >
                    <X size={13} />
                  </Button>
                </span>
              </li>
            ))}
          </ol>
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
