import { LibraryScreen } from '@/features/library/library-screen';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return (
    <LibraryScreen
      initialQuery={typeof query.q === 'string' ? query.q : undefined}
      initialEntry={typeof query.entry === 'string' ? query.entry : undefined}
    />
  );
}
