import Link from 'next/link';
import type { PublicCollection } from '@jinsei/contracts';
import { PublicFooter, PublicHeader } from '@/features/presentation/public-navigation';
import { PublicWorkCard } from './public-work';

export function PublicCollectionPage({ collection }: { collection: PublicCollection }) {
  return (
    <div className="public-surface public-profile">
      <PublicHeader />
      <main className="marketing-container">
        <header className="public-collection-header">
          <p className="public-username">
            Coleção de{' '}
            <Link href={`/u/${collection.owner.username}`}>{collection.owner.displayName}</Link>
          </p>
          <h1>{collection.name}</h1>
          {collection.description && <p className="public-bio">{collection.description}</p>}
          <p className="public-since">
            {collection.itemCount} {collection.itemCount === 1 ? 'título' : 'títulos'}
            {collection.ranked && ' · Ranking'}
          </p>
        </header>
        <ol className={`public-grid public-collection-items ${collection.ranked ? 'ranked' : ''}`}>
          {collection.items.map((item, index) => (
            <li key={`${item.mediaType}:${item.title}:${index}`}>
              {collection.ranked && <span className="public-rank">{index + 1}</span>}
              <PublicWorkCard work={item}>
                {item.note && <p className="public-review">{item.note}</p>}
              </PublicWorkCard>
            </li>
          ))}
        </ol>
      </main>
      <PublicFooter />
    </div>
  );
}
