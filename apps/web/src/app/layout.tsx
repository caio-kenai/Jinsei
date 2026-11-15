import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/plus-jakarta-sans';
import './globals.css';
import './public.css';
import './themes.css';
import './colors.css';
import './dashboard.css';
import './polish.css';
import './motion.css';
import './landing.css';
import './landing-sections.css';
import './works.css';
import './community.css';
import './settings.css';
import './interactions.css';
import { AppProviders } from '@/providers/app-providers';
import { getLocale, getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: 'Jinsei', template: '%s · Jinsei' },
    description: t('Sua jornada pela cultura e pelo entretenimento, organizada em um só lugar.'),
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
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <AppProviders locale={locale}>{children}</AppProviders>
      </body>
    </html>
  );
}
