'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CatalogResult } from '@jinsei/contracts';
import { api } from '@/lib/api';
import { MediaCover } from '@/features/library/media-cover';
import { StarRating } from '@/components/shared/star-rating';
import {
  ArrowRight,
  Check,
  CirclePlus,
  Gamepad2,
  Tv,
  BookOpen,
  BookMarked,
  Film,
  Clapperboard,
  Heart,
  Library,
  List,
  LayoutGrid,
  Search,
  ChevronDown,
  ChevronRight,
  Star,
  ShieldCheck,
  SlidersHorizontal,
  LockKeyhole,
} from 'lucide-react';
import { PublicHeader, PublicFooter } from './public-navigation';
import { SignupDialog } from '@/features/auth/signup-dialog';
import { categoryLabels, type MediaType, type StatusKey } from '@jinsei/contracts';
import { StatusBadge } from '@/features/library/status-badge';
import { ClosingShowcase } from './closing-showcase';

const categories = [
  { id: 'games', Icon: Gamepad2 },
  { id: 'anime', Icon: Tv },
  { id: 'manga', Icon: BookOpen },
  { id: 'movies', Icon: Film },
  { id: 'series', Icon: Clapperboard },
  { id: 'books', Icon: BookMarked },
] as const;
const examples: Record<
  MediaType,
  { title: string; status: StatusKey; rating: number | null; progress: number; tag: string }[]
> = {
  games: [
    {
      title: 'Hollow Knight',
      status: 'in_progress',
      rating: 4.75,
      progress: 64,
      tag: 'Metroidvania',
    },
    { title: 'Stardew Valley', status: 'in_progress', rating: 4.5, progress: 42, tag: 'Relaxante' },
    { title: 'Celeste', status: 'planned', rating: null, progress: 0, tag: 'Indie' },
    { title: 'Hades', status: 'completed', rating: 5, progress: 100, tag: 'Roguelike' },
    { title: 'Outer Wilds', status: 'planned', rating: null, progress: 0, tag: 'Exploração' },
  ],
  anime: [
    {
      title: 'Frieren: Beyond Journey’s End',
      status: 'in_progress',
      rating: 4.75,
      progress: 60,
      tag: 'Fantasia',
    },
    {
      title: 'Fullmetal Alchemist: Brotherhood',
      status: 'completed',
      rating: 5,
      progress: 100,
      tag: 'Aventura',
    },
    { title: 'Cowboy Bebop', status: 'planned', rating: null, progress: 0, tag: 'Clássico' },
  ],
  manga: [
    { title: 'Berserk', status: 'in_progress', rating: 5, progress: 45, tag: 'Fantasia' },
    {
      title: 'Fullmetal Alchemist',
      status: 'completed',
      rating: 4.75,
      progress: 100,
      tag: 'Aventura',
    },
    { title: 'Naruto', status: 'planned', rating: null, progress: 0, tag: 'Shōnen' },
  ],
  movies: [
    { title: 'Metrópolis', status: 'planned', rating: null, progress: 0, tag: 'Clássico' },
    {
      title: 'A viagem de Chihiro',
      status: 'completed',
      rating: 5,
      progress: 100,
      tag: 'Animação',
    },
    {
      title: 'Interestelar',
      status: 'completed',
      rating: 4.75,
      progress: 100,
      tag: 'Ficção científica',
    },
    {
      title: 'O fabuloso destino de Amélie Poulain',
      status: 'planned',
      rating: null,
      progress: 0,
      tag: 'Para depois',
    },
  ],
  series: [
    { title: 'Breaking Bad', status: 'completed', rating: 5, progress: 100, tag: 'Drama' },
    { title: 'Severance', status: 'in_progress', rating: 4.5, progress: 50, tag: 'Mistério' },
    { title: 'Dark', status: 'planned', rating: null, progress: 0, tag: 'Ficção científica' },
  ],
  books: [
    { title: 'Dom Casmurro', status: 'completed', rating: 5, progress: 100, tag: 'Clássico' },
    {
      title: 'Grande Sertão: Veredas',
      status: 'in_progress',
      rating: 4.5,
      progress: 38,
      tag: 'Literatura brasileira',
    },
    { title: 'Duna', status: 'planned', rating: null, progress: 0, tag: 'Ficção científica' },
  ],
};

function ProductDemo() {
  const { data: catalog = [] } = useQuery({
    queryKey: ['showcase'],
    queryFn: () => api<CatalogResult[]>('/catalog/showcase'),
    staleTime: 3600000,
    retry: false,
  });
  const coverFor = (title: string) =>
    catalog.find(
      (item) =>
        (title === 'Berserk' && item.externalId === 'OL8988597W') ||
        item.title.toLowerCase().split(':')[0] === title.toLowerCase().split(':')[0],
    );
  const [category, setCategory] = useState<MediaType>('games');
  const [layout, setLayout] = useState<'list' | 'gallery'>('list');
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => setActive((value) => value + 1), 4500);
    return () => clearInterval(timer);
  }, []);
  const entries = examples[category];
  return (
    <div className="marketing-demo" id="como-funciona">
      <nav className="demo-categories" aria-label="Categorias da demonstração">
        {categories.map(({ id, Icon }) => (
          <button
            key={id}
            className={category === id ? 'active' : ''}
            onClick={() => setCategory(id)}
          >
            <span>{category === id ? <Check size={12} /> : <CirclePlus size={13} />}</span>
            {categoryLabels[id]}
            <Icon className="demo-category-icon" size={16} />
          </button>
        ))}
        <div className="demo-nav-note">
          <LockKeyhole size={14} />
          Sua biblioteca,
          <br />
          do seu jeito.
        </div>
      </nav>
      <div className="demo-frame">
        <div className="demo-window-bar">
          <span className="demo-space-avatar">J</span>
          <span>
            Meu espaço
            <ChevronDown size={11} />
          </span>
          <span className="demo-search">
            <Search size={12} />
            Pesquisar<kbd>⌘ K</kbd>
          </span>
          <span className="demo-avatar">AC</span>
        </div>
        <div className="demo-app-body">
          <aside className="demo-rail">
            <span className="demo-rail-active">
              <Library size={17} />
              <small>Biblioteca</small>
            </span>
            <span>
              <Heart size={17} />
              <small>Favoritos</small>
            </span>
            <span>
              <Search size={17} />
              <small>Descobrir</small>
            </span>
            <span>
              <SlidersHorizontal size={17} />
              <small>Ajustes</small>
            </span>
          </aside>
          <div className="demo-workspace">
            <div className="demo-context">
              <span className="demo-category-square">
                <Gamepad2 size={13} />
              </span>
              <strong>{categoryLabels[category]}</strong>
              <ChevronDown size={12} />
              <Star size={13} />
            </div>
            <div className="demo-tabs">
              <button
                onClick={() => setLayout('list')}
                className={layout === 'list' ? 'active' : ''}
              >
                <List size={13} />
                Lista
              </button>
              <button
                onClick={() => setLayout('gallery')}
                className={layout === 'gallery' ? 'active' : ''}
              >
                <LayoutGrid size={13} />
                Galeria
              </button>
              <span>Biblioteca de exemplo</span>
            </div>
            <div className="demo-toolbar">
              <span>
                <SlidersHorizontal size={12} />
                Filtro
              </span>
              <span className="demo-add">+ Adicionar título</span>
            </div>
            {layout === 'list' ? (
              <div className="demo-list">
                <div className="demo-table-heading">
                  <span>Nome</span>
                  <span>Status</span>
                  <span>Nota</span>
                  <span>Progresso</span>
                </div>
                {entries.map((item, index) => (
                  <div
                    className={`demo-row ${active % entries.length === index ? 'demo-row-current' : ''}`}
                    key={item.title}
                  >
                    <span className="demo-row-name">
                      <span className={`demo-status-circle ${item.status}`} />
                      {item.title}
                    </span>
                    <StatusBadge status={item.status} />
                    <StarRating value={item.rating} size={10} />
                    <span className="demo-progress">
                      <i>
                        <b style={{ width: `${item.progress}%` }} />
                      </i>
                      <small>{item.progress}%</small>
                    </span>
                  </div>
                ))}
                <div className="demo-add-row">
                  <CirclePlus size={12} />
                  Adicionar título
                </div>
              </div>
            ) : (
              <div className="demo-gallery">
                {entries.map((item) => (
                  <div className="demo-poster" key={item.title}>
                    <MediaCover
                      title={item.title}
                      url={coverFor(item.title)?.coverUrl ?? null}
                      layout={coverFor(item.title)?.coverAttribution?.layout}
                      large
                    />
                    <span>{item.title}</span>
                    <small>{item.tag}</small>
                    {coverFor(item.title)?.coverAttribution && (
                      <small className="demo-cover-credit">
                        <a
                          target="_blank"
                          rel="noreferrer"
                          href={coverFor(item.title)!.coverAttribution!.sourceUrl}
                        >
                          {coverFor(item.title)!.coverAttribution!.provider}
                        </a>{' '}
                        · {coverFor(item.title)!.coverAttribution!.artist}{' '}
                        {coverFor(item.title)!.coverAttribution!.license}
                      </small>
                    )}
                    <span className="demo-poster-rating">
                      <StarRating value={item.rating} size={10} />
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="demo-floating-note" key={active}>
              <span>
                <Check size={13} />
              </span>
              <div>
                Suas experiências, organizadas.<small>Lista e galeria. Uma só biblioteca.</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarketingSite() {
  const [signup, setSignup] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const elements = root.current?.querySelectorAll<HTMLElement>('[data-reveal]');
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.12 },
    );
    elements?.forEach((element) => {
      element.classList.add('will-reveal');
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);
  return (
    <div className="marketing-site public-surface" ref={root}>
      <PublicHeader onSignup={() => setSignup(true)} />
      <main>
        <section className="marketing-hero marketing-container">
          <a
            className="marketing-pill"
            href="https://github.com/caio-kenai/Jinsei"
            target="_blank"
            rel="noreferrer"
          >
            <span className="pill-color-dot" />
            Gratuito. Open source. Seu.
            <ChevronRight size={14} />
          </a>
          <h1>
            Um lugar para todas
            <br />
            as suas histórias
          </h1>
          <p className="marketing-hero-subtitle">Jogos, filmes, séries e muito mais.</p>
          <div className="marketing-hero-cta">
            <button className="public-button public-button-large" onClick={() => setSignup(true)}>
              Comece agora. É GRÁTIS
            </button>
            <span>Sem assinatura. Sem cartão de crédito.</span>
          </div>
        </section>
        <section className="marketing-showcase">
          <div className="marketing-container">
            <ProductDemo />
            <div className="marketing-category-strip">
              <span>PARA TODAS AS SUAS HISTÓRIAS</span>
              {categories.map(({ id, Icon }) => (
                <div key={id}>
                  <Icon size={23} />
                  {categoryLabels[id]}
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="marketing-section marketing-container" data-reveal>
          <header className="marketing-section-heading">
            <h2>
              Menos listas espalhadas.
              <br />
              <span>Mais histórias para viver.</span>
            </h2>
            <p>
              Encontre o que você quer começar. Lembre do que já te marcou.
              <br />
              Mantenha cada experiência no seu lugar.
            </p>
          </header>
          <div className="marketing-experience">
            <div className="experience-copy">
              <span className="marketing-section-tag">
                <Library size={15} />
                Sua biblioteca
              </span>
              <h3>
                De “um dia eu começo”
                <br />a “nunca vou esquecer”.
              </h3>
              <p>
                Organize seus títulos por status, guarde suas notas e registre seu progresso. Cada
                detalhe acompanha a sua jornada.
              </p>
              <button className="public-text-link" onClick={() => setSignup(true)}>
                Crie sua biblioteca
                <ArrowRight size={16} />
              </button>
            </div>
            <div className="experience-panel">
              <div className="experience-panel-header">
                <Gamepad2 size={17} />
                <strong>Hollow Knight</strong>
                <Heart size={15} />
              </div>
              <div className="experience-field">
                <span>Status</span>
                <StatusBadge status="in_progress" />
              </div>
              <div className="experience-field">
                <span>Sua nota</span>
                <strong className="experience-stars">
                  <StarRating value={4.75} size={14} /> <span>4¾ / 5</span>
                </strong>
              </div>
              <div className="experience-field">
                <span>Progresso</span>
                <div className="experience-progress">
                  <span>
                    <b>32,5 horas</b>
                    <small>64% concluído</small>
                  </span>
                  <i>
                    <b />
                  </i>
                </div>
              </div>
              <div className="experience-note">
                <span>
                  <LockKeyhole size={12} />
                  Anotação privada · Exemplo
                </span>
                <p>
                  Explorar os caminhos que ficaram para trás. Uma jornada para aproveitar sem
                  pressa.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="marketing-section marketing-personalization" data-reveal>
          <div className="marketing-container">
            <header className="marketing-section-heading">
              <h2>
                Sua biblioteca.
                <br />
                <span>As suas regras.</span>
              </h2>
              <p>
                Escolha suas categorias, sua visualização e o seu tema.
                <br />O Jinsei se adapta a você.
              </p>
            </header>
            <div className="marketing-feature-grid">
              <article>
                <div className="feature-art feature-art-views">
                  <List size={24} />
                  <span />
                  <LayoutGrid size={24} />
                </div>
                <h3>Uma biblioteca, diferentes olhares.</h3>
                <p>
                  Alterne entre a clareza da lista e o visual da galeria. Seus registros continuam
                  no mesmo lugar.
                </p>
              </article>
              <article>
                <div className="feature-art feature-art-colors">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <h3>Do seu jeito, em cada detalhe.</h3>
                <p>
                  Temas claro e escuro, cores e categorias configuráveis. Um espaço que combina com
                  você.
                </p>
              </article>
              <article>
                <div className="feature-art feature-art-privacy">
                  <ShieldCheck size={47} />
                  <span>
                    <Check size={13} />
                    Só você
                  </span>
                </div>
                <h3>Suas histórias pertencem a você.</h3>
                <p>
                  Biblioteca privada, anotações pessoais e exportação dos seus dados. Você mantém o
                  controle.
                </p>
              </article>
            </div>
          </div>
        </section>
        <ClosingShowcase onSignup={() => setSignup(true)} />
      </main>
      <PublicFooter />
      <SignupDialog open={signup} onOpenChange={setSignup} />
    </div>
  );
}
