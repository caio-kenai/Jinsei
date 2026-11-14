'use client';
import Link from 'next/link';
import { Check, Plus } from 'lucide-react';
import { useCollectionMutations, useCollections } from './use-collections';

/** Collections that contain the entry, toggled from its details. */
export function EntryCollections({ entryId }: { entryId: string }) {
  const result = useCollections(entryId);
  const { addItem, removeItem } = useCollectionMutations();
  const collections = result.data?.collections ?? [];
  return (
    <section className="details-section">
      <h3>COLEÇÕES</h3>
      {collections.length === 0 ? (
        <p className="muted entry-collections-empty">
          <Link href="/collections">Crie uma coleção</Link> para reunir este título com outros.
        </p>
      ) : (
        <div className="entry-collections">
          {collections.map((collection) => (
            <button
              key={collection.id}
              type="button"
              className={`entry-collection ${collection.contains ? 'selected' : ''}`}
              aria-pressed={Boolean(collection.contains)}
              disabled={addItem.isPending || removeItem.isPending}
              onClick={() =>
                (collection.contains ? removeItem : addItem).mutate({
                  collectionId: collection.id,
                  entryId,
                })
              }
            >
              {collection.contains ? <Check size={12} /> : <Plus size={12} />}
              {collection.name}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
