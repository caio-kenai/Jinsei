import { CommunityShell } from '@/features/community/community-ui';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <CommunityShell>{children}</CommunityShell>;
}
