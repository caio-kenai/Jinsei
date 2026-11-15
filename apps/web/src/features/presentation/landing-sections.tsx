'use client';
import { msg } from '@/i18n/config';
import { useT } from '@/i18n/provider';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  BookMarked,
  BookOpen,
  ChartColumn,
  MessageSquareText,
  Palette,
  Tent,
  UsersRound,
  CalendarDays,
  Check,
  ChevronDown,
  Clapperboard,
  Code2,
  Columns3,
  Film,
  Flame,
  FolderHeart,
  Gamepad2,
  Globe,
  HeartHandshake,
  LayoutGrid,
  List,
  LockKeyhole,
  Server,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Tv,
  UserRound,
} from 'lucide-react';
import { NumberTicker } from '@/components/motion/number-ticker';
import { CommunityArt } from './landing-showcase';

const ease = [0.22, 1, 0.36, 1] as const;
const reveal = {
  initial: { opacity: 0, y: 26, filter: 'blur(6px)' },
  whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
  viewport: { once: true, margin: '0px 0px -80px 0px' },
};

export const categoryPalette = {
  games: '#7050cf',
  anime: '#e5306f',
  manga: '#f7832b',
  movies: '#2f7bff',
  series: '#15936a',
  books: '#c77c02',
} as const;

function SectionHeading({
  eyebrow,
  title,
  accent,
  text,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  text: string;
}) {
  const t = useT();
  return (
    <motion.header className="landing-heading" {...reveal} transition={{ duration: 0.7, ease }}>
      <span className="landing-eyebrow">{t(eyebrow)}</span>
      <h2>
        {t(title)}
        <br />
        <span>{t(accent)}</span>
      </h2>
      <p>{t(text)}</p>
    </motion.header>
  );
}

/** Mini demo: the same library cycling through list, gallery, board and calendar. */
function ViewsArt() {
  const reduce = useReducedMotion();
  const views = [
    { id: 'list', Icon: List },
    { id: 'gallery', Icon: LayoutGrid },
    { id: 'board', Icon: Columns3 },
    { id: 'calendar', Icon: CalendarDays },
  ] as const;
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % views.length), 2200);
    return () => clearInterval(timer);
  }, [reduce, views.length]);
  const view = views[index].id;
  const colors = Object.values(categoryPalette);
  return (
    <div className="bento-art views-art">
      <div className="views-tabs">
        {views.map(({ id, Icon }, tab) => (
          <span key={id} className={tab === index ? 'active' : ''}>
            <Icon size={13} />
            {tab === index && <motion.i layoutId="views-art-tab" className="views-tab-bg" />}
          </span>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          className={`views-stage views-${view}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease }}
        >
          {Array.from({ length: view === 'calendar' ? 14 : 6 }, (_, item) => (
            <motion.i
              key={item}
              style={{ '--tile': colors[item % colors.length] } as React.CSSProperties}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: item * 0.04, duration: 0.3, ease }}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Mini demo: progress measured the way each category is consumed. */
function ProgressArt() {
  const t = useT();
  const rows = [
    { label: t('Horas · Hollow Knight'), value: 64, color: categoryPalette.games, Icon: Gamepad2 },
    { label: t('Episódios · Frieren'), value: 82, color: categoryPalette.anime, Icon: Tv },
    { label: t('Capítulos · Berserk'), value: 45, color: categoryPalette.manga, Icon: BookOpen },
    { label: t('Páginas · Duna'), value: 38, color: categoryPalette.books, Icon: BookMarked },
  ];
  return (
    <div className="bento-art progress-art">
      {rows.map(({ label, value, color, Icon }, index) => (
        <div key={label} className="progress-art-row">
          <span style={{ color }}>
            <Icon size={14} />
          </span>
          <div>
            <small>{t(label)}</small>
            <i>
              <motion.b
                style={{ background: color }}
                initial={{ width: 0 }}
                whileInView={{ width: `${value}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, delay: 0.15 + index * 0.12, ease }}
              />
            </i>
          </div>
          <strong>{value}%</strong>
        </div>
      ))}
    </div>
  );
}

/** Mini demo: a ranking that reorders itself. */
function RankingArt() {
  const t = useT();
  const reduce = useReducedMotion();
  const [items, setItems] = useState([
    { title: t('Hades'), color: categoryPalette.games },
    { title: t('Frieren'), color: categoryPalette.anime },
    { title: t('Interestelar'), color: categoryPalette.movies },
    { title: t('Dom Casmurro'), color: categoryPalette.books },
  ]);
  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(
      () => setItems((current) => [current[1], current[0], current[3], current[2]]),
      2600,
    );
    return () => clearInterval(timer);
  }, [reduce]);
  return (
    <div className="bento-art ranking-art">
      {items.map((item, index) => (
        <motion.div
          layout
          key={item.title}
          className="ranking-art-row"
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        >
          <strong>{index + 1}</strong>
          <span style={{ background: item.color }} />
          {t(item.title)}
          {index === 0 && <Trophy size={14} className="ranking-trophy" />}
        </motion.div>
      ))}
    </div>
  );
}

/** Mini demo: goal ring, level and streak. */
function JourneyArt() {
  const t = useT();
  const circumference = 2 * Math.PI * 34;
  return (
    <div className="bento-art journey-art">
      <svg viewBox="0 0 80 80" className="journey-art-ring" aria-hidden="true">
        <circle cx="40" cy="40" r="34" />
        <motion.circle
          cx="40"
          cy="40"
          r="34"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          whileInView={{ strokeDashoffset: circumference * 0.28 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease }}
        />
      </svg>
      <div className="journey-art-body">
        <span className="journey-art-level">
          {t('Nível')} <NumberTicker value={12} />
        </span>
        <span className="journey-art-streak">
          <Flame size={14} />
          <NumberTicker value={27} /> {t('dias seguidos')}
        </span>
        <ul>
          {[t('Avalie 1 título'), t('Avance 3 capítulos'), t('Conclua uma meta')].map(
            (mission, index) => (
              <motion.li
                key={mission}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + index * 0.15, duration: 0.4, ease }}
              >
                <span className={index < 2 ? 'done' : ''}>{index < 2 && <Check size={10} />}</span>
                {mission}
              </motion.li>
            ),
          )}
        </ul>
      </div>
    </div>
  );
}

/** Mini demo: colorful statistics. */
function StatsArt() {
  const t = useT();
  const bars = [32, 58, 41, 76, 64, 88, 52];
  const colors = Object.values(categoryPalette);
  return (
    <div className="bento-art stats-art">
      <div className="stats-art-bars">
        {bars.map((value, index) => (
          <motion.i
            key={index}
            style={{ background: colors[index % colors.length] }}
            initial={{ height: 0 }}
            whileInView={{ height: `${value}%` }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.07, duration: 0.8, ease }}
          />
        ))}
      </div>
      <div className="stats-art-numbers">
        <span>
          <strong>
            <NumberTicker value={248} />
          </strong>
          {t('títulos')}
        </span>
        <span>
          <strong>
            <NumberTicker value={4.6} decimals={1} />
          </strong>
          {t('nota média')}
        </span>
      </div>
    </div>
  );
}

/** Mini demo: a public profile card. */
function ProfileArt() {
  const t = useT();
  return (
    <div className="bento-art profile-art">
      <div className="profile-art-banner" />
      <div className="profile-art-avatar">
        <UserRound size={20} />
      </div>
      <strong>{t('@alex')}</strong>
      <div className="profile-art-tabs">
        {Object.entries(categoryPalette).map(([key, color]) => (
          <i key={key} style={{ background: color }} />
        ))}
      </div>
    </div>
  );
}

const bento = [
  {
    title: msg('Lista, galeria, quadro e calendário'),
    text: msg(
      'Veja a mesma biblioteca do jeito que fizer sentido agora, com visualizações salvas.',
    ),
    Art: ViewsArt,
    wide: true,
  },
  {
    title: msg('Progresso que entende cada mídia'),
    text: msg('Horas, episódios, temporadas, capítulos, volumes, páginas e sessões.'),
    Art: ProgressArt,
  },
  {
    title: msg('Coleções e rankings'),
    text: msg('Monte listas temáticas e seus tops pessoais, misturando categorias.'),
    Art: RankingArt,
  },
  {
    title: msg('Metas, missões e sequência'),
    text: msg('Níveis, insígnias, missões diárias e uma sequência para manter o ritmo.'),
    Art: JourneyArt,
    wide: true,
  },
  {
    title: msg('Estatísticas coloridas'),
    text: msg('Sua jornada em números, por status, categoria, nota e mês.'),
    Art: StatsArt,
  },
  {
    title: msg('Perfil para compartilhar'),
    text: msg('Mostre favoritos, coleções e resenhas só se e quando quiser.'),
    Art: ProfileArt,
  },
  {
    title: msg('Amigos, conversas e clubes'),
    text: msg(
      'Veja o que seus amigos estão vivendo, converse e reúna gente que gosta das mesmas histórias.',
    ),
    Art: CommunityArt,
  },
];

export function FeatureBento() {
  const t = useT();
  return (
    <section className="landing-section marketing-container" id="recursos">
      <SectionHeading
        eyebrow={t('TUDO EM UM SÓ LUGAR')}
        title={t('Feito para quem vive')}
        accent={t('muitas histórias ao mesmo tempo.')}
        text={t(
          'Do primeiro registro à estatística do ano, cada parte do Jinsei acompanha o seu ritmo.',
        )}
      />
      <div className="bento-grid">
        {bento.map(({ title, text, Art, wide }, index) => (
          <motion.article
            key={title}
            className={`bento-card ${wide ? 'bento-wide' : ''}`}
            {...reveal}
            transition={{ duration: 0.7, delay: (index % 3) * 0.08, ease }}
            onPointerMove={(event) => {
              const box = event.currentTarget.getBoundingClientRect();
              event.currentTarget.style.setProperty('--spot-x', `${event.clientX - box.left}px`);
              event.currentTarget.style.setProperty('--spot-y', `${event.clientY - box.top}px`);
            }}
          >
            <Art />
            <h3>{t(title)}</h3>
            <p>{t(text)}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

const marqueeItems = [
  { label: msg('Jogos'), Icon: Gamepad2, color: categoryPalette.games },
  { label: msg('Animes'), Icon: Tv, color: categoryPalette.anime },
  { label: msg('Mangás'), Icon: BookOpen, color: categoryPalette.manga },
  { label: msg('Filmes'), Icon: Film, color: categoryPalette.movies },
  { label: msg('Séries'), Icon: Clapperboard, color: categoryPalette.series },
  { label: msg('Livros'), Icon: BookMarked, color: categoryPalette.books },
  { label: msg('Coleções'), Icon: FolderHeart, color: '#e5306f' },
  { label: msg('Metas'), Icon: Target, color: '#2f7bff' },
  { label: msg('Jornada'), Icon: Sparkles, color: '#7050cf' },
];
const featureItems = [
  { label: msg('Amigos'), Icon: UsersRound, color: '#2f7bff' },
  { label: msg('Clubes'), Icon: Tent, color: '#f7832b' },
  { label: msg('Rankings'), Icon: Trophy, color: '#c77c02' },
  { label: msg('Reviews'), Icon: MessageSquareText, color: '#e5306f' },
  { label: msg('Estatísticas'), Icon: ChartColumn, color: '#15936a' },
  { label: msg('Temas'), Icon: Palette, color: '#7050cf' },
  { label: msg('Perfil público'), Icon: UserRound, color: '#0e9aa7' },
  { label: msg('Seus dados'), Icon: ShieldCheck, color: '#595d66' },
];

function MarqueeRow({ items, reverse }: { items: typeof marqueeItems; reverse?: boolean }) {
  const t = useT();
  // Two identical halves, each wider than any screen, make the loop seamless.
  const half = [...items, ...items, ...items];
  return (
    <div className={`landing-marquee-track ${reverse ? 'is-reverse' : ''}`}>
      {[0, 1].map((copy) => (
        <div className="landing-marquee-group" key={copy}>
          {half.map(({ label, Icon, color }, index) => (
            <span key={`${label}-${index}`} style={{ '--chip': color } as React.CSSProperties}>
              <Icon size={16} />
              {t(label)}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Endless ribbons of everything Jinsei organizes (Magic UI's Marquee). */
export function CategoryMarquee() {
  return (
    <div className="landing-marquee" aria-hidden="true">
      <MarqueeRow items={marqueeItems} />
      <MarqueeRow items={featureItems} reverse />
    </div>
  );
}

const steps = [
  {
    title: msg('Crie sua conta'),
    text: msg('Grátis, sem cartão e sem anúncios. Seus dados começam privados.'),
  },
  {
    title: msg('Escolha suas categorias'),
    text: msg('Ative só o que você acompanha e defina tema, cores e visualização.'),
  },
  {
    title: msg('Adicione e acompanhe'),
    text: msg('Busque nos catálogos abertos, registre progresso, notas e lembranças.'),
  },
];

export function HowItWorks() {
  const t = useT();
  return (
    <section className="landing-section marketing-container">
      <SectionHeading
        eyebrow={t('COMO FUNCIONA')}
        title={t('Três passos.')}
        accent={t('E a sua história ganha um lugar.')}
        text={t('Comece em menos de um minuto e personalize tudo depois, quando quiser.')}
      />
      <ol className="steps">
        <motion.span
          className="steps-line"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: '0px 0px -120px 0px' }}
          transition={{ duration: 1.2, ease }}
          aria-hidden="true"
        />
        {steps.map((step, index) => (
          <motion.li
            key={step.title}
            {...reveal}
            transition={{ duration: 0.6, delay: 0.2 + index * 0.18, ease }}
          >
            <span className="step-number">{index + 1}</span>
            <h3>{t(step.title)}</h3>
            <p>{t(step.text)}</p>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

const pillars = [
  {
    Icon: HeartHandshake,
    title: msg('Gratuito de verdade'),
    text: msg(
      'Sem assinatura, sem recursos pagos e sem anúncios. O apoio é voluntário pelo Buy Me a Monster.',
    ),
  },
  {
    Icon: Code2,
    title: msg('Código aberto'),
    text: msg('Todo o código está no GitHub. Qualquer pessoa pode auditar, sugerir e contribuir.'),
  },
  {
    Icon: ShieldCheck,
    title: msg('Privacidade e LGPD'),
    text: msg(
      'Biblioteca privada por padrão, exportação dos seus dados e exclusão de conta quando quiser.',
    ),
  },
  {
    Icon: Server,
    title: msg('Hospede você mesmo'),
    text: msg(
      'Imagens Docker prontas, PostgreSQL e HTTPS opcional para ter a sua própria instância.',
    ),
  },
];

export function OpenSourceSection() {
  const t = useT();
  const numbers = [
    { value: 6, label: 'categorias' },
    { value: 4, label: t('visualizações') },
    { value: 0, label: t('anúncios') },
    { value: 100, label: '% gratuito' },
  ];
  return (
    <section className="landing-section landing-open">
      <div className="marketing-container">
        <SectionHeading
          eyebrow={t('FEITO EM COMUNIDADE')}
          title={t('Seu, de verdade.')}
          accent={t('Aberto, gratuito e respeitoso.')}
          text={t(
            'O Jinsei não vende seus dados nem sua atenção. Ele existe para organizar a sua jornada.',
          )}
        />
        <div className="open-numbers">
          {numbers.map(({ value, label }, index) => (
            <motion.div
              key={label}
              {...reveal}
              transition={{ duration: 0.6, delay: index * 0.08, ease }}
            >
              <strong>
                <NumberTicker value={value} />
              </strong>
              <span>{t(label)}</span>
            </motion.div>
          ))}
        </div>
        <div className="open-pillars">
          {pillars.map(({ Icon, title, text }, index) => (
            <motion.article
              key={title}
              {...reveal}
              transition={{ duration: 0.6, delay: index * 0.08, ease }}
            >
              <span className="open-icon">
                <Icon size={20} />
              </span>
              <h3>{t(title)}</h3>
              <p>{t(text)}</p>
            </motion.article>
          ))}
        </div>
        <motion.a
          className="open-github"
          href="https://github.com/caio-kenai/Jinsei"
          target="_blank"
          rel="noreferrer"
          {...reveal}
          transition={{ duration: 0.6, ease }}
        >
          <Globe size={16} />
          {t('Ver o código no GitHub')}
        </motion.a>
      </div>
    </section>
  );
}

const faq = [
  {
    question: msg('O Jinsei é mesmo gratuito?'),
    answer: msg(
      'Sim. Não há plano pago nem recurso bloqueado. Quem quiser pode apoiar o criador pelo Buy Me a Monster, de forma voluntária.',
    ),
  },
  {
    question: msg('Quais mídias posso organizar?'),
    answer: msg(
      'Jogos, animes, mangás, filmes, séries e livros, cada um com o progresso adequado. Você ativa só as categorias que usa.',
    ),
  },
  {
    question: msg('De onde vêm as capas e informações?'),
    answer: msg(
      'De catálogos abertos como Wikidata, TVmaze e Open Library, com os devidos créditos. Também dá para cadastrar manualmente.',
    ),
  },
  {
    question: msg('Outras pessoas veem minha biblioteca?'),
    answer: msg(
      'Não, ela é privada por padrão. O perfil público só mostra o que você decidir publicar, como favoritos, coleções e resenhas.',
    ),
  },
  {
    question: msg('Posso levar meus dados embora?'),
    answer: msg(
      'Pode. Exporte sua biblioteca, coleções, metas e histórico a qualquer momento, ou exclua sua conta nas configurações.',
    ),
  },
  {
    question: msg('Posso instalar no meu servidor?'),
    answer: msg(
      'Sim. Cada versão publica imagens Docker e um pacote self-host com guia de instalação, backup e atualização.',
    ),
  },
];

export function Faq() {
  const t = useT();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="landing-section marketing-container landing-faq">
      <SectionHeading
        eyebrow={t('PERGUNTAS FREQUENTES')}
        title={t('Ficou alguma dúvida?')}
        accent={t('A gente responde.')}
        text={t('O essencial sobre o Jinsei, sem letras miúdas.')}
      />
      <div className="faq-list">
        {faq.map(({ question, answer }, index) => {
          const expanded = open === index;
          return (
            <motion.div
              key={question}
              className={`faq-item ${expanded ? 'open' : ''}`}
              {...reveal}
              transition={{ duration: 0.5, delay: index * 0.05, ease }}
            >
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : index)}
              >
                {t(question)}
                <ChevronDown size={18} />
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    className="faq-answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.32, ease }}
                  >
                    <p>{t(answer)}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
      <p className="faq-privacy">
        <LockKeyhole size={13} />
        {t('Leia também a política de privacidade e os termos de uso no rodapé.')}
      </p>
    </section>
  );
}
