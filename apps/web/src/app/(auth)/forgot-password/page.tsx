import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/auth/account-recovery';
export const metadata: Metadata = { title: 'Recuperar senha' };
export default function Page() {
  return <ForgotPasswordForm />;
}
