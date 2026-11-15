import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getT } from '@/i18n/server';
import { VerifyEmail } from '@/features/auth/account-recovery';
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Confirmar e-mail'), robots: { index: false } };
}
export default function Page() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}
