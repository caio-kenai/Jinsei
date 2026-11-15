import type { Metadata } from 'next';
import { getT } from '@/i18n/server';
import { DownloadPage } from '@/features/download/download-page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('Baixar o Jinsei'),
    description: t('Jinsei para Windows, macOS, Linux e Android, conectado ao seu servidor.'),
    alternates: { canonical: '/download' },
    robots: { index: true, follow: true },
  };
}

export default function Page() {
  return <DownloadPage />;
}
