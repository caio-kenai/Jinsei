import type { Metadata } from 'next';
import { getT } from '@/i18n/server';
import { AuthForm } from '@/features/auth/auth-form';
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Entrar') };
}
export default function Page() {
  return <AuthForm mode="login" />;
}
