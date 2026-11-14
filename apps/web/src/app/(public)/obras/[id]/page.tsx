import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { categoryLabels, type PublicWorkPage } from '@jinsei/contracts';
import { absolute, serverApi, siteUrl } from '@/lib/server-api';
import { WorkPage } from '@/features/works/work-page';
import '@/app/works.css';

type Params = { params: Promise<{ id: string }> };
const load = async (id: string) => serverApi<PublicWorkPage>(`/works/${encodeURIComponent(id)}`);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const [work, origin] = await Promise.all([load(id), siteUrl()]);
  if (!work) return { title: 'Obra não encontrada', robots: { index: false, follow: false } };
  const title = `${work.title}${work.releaseYear ? ` (${work.releaseYear})` : ''}`;
  const description =
    (work.detail.synopsis || work.description).slice(0, 180) ||
    `${categoryLabels[work.mediaType]} no Jinsei: notas, reviews e rankings da comunidade.`;
  const image = absolute(origin, work.coverUrl);
  return {
    title,
    description,
    metadataBase: new URL(origin),
    alternates: { canonical: `/obras/${work.id}` },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `/obras/${work.id}`,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: { card: 'summary', title, description },
  };
}

export default async function Page({ params }: Params) {
  const work = await load((await params).id);
  if (!work) notFound();
  return <WorkPage work={work} />;
}
