'use client';
import { msg } from '@/i18n/config';
import { useT } from '@/i18n/provider';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
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
  SlidersHorizontal,
  LockKeyhole,
} from 'lucide-react';
import { PublicHeader, PublicFooter } from './public-navigation';
import { SignupDialog } from '@/features/auth/signup-dialog';
import { categoryLabels, type MediaType, type StatusKey } from '@jinsei/contracts';
import { StatusBadge } from '@/features/library/status-badge';
import { ClosingShowcase } from './closing-showcase';
import { AccentArt, ExperienceShowcase, PrivacyArt, ViewsSwitchArt } from './landing-showcase';
import {
  categoryPalette,
  CategoryMarquee,
  Faq,
  FeatureBento,
  HowItWorks,
  OpenSourceSection,
} from './landing-sections';
import { BlurText, GlowButton, RotatingWord, ScrollLift, SpotlightCard } from './landing-effects';

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
      title: msg('Hollow Knight'),
      status: 'in_progress',
      rating: 4.75,
      progress: 64,
      tag: msg('Metroidvania'),
    },
    {
      title: msg('Stardew Valley'),
      status: 'in_progress',
      rating: 4.5,
      progress: 42,
      tag: msg('Relaxante'),
    },
    { title: msg('Celeste'), status: 'planned', rating: null, progress: 0, tag: msg('Indie') },
    { title: msg('Hades'), status: 'completed', rating: 5, progress: 100, tag: msg('Roguelike') },
    {
      title: msg('Outer Wilds'),
      status: 'planned',
      rating: null,
      progress: 0,
      tag: msg('Exploração'),
    },
  ],
  anime: [
    {
      title: msg('Frieren: Beyond Journey’s End'),
      status: 'in_progress',
      rating: 4.75,
      progress: 60,
      tag: msg('Fantasia'),
    },
    {
      title: msg('Fullmetal Alchemist: Brotherhood'),
      status: 'completed',
      rating: 5,
      progress: 100,
      tag: msg('Aventura'),
    },
    {
      title: msg('Cowboy Bebop'),
      status: 'planned',
      rating: null,
      progress: 0,
      tag: msg('Clássico'),
    },
  ],
  manga: [
    { title: msg('Berserk'), status: 'in_progress', rating: 5, progress: 45, tag: msg('Fantasia') },
    {
      title: msg('Fullmetal Alchemist'),
      status: 'completed',
      rating: 4.75,
      progress: 100,
      tag: msg('Aventura'),
    },
    { title: msg('Naruto'), status: 'planned', rating: null, progress: 0, tag: 'Shōnen' },
  ],
  movies: [
    {
      title: msg('Metrópolis'),
      status: 'planned',
      rating: null,
      progress: 0,
      tag: msg('Clássico'),
    },
    {
      title: msg('A viagem de Chihiro'),
      status: 'completed',
      rating: 5,
      progress: 100,
      tag: msg('Animação'),
    },
    {
      title: msg('Interestelar'),
      status: 'completed',
      rating: 4.75,
      progress: 100,
      tag: msg('Ficção científica'),
    },
    {
      title: msg('O fabuloso destino de Amélie Poulain'),
      status: 'planned',
      rating: null,
      progress: 0,
      tag: msg('Para depois'),
    },
  ],
  series: [
    {
      title: msg('Breaking Bad'),
      status: 'completed',
      rating: 5,
      progress: 100,
      tag: msg('Drama'),
    },
    {
      title: msg('Severance'),
      status: 'in_progress',
      rating: 4.5,
      progress: 50,
      tag: msg('Mistério'),
    },
    {
      title: msg('Dark'),
      status: 'planned',
      rating: null,
      progress: 0,
      tag: msg('Ficção científica'),
    },
  ],
  books: [
    {
      title: msg('Dom Casmurro'),
      status: 'completed',
      rating: 5,
      progress: 100,
      tag: msg('Clássico'),
    },
    {
      title: msg('Grande Sertão: Veredas'),
      status: 'in_progress',
      rating: 4.5,
      progress: 38,
      tag: msg('Literatura brasileira'),
    },
    {
      title: msg('Duna'),
      status: 'planned',
      rating: null,
      progress: 0,
      tag: msg('Ficção científica'),
    },
  ],
};

function ProductDemo() {
  const t = useT();
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
  const CategoryIcon = categories.find((item) => item.id === category)!.Icon;
  return (
    <div className="marketing-demo" id="como-funciona">
      <nav className="demo-categories" aria-label={t('Categorias da demonstração')}>
        {categories.map(({ id, Icon }) => (
          <button
            key={id}
            className={category === id ? 'active' : ''}
            onClick={() => setCategory(id)}
          >
            <span>{category === id ? <Check size={12} /> : <CirclePlus size={13} />}</span>
            {t(categoryLabels[id])}
            <Icon className="demo-category-icon" size={16} />
          </button>
        ))}
        <div className="demo-nav-note">
          <LockKeyhole size={14} />
          {t('Sua biblioteca,')}
          <br />
          {t('do seu jeito.')}
        </div>
      </nav>
      <div className="demo-frame">
        <div className="demo-window-bar">
          <span className="demo-space-avatar">J</span>
          <span>
            {t('Meu espaço')}
            <ChevronDown size={11} />
          </span>
          <span className="demo-search">
            <Search size={12} />
            {t('Pesquisar')}
            <kbd>⌘ K</kbd>
          </span>
          <span className="demo-avatar">{t('AC')}</span>
        </div>
        <div className="demo-app-body">
          <aside className="demo-rail">
            <span className="demo-rail-active">
              <Library size={17} />
              <small>{t('Biblioteca')}</small>
            </span>
            <span>
              <Heart size={17} />
              <small>{t('Favoritos')}</small>
            </span>
            <span>
              <Search size={17} />
              <small>{t('Descobrir')}</small>
            </span>
            <span>
              <SlidersHorizontal size={17} />
              <small>{t('Ajustes')}</small>
            </span>
          </aside>
          <div className="demo-workspace">
            <div className="demo-context">
              <motion.span
                key={category}
                className="demo-category-square"
                style={{ background: categoryPalette[category] }}
                initial={{ scale: 0.4, rotate: -30, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 520, damping: 22 }}
              >
                <CategoryIcon size={13} />
              </motion.span>
              <strong>{t(categoryLabels[category])}</strong>
              <ChevronDown size={12} />
              <Star size={13} />
            </div>
            <div className="demo-tabs">
              <button
                onClick={() => setLayout('list')}
                className={layout === 'list' ? 'active' : ''}
              >
                <List size={13} />
                {t('Lista')}
              </button>
              <button
                onClick={() => setLayout('gallery')}
                className={layout === 'gallery' ? 'active' : ''}
              >
                <LayoutGrid size={13} />
                {t('Galeria')}
              </button>
              <span>{t('Biblioteca de exemplo')}</span>
            </div>
            <div className="demo-toolbar">
              <span>
                <SlidersHorizontal size={12} />
                {t('Filtro')}
              </span>
              <span className="demo-add">{t('+ Adicionar título')}</span>
            </div>
            {layout === 'list' ? (
              <div className="demo-list">
                <div className="demo-table-heading">
                  <span>{t('Nome')}</span>
                  <span>{t('Status')}</span>
                  <span>{t('Nota')}</span>
                  <span>{t('Progresso')}</span>
                </div>
                {entries.map((item, index) => (
                  <div
                    className={`demo-row ${active % entries.length === index ? 'demo-row-current' : ''}`}
                    key={item.title}
                  >
                    <span className="demo-row-name">
                      <span className={`demo-status-circle ${item.status}`} />
                      {t(item.title)}
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
                  {t('Adicionar título')}
                </div>
              </div>
            ) : (
              <div className="demo-gallery">
                {entries.map((item) => (
                  <div className="demo-poster" key={item.title}>
                    <MediaCover
                      title={t(item.title)}
                      url={coverFor(item.title)?.coverUrl ?? null}
                      layout={coverFor(item.title)?.coverAttribution?.layout}
                      large
                    />
                    <span>{t(item.title)}</span>
                    <small>{t(item.tag)}</small>
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
                {t('Suas experiências, organizadas.')}
                <small>{t('Lista e galeria. Uma só biblioteca.')}</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarketingSite() {
  const t = useT();
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
          <div className="hero-backdrop" aria-hidden="true">
            <span className="hero-blob hero-blob-a" />
            <span className="hero-blob hero-blob-b" />
            <span className="hero-blob hero-blob-c" />
          </div>
          <a
            className="marketing-pill"
            href="https://github.com/caio-kenai/Jinsei"
            target="_blank"
            rel="noreferrer"
          >
            <span className="pill-color-dot" />
            <span className="shiny-text">{t('Gratuito. Open source. Seu.')}</span>
            <ChevronRight size={14} />
          </a>
          <h1 aria-label={t('Um lugar para todas as suas histórias')}>
            <BlurText lines={[t('Um lugar para todas'), t('as suas histórias')]} delay={0.1} />
          </h1>
          <motion.p
            className="marketing-hero-subtitle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="sr-only">
              {t('Jogos, animes, mangás, filmes, séries, livros e muito mais.')}
            </span>
            <RotatingWord
              words={[t('Jogos'), t('Animes'), t('Mangás'), t('Filmes'), t('Séries'), t('Livros')]}
            />
            <span aria-hidden="true"> {t('e muito mais.')}</span>
          </motion.p>
          <motion.div
            className="marketing-hero-cta"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <GlowButton onClick={() => setSignup(true)}>{t('Comece agora. É GRÁTIS')}</GlowButton>
            <span>{t('Sem assinatura. Sem cartão de crédito.')}</span>
          </motion.div>
        </section>
        <section className="marketing-showcase">
          <div className="marketing-container">
            <ScrollLift>
              <ProductDemo />
            </ScrollLift>
            <div className="marketing-category-strip">
              <span>{t('PARA TODAS AS SUAS HISTÓRIAS')}</span>
              {categories.map(({ id, Icon }) => (
                <div key={id}>
                  <Icon size={23} />
                  {t(categoryLabels[id])}
                </div>
              ))}
            </div>
          </div>
        </section>
        <CategoryMarquee />
        <FeatureBento />
        <section className="marketing-section marketing-container" data-reveal>
          <header className="marketing-section-heading">
            <h2>
              {t('Menos listas espalhadas.')}
              <br />
              <span>{t('Mais histórias para viver.')}</span>
            </h2>
            <p>
              {t('Encontre o que você quer começar. Lembre do que já te marcou.')}
              <br />
              {t('Mantenha cada experiência no seu lugar.')}
            </p>
          </header>
          <div className="marketing-experience">
            <div className="experience-copy">
              <span className="marketing-section-tag">
                <Library size={15} />
                {t('Sua biblioteca')}
              </span>
              <h3>
                {t('De “um dia eu começo”')}
                <br />
                {t('a “nunca vou esquecer”.')}
              </h3>
              <p>
                {t(
                  'Organize seus títulos por status, guarde suas notas e registre seu progresso. Cada detalhe acompanha a sua jornada.',
                )}
              </p>
              <button className="public-text-link" onClick={() => setSignup(true)}>
                {t('Crie sua biblioteca')}
                <ArrowRight size={16} />
              </button>
            </div>
            <ExperienceShowcase />
          </div>
        </section>
        <HowItWorks />
        <section className="marketing-section marketing-personalization" data-reveal>
          <div className="marketing-container">
            <header className="marketing-section-heading">
              <h2>
                {t('Sua biblioteca.')}
                <br />
                <span>{t('As suas regras.')}</span>
              </h2>
              <p>
                {t('Escolha suas categorias, sua visualização e o seu tema.')}
                <br />
                {t('O Jinsei se adapta a você.')}
              </p>
            </header>
            <div className="marketing-feature-grid">
              <SpotlightCard>
                <ViewsSwitchArt />
                <h3>{t('Uma biblioteca, diferentes olhares.')}</h3>
                <p>
                  {t(
                    'Alterne entre a clareza da lista e o visual da galeria. Seus registros continuam no mesmo lugar.',
                  )}
                </p>
              </SpotlightCard>
              <SpotlightCard>
                <AccentArt />
                <h3>{t('Do seu jeito, em cada detalhe.')}</h3>
                <p>
                  {t(
                    'Temas claro e escuro, cores e categorias configuráveis. Um espaço que combina com você.',
                  )}
                </p>
              </SpotlightCard>
              <SpotlightCard>
                <PrivacyArt />
                <h3>{t('Suas histórias pertencem a você.')}</h3>
                <p>
                  {t(
                    'Biblioteca privada, anotações pessoais e exportação dos seus dados. Você mantém o controle.',
                  )}
                </p>
              </SpotlightCard>
            </div>
          </div>
        </section>
        <OpenSourceSection />
        <Faq />
        <ClosingShowcase onSignup={() => setSignup(true)} />
      </main>
      <PublicFooter />
      <SignupDialog open={signup} onOpenChange={setSignup} />
    </div>
  );
}
