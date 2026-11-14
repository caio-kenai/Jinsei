'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FolderHeart, ListOrdered, LoaderCircle, Plus } from 'lucide-react';
import { collectionVisibilityLabels } from '@jinsei/contracts';
import { Button } from '@/components/ui/button';
import { CollectionCover } from './collection-cover';
import { CollectionFormDialog } from './collection-form-dialog';
import { useCollectionMutations, useCollections } from './use-collections';

export function CollectionsScreen() {
  const result = useCollections();
  const { create } = useCollectionMutations();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <header className="context-header">
        <div className="context-title">
          <span className="context-icon">
            <FolderHeart size={17} />
          </span>
          <div>
            <h1>Coleções</h1>
            <div className="breadcrumb">Listas, rankings e agrupamentos pessoais</div>
          </div>
        </div>
        <div className="context-actions">
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus size={14} />
            Nova coleção
          </Button>
        </div>
      </header>
      <div className="library-scroll collections-page">
        {result.isPending ? (
          <div className="empty-state">
            <LoaderCircle className="spin" />
          </div>
        ) : result.error ? (
          <div className="empty-state">
            <p>{result.error.message}</p>
            <Button onClick={() => void result.refetch()}>Tentar novamente</Button>
          </div>
        ) : result.data.collections.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">
              <FolderHeart size={25} />
            </span>
            <h2>Suas histórias, do seu jeito</h2>
            <p>
              Crie rankings, listas para as férias ou reúna as obras que mudaram sua perspectiva.
            </p>
            <Button variant="outline" onClick={() => setOpen(true)}>
              <Plus size={14} />
              Criar minha primeira coleção
            </Button>
          </div>
        ) : (
          <div className="collection-grid">
            {result.data.collections.map((collection) => (
              <Link
                key={collection.id}
                href={`/collections/${collection.id}`}
                className="collection-card"
              >
                <CollectionCover collection={collection} />
                <span className="collection-card-body">
                  <strong>{collection.name}</strong>
                  <small>
                    {collection.itemCount} {collection.itemCount === 1 ? 'título' : 'títulos'} ·{' '}
                    {collectionVisibilityLabels[collection.visibility]}
                    {collection.ranked && (
                      <>
                        {' · '}
                        <ListOrdered size={11} /> Ranking
                      </>
                    )}
                  </small>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <CollectionFormDialog
        open={open}
        onOpenChange={setOpen}
        pending={create.isPending}
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: (detail) => {
              setOpen(false);
              router.push(`/collections/${detail.id}`);
            },
          })
        }
      />
    </>
  );
}
