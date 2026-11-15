import { Suspense } from 'react';
import type { Metadata } from 'next';
import { VerifyEmail } from '@/features/auth/account-recovery';
export const metadata: Metadata = { title: 'Confirmar e-mail', robots: { index: false } };
export default function Page() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}
