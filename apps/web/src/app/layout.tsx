import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/plus-jakarta-sans';
import './globals.css';
import './public.css';
import { AppProviders } from '@/providers/app-providers';

export const metadata: Metadata = {
  title: { default: 'Jinsei', template: '%s · Jinsei' },
  description: 'Sua jornada pela cultura e pelo entretenimento, organizada em um só lugar.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
