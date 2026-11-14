'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brand } from '@/components/shared/brand';
import { SignupDialog } from '@/features/auth/signup-dialog';
import { creatorSupport } from '@jinsei/contracts';
import { SupportDialog } from '@/features/support/support-dialog';

export function PublicHeader({ onSignup }: { onSignup?: () => void }) {
  const [signup, setSignup] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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
          <Link href="/" aria-label="Jinsei página inicial">
            <Brand />
          </Link>
          <nav aria-label="Navegação do site">
            <Link className="marketing-about-link" href="/#como-funciona">
              Conheça o Jinsei
            </Link>
            <Link className="public-button public-button-muted" href="/login">
              Entrar
            </Link>
            <button
              className="public-button"
              onClick={() => (onSignup ? onSignup() : setSignup(true))}
            >
              Cadastre-se
            </button>
          </nav>
        </div>
      </header>
      {!onSignup && <SignupDialog open={signup} onOpenChange={setSignup} />}
    </>
  );
}
export function PublicFooter() {
  const [support, setSupport] = useState(false);
  return (
    <>
      <footer className="marketing-footer">
        <div className="marketing-container">
          <Link href="/" aria-label="Jinsei">
            <Brand />
          </Link>
          <span>© 2026 Jinsei · Criado por {creatorSupport.creator}</span>
          <nav aria-label="Informações do Jinsei">
            <a href="https://github.com/caio-kenai/Jinsei" target="_blank" rel="noreferrer">
              Código aberto
            </a>
            <button type="button" className="public-footer-link" onClick={() => setSupport(true)}>
              Buy Me a Monster
            </button>
            <Link href="/privacy">Privacidade</Link>
            <Link href="/terms">Termos</Link>
          </nav>
        </div>
      </footer>
      <SupportDialog open={support} onOpenChange={setSupport} publicView />
    </>
  );
}
