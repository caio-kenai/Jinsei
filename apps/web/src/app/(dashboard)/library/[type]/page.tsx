import { notFound } from 'next/navigation';
import { mediaTypeSchema } from '@jinsei/contracts';
import { LibraryScreen } from '@/features/library/library-screen';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const category = mediaTypeSchema.safeParse((await params).type);
  if (!category.success) notFound();
  const query = await searchParams;
  return (
    <LibraryScreen
      mediaType={category.data}
      initialEntry={typeof query.entry === 'string' ? query.entry : undefined}
    />
  );
}
