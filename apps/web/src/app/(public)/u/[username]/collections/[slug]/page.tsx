import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { PublicCollection } from '@jinsei/contracts';
import { absolute, serverApi, siteUrl } from '@/lib/server-api';
import { PublicCollectionPage } from '@/features/public-profile/public-collection-page';
import '@/app/public-profile.css';

type Params = { params: Promise<{ username: string; slug: string }> };
const load = async (username: string, slug: string) =>
  serverApi<PublicCollection>(
    `/profiles/${encodeURIComponent(username)}/collections/${encodeURIComponent(slug)}`,
  );

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username, slug } = await params;
  const [collection, origin] = await Promise.all([load(username, slug), siteUrl()]);
  if (!collection)
    return { title: 'Coleção não encontrada', robots: { index: false, follow: false } };
  const title = `${collection.name} · ${collection.owner.displayName}`;
  const description =
    collection.description ||
    `${collection.itemCount} títulos reunidos por ${collection.owner.displayName} no Jinsei.`;
  const image = absolute(origin, collection.coverUrl ?? collection.covers[0] ?? null);
  const path = `/u/${collection.owner.username}/collections/${collection.slug}`;
  return {
    title,
    description,
    metadataBase: new URL(origin),
    alternates: { canonical: path },
    // Unlisted collections are reachable by link but stay out of search engines.
    robots: collection.unlisted ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: 'article',
      title,
      description,
      url: path,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description },
  };
}

export default async function Page({ params }: Params) {
  const { username, slug } = await params;
  const collection = await load(username, slug);
  if (!collection) notFound();
  return <PublicCollectionPage collection={collection} />;
}
