import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getT } from '@/i18n/server';
import { ResetPasswordForm } from '@/features/auth/account-recovery';
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Nova senha'), robots: { index: false } };
}
export default function Page() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
