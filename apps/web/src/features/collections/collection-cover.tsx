import { FolderHeart } from 'lucide-react';
import type { CollectionSummary } from '@jinsei/contracts';

/** The chosen cover, or a mosaic of the first titles of the collection. */
export function CollectionCover({ collection }: { collection: CollectionSummary }) {
  if (collection.coverUrl)
    return (
      <span className="collection-cover">
        {/* eslint-disable-next-line @next/next/no-img-element -- External covers chosen by the owner */}
        <img src={collection.coverUrl} alt="" referrerPolicy="no-referrer" />
      </span>
    );
  if (!collection.covers.length)
    return (
      <span className="collection-cover empty">
        <FolderHeart size={26} />
      </span>
    );
  return (
    <span className={`collection-cover mosaic count-${collection.covers.length}`}>
      {collection.covers.map((url) => (
        // eslint-disable-next-line @next/next/no-img-element -- Covers come from catalog providers
        <img key={url} src={url} alt="" referrerPolicy="no-referrer" />
      ))}
    </span>
  );
}
