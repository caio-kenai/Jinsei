import { useT } from '@/i18n/provider';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Brand } from '@/components/shared/brand';

export function ClosingShowcase({ onSignup }: { onSignup: () => void }) {
  const t = useT();
  return (
    <section className="closing-showcase marketing-container" data-reveal>
      <div className="closing-gradient">
        <div className="closing-copy">
          <Brand compact />
          <h2>
            {t('Todas as suas histórias.')}
            <br />
            {t('Em um só lugar.')}
          </h2>
          <button className="public-button closing-signup cta-light" onClick={onSignup}>
            <span className="cta-light-shine" aria-hidden="true" />
            {t('Comece gratuitamente')}
            <ArrowRight size={17} className="cta-arrow" />
          </button>
        </div>
        <div className="closing-devices" aria-label={t('Jinsei no computador e no celular')}>
          <div className="closing-desktop">
            <div className="closing-browser-dots">
              <i />
              <i />
              <i />
              <span>{t('Jinsei · Minha biblioteca')}</span>
            </div>
            <Image
              src="/showcase/library-desktop.webp"
              alt={t('Biblioteca real do Jinsei no computador, com títulos organizados em grupos')}
              width={1280}
              height={889}
              unoptimized
            />
          </div>
          <div className="closing-phone">
            <div className="closing-phone-speaker" />
            <Image
              src="/showcase/library-mobile.webp"
              alt={t('Galeria real do Jinsei no celular')}
              width={390}
              height={844}
              unoptimized
            />
          </div>
        </div>
        <p className="closing-caption">{t('Seu espaço para organizar, lembrar e descobrir.')}</p>
      </div>
    </section>
  );
}
