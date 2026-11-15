import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/features/auth/account-recovery';
export const metadata: Metadata = { title: 'Nova senha', robots: { index: false } };
export default function Page() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
