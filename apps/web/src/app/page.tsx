import type { Metadata } from 'next';
import { MarketingSite } from '@/features/presentation/marketing-site';
export const metadata: Metadata = {
  title: 'Jinsei — Todas as suas histórias em um só lugar',
  description:
    'Organize jogos, animes, mangás, filmes e séries. Sua biblioteca, suas notas e sua jornada em uma plataforma gratuita e open source.',
  robots: { index: true, follow: true },
};
export default function Page() {
  return <MarketingSite />;
}
