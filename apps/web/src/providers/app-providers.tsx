'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { SignupDraftProvider } from '@/features/auth/signup-draft';
import { MotionProvider } from '@/components/motion/motion-provider';
import { I18nProvider } from '@/i18n/provider';
import type { Locale } from '@jinsei/contracts';

export function AppProviders({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30000, retry: 1, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider locale={locale}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <MotionProvider>
            <SignupDraftProvider>{children}</SignupDraftProvider>
          </MotionProvider>
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
