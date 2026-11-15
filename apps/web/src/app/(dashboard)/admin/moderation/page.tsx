import type { Metadata } from 'next';
import { ModerationScreen } from '@/features/moderation/moderation-screen';
export const metadata: Metadata = { title: 'Moderação' };
export default function Page() {
  return <ModerationScreen />;
}
