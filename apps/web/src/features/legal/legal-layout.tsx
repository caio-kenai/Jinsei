import Link from 'next/link';
import { PublicHeader, PublicFooter } from '@/features/presentation/public-navigation';
import '@/app/legal.css';

export function LegalLayout({
  title,
  active,
  children,
}: {
  title: string;
  active: 'terms' | 'privacy';
  children: React.ReactNode;
}) {
  return (
    <div className="legal-site public-surface">
      <PublicHeader />
      <main className="legal-layout marketing-container">
        <article className="legal-article">
          <h1>{title}</h1>
          {children}
        </article>
        <aside className="legal-navigation" aria-label="Documentos e políticas">
          <Link href="/terms" aria-current={active === 'terms' ? 'page' : undefined}>
            Termos de uso
          </Link>
          <Link href="/privacy" aria-current={active === 'privacy' ? 'page' : undefined}>
            Privacidade
          </Link>
          <a
            href="https://github.com/caio-kenai/Jinsei/blob/main/LICENSE"
            target="_blank"
            rel="noreferrer"
          >
            Licença do código
          </a>
          <Link href="/">Sobre o Jinsei</Link>
        </aside>
      </main>
      <PublicFooter />
    </div>
  );
}
