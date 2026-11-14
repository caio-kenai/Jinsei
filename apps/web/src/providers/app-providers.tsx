'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { SignupDraftProvider } from '@/features/auth/signup-draft';
import { MotionProvider } from '@/components/motion/motion-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30000, retry: 1, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <MotionProvider>
          <SignupDraftProvider>{children}</SignupDraftProvider>
        </MotionProvider>
        <Toaster richColors position="bottom-right" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
