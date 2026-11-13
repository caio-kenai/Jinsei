import { AuthBoundary } from '@/features/auth/auth-boundary';
import { AppShell } from '@/components/layout/app-shell';
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthBoundary>
      <AppShell>{children}</AppShell>
    </AuthBoundary>
  );
}
