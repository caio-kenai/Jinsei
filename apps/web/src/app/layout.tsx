import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/plus-jakarta-sans';
import './globals.css';
import './public.css';
import './polish.css';
import { AppProviders } from '@/providers/app-providers';

export const metadata: Metadata = {
  title: { default: 'Jinsei', template: '%s · Jinsei' },
  description: 'Sua jornada pela cultura e pelo entretenimento, organizada em um só lugar.',
  icons: {
    icon: [32, 64].map((size) => ({
      url: `/branding/favicon-${size}.png`,
      type: 'image/png',
      sizes: `${size}x${size}`,
    })),
    apple: { url: '/branding/favicon-180.png', sizes: '180x180' },
  },
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
