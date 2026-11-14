import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Brand } from '@/components/shared/brand';

export function ClosingShowcase({ onSignup }: { onSignup: () => void }) {
  return (
    <section className="closing-showcase marketing-container" data-reveal>
      <div className="closing-gradient">
        <div className="closing-copy">
          <Brand compact />
          <h2>
            Todas as suas histórias.
            <br />
            Em um só lugar.
          </h2>
          <button className="public-button closing-signup cta-light" onClick={onSignup}>
            <span className="cta-light-shine" aria-hidden="true" />
            Comece gratuitamente
            <ArrowRight size={17} className="cta-arrow" />
          </button>
        </div>
        <div className="closing-devices" aria-label="Jinsei no computador e no celular">
          <div className="closing-desktop">
            <div className="closing-browser-dots">
              <i />
              <i />
              <i />
              <span>Jinsei · Minha biblioteca</span>
            </div>
            <Image
              src="/showcase/library-desktop.webp"
              alt="Biblioteca real do Jinsei no computador, com títulos organizados em grupos"
              width={1280}
              height={889}
              unoptimized
            />
          </div>
          <div className="closing-phone">
            <div className="closing-phone-speaker" />
            <Image
              src="/showcase/library-mobile.webp"
              alt="Galeria real do Jinsei no celular"
              width={390}
              height={844}
              unoptimized
            />
          </div>
        </div>
        <p className="closing-caption">Seu espaço para organizar, lembrar e descobrir.</p>
      </div>
    </section>
  );
}
