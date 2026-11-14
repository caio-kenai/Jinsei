import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { PublicProfile } from '@jinsei/contracts';
import { absolute, serverApi, siteUrl } from '@/lib/server-api';
import { PublicProfilePage } from '@/features/public-profile/public-profile-page';
import '@/app/public-profile.css';

type Params = { params: Promise<{ username: string }> };
const load = async (username: string) =>
  serverApi<PublicProfile>(`/profiles/${encodeURIComponent(username)}`);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  const [profile, origin] = await Promise.all([load(username), siteUrl()]);
  // Private and missing profiles share the same answer and are never indexed.
  if (!profile) return { title: 'Perfil não encontrado', robots: { index: false, follow: false } };
  const title = `${profile.displayName} (@${profile.username})`;
  const description =
    profile.bio || `Jogos, filmes, séries, animes, mangás e livros de ${profile.displayName}.`;
  const image = absolute(origin, profile.bannerUrl ?? profile.avatarUrl);
  return {
    title,
    description,
    metadataBase: new URL(origin),
    alternates: { canonical: `/u/${profile.username}` },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'profile',
      title,
      description,
      url: `/u/${profile.username}`,
      username: profile.username,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description },
  };
}

export default async function Page({ params }: Params) {
  const profile = await load((await params).username);
  if (!profile) notFound();
  return <PublicProfilePage profile={profile} />;
}
