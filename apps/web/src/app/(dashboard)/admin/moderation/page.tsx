import type { Metadata } from 'next';
import { getT } from '@/i18n/server';
import { ModerationScreen } from '@/features/moderation/moderation-screen';
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Moderação') };
}
export default function Page() {
  return <ModerationScreen />;
}
