import type { Metadata } from 'next';
import { getT } from '@/i18n/server';
import { ForgotPasswordForm } from '@/features/auth/account-recovery';
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Recuperar senha') };
}
export default function Page() {
  return <ForgotPasswordForm />;
}
