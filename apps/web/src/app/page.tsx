import type { Metadata } from 'next';
import { getT } from '@/i18n/server';
import { MarketingSite } from '@/features/presentation/marketing-site';
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('Jinsei — Todas as suas histórias em um só lugar'),
    description: t(
      'Organize jogos, animes, mangás, filmes e séries. Sua biblioteca, suas notas e sua jornada em uma plataforma gratuita e open source.',
    ),
    robots: { index: true, follow: true },
  };
}
export default function Page() {
  return <MarketingSite />;
}
