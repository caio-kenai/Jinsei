import { CollectionScreen } from '@/features/collections/collection-screen';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <CollectionScreen id={(await params).id} />;
}
