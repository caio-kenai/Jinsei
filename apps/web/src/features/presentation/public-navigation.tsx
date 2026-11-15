'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Brand } from '@/components/shared/brand';
import { SignupDialog } from '@/features/auth/signup-dialog';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { creatorSupport } from '@jinsei/contracts';
import { SupportDialog } from '@/features/support/support-dialog';
import { useT } from '@/i18n/provider';
import { LanguageSwitcher } from '@/components/shared/language-switcher';

export function PublicHeader({ onSignup }: { onSignup?: () => void }) {
  const t = useT();
  const [signup, setSignup] = useState(false);
  const user = useCurrentUser().data;
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return (
    <>
      <header className={`marketing-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="marketing-container marketing-header-inner">
          <Link href="/" aria-label={t('Jinsei página inicial')}>
            <Brand adaptive />
          </Link>
          <nav aria-label={t('Navegação do site')}>
            <div className="marketing-nav-links" onMouseLeave={() => setHovered(null)}>
              {[
                { href: '/#como-funciona', label: t('Conheça o Jinsei') },
                { href: '/rankings', label: t('Rankings') },
                { href: '/download', label: t('Apps') },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  className="marketing-about-link"
                  href={href}
                  onMouseEnter={() => setHovered(href)}
                  onFocus={() => setHovered(href)}
                >
                  {hovered === href && (
                    <motion.span
                      layoutId="marketing-nav-highlight"
                      className="marketing-nav-highlight"
                      transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                    />
                  )}
                  <span>{label}</span>
                </Link>
              ))}
            </div>
            <LanguageSwitcher />
            {user ? (
              <Link className="public-button" href="/home">
                {t('Abrir meu Jinsei')}
              </Link>
            ) : (
              <>
                <Link className="public-button public-button-muted" href="/login">
                  {t('Entrar')}
                </Link>
                <button
                  className="public-button"
                  onClick={() => (onSignup ? onSignup() : setSignup(true))}
                >
                  {t('Cadastre-se')}
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      <div className="marketing-header-spacer" aria-hidden="true" />
      {!onSignup && <SignupDialog open={signup} onOpenChange={setSignup} />}
    </>
  );
}
export function PublicFooter() {
  const t = useT();
  const [support, setSupport] = useState(false);
  return (
    <>
      <footer className="marketing-footer">
        <div className="marketing-container">
          <Link href="/" aria-label="Jinsei">
            <Brand />
          </Link>
          <span>
            {t('© 2026 Jinsei · Criado por {creator}', { creator: creatorSupport.creator })}
          </span>
          <nav aria-label={t('Informações do Jinsei')}>
            <a href="https://github.com/caio-kenai/Jinsei" target="_blank" rel="noreferrer">
              {t('Código aberto')}
            </a>
            <button type="button" className="public-footer-link" onClick={() => setSupport(true)}>
              {t('Buy Me a Monster')}
            </button>
            <Link href="/download">{t('Apps')}</Link>
            <Link href="/privacy">{t('Privacidade')}</Link>
            <Link href="/terms">{t('Termos')}</Link>
          </nav>
        </div>
      </footer>
      <SupportDialog open={support} onOpenChange={setSupport} publicView />
    </>
  );
}
