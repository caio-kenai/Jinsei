import { ClubScreen } from '@/features/community/club-screen';
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ClubScreen slug={slug} />;
}
