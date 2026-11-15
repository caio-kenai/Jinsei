'use client';
import { useI18n } from '@/i18n/provider';
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
  const { t, locale } = useI18n();
  return (
    <div className="legal-site public-surface">
      <PublicHeader />
      <main className="legal-layout marketing-container">
        <article className="legal-article">
          <h1>{title}</h1>
          {locale !== 'pt-BR' && (
            <p className="legal-translation-note">
              {t('Esta é uma tradução. A versão em português prevalece em caso de divergência.')}
            </p>
          )}
          {children}
        </article>
        <aside className="legal-navigation" aria-label={t('Documentos e políticas')}>
          <Link href="/terms" aria-current={active === 'terms' ? 'page' : undefined}>
            {t('Termos de uso')}
          </Link>
          <Link href="/privacy" aria-current={active === 'privacy' ? 'page' : undefined}>
            {t('Privacidade')}
          </Link>
          <a
            href="https://github.com/caio-kenai/Jinsei/blob/main/LICENSE"
            target="_blank"
            rel="noreferrer"
          >
            {t('Licença do código')}
          </a>
          <Link href="/">{t('Sobre o Jinsei')}</Link>
        </aside>
      </main>
      <PublicFooter />
    </div>
  );
}
