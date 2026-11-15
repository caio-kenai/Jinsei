'use client';
import { msg } from '@/i18n/config';
import { useT } from '@/i18n/provider';
import { useEffect, useState, type CSSProperties } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import {
  BookMarked,
  Check,
  Eye,
  Gamepad2,
  Heart,
  LayoutGrid,
  List,
  LockKeyhole,
  ShieldCheck,
  Tent,
  Tv,
  type LucideIcon,
} from 'lucide-react';
import type { StatusKey } from '@jinsei/contracts';
import { StarRating } from '@/components/shared/star-rating';
import { StatusBadge } from '@/features/library/status-badge';

const ease = [0.22, 1, 0.36, 1] as const;

/** Advances an index on a timer, paused when the visitor prefers reduced motion. */
function useCycle(length: number, interval: number) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % length), interval);
    return () => clearInterval(timer);
  }, [interval, length, reduce]);
  return [index, setIndex] as const;
}

const experiences: {
  title: string;
  category: string;
  Icon: LucideIcon;
  color: string;
  status: StatusKey;
  rating: number;
  ratingLabel: string;
  progressLabel: string;
  progressDetail: string;
  progress: number;
  favorite: boolean;
  note: string;
}[] = [
  {
    title: msg('Hollow Knight'),
    category: msg('Jogos'),
    Icon: Gamepad2,
    color: '#7050cf',
    status: 'in_progress',
    rating: 4.75,
    ratingLabel: '4¾ / 5',
    progressLabel: '32,5 horas',
    progressDetail: msg('64% concluído'),
    progress: 64,
    favorite: true,
    note: msg(
      'Explorar os caminhos que ficaram para trás. Uma jornada para aproveitar sem pressa.',
    ),
  },
  {
    title: msg('Frieren'),
    category: msg('Animes'),
    Icon: Tv,
    color: '#e5306f',
    status: 'in_progress',
    rating: 5,
    ratingLabel: '5 / 5',
    progressLabel: msg('Episódio 17 de 28'),
    progressDetail: 'Temporada 1',
    progress: 61,
    favorite: true,
    note: msg('Ver de novo o episódio do campo de flores com alguém que ainda não conhece.'),
  },
  {
    title: msg('Duna'),
    category: msg('Livros'),
    Icon: BookMarked,
    color: '#c77c02',
    status: 'completed',
    rating: 4.5,
    ratingLabel: '4½ / 5',
    progressLabel: msg('680 de 680 páginas'),
    progressDetail: msg('Concluído em março'),
    progress: 100,
    favorite: false,
    note: msg('Ler “O Messias de Duna” nas próximas férias.'),
  },
];

/** The library entry panel cycling through a game, an anime and a book. */
export function ExperienceShowcase() {
  const t = useT();
  const [index, setIndex] = useCycle(experiences.length, 4800);
  const item = experiences[index];
  return (
    <div className="experience-showcase" style={{ '--item': item.color } as CSSProperties}>
      <div className="experience-switch" role="tablist" aria-label={t('Exemplos de títulos')}>
        {experiences.map((entry, position) => (
          <button
            key={entry.title}
            role="tab"
            aria-selected={position === index}
            className={position === index ? 'active' : ''}
            style={{ '--item': entry.color } as CSSProperties}
            onClick={() => setIndex(position)}
          >
            <entry.Icon size={13} />
            <span>{t(entry.category)}</span>
            {position === index && (
              <motion.span layoutId="experience-switch" className="experience-switch-bg" />
            )}
          </button>
        ))}
      </div>
      <div className="experience-panel">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.4, ease }}
          >
            <div className="experience-panel-header">
              <span className="experience-icon">
                <item.Icon size={15} />
              </span>
              <strong>{t(item.title)}</strong>
              <motion.span
                className="experience-heart"
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.25 }}
              >
                <Heart size={15} fill={item.favorite ? 'currentColor' : 'none'} />
              </motion.span>
            </div>
            <div className="experience-field">
              <span>{t('Status')}</span>
              <StatusBadge status={item.status} />
            </div>
            <div className="experience-field">
              <span>{t('Sua nota')}</span>
              <strong className="experience-stars">
                <StarRating value={item.rating} size={14} /> <span>{item.ratingLabel}</span>
              </strong>
            </div>
            <div className="experience-field">
              <span>{t('Progresso')}</span>
              <div className="experience-progress">
                <span>
                  <b>{t(item.progressLabel)}</b>
                  <small>{t(item.progressDetail)}</small>
                </span>
                <i>
                  <motion.b
                    initial={{ width: 0 }}
                    animate={{ width: `${item.progress}%` }}
                    transition={{ duration: 1.1, ease, delay: 0.15 }}
                  />
                </i>
              </div>
            </div>
            <div className="experience-note">
              <span>
                <LockKeyhole size={12} />
                {t('Anotação privada · Exemplo')}
              </span>
              <p>{t(item.note)}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

const tiles = ['#7050cf', '#e5306f', '#f7832b', '#2f7bff', '#15936a', '#c77c02'];

/** A tiny library that keeps switching between list and gallery. */
export function ViewsSwitchArt() {
  const t = useT();
  const [mode] = useCycle(2, 2600);
  const gallery = mode === 1;
  return (
    <div className="feature-art feature-art-switch">
      <div className="mini-view-tabs">
        <span className={!gallery ? 'active' : ''}>
          <List size={13} />
          {t('Lista')}
        </span>
        <span className={gallery ? 'active' : ''}>
          <LayoutGrid size={13} />
          {t('Galeria')}
        </span>
      </div>
      <LayoutGroup>
        <div className={`mini-views ${gallery ? 'is-gallery' : 'is-list'}`}>
          {tiles.map((color) => (
            <motion.span
              key={color}
              layout
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              style={{ '--tile': color } as CSSProperties}
            >
              <motion.i layout />
              {!gallery && <motion.b layout />}
            </motion.span>
          ))}
        </div>
      </LayoutGroup>
    </div>
  );
}

const accents = ['#7050cf', '#e5306f', '#1090e0', '#f7832b', '#0f9d9f', '#3db88b'];

/** A mini interface repainted by each accent color in turn. */
export function AccentArt() {
  const t = useT();
  const [index, setIndex] = useCycle(accents.length, 1700);
  const color = accents[index];
  return (
    <div
      className="feature-art feature-art-accent"
      style={{ '--accent-demo': color } as CSSProperties}
    >
      <div className="mini-app">
        <span className="mini-app-title" />
        <span className="mini-app-button">{t('+ Adicionar')}</span>
        <span className="mini-app-track">
          <i />
        </span>
        <span className="mini-app-toggle">
          <i />
        </span>
      </div>
      <div className="mini-accent-dots">
        {accents.map((value, position) => (
          <button
            key={value}
            type="button"
            aria-label={`Cor ${position + 1}`}
            className={position === index ? 'active' : ''}
            style={{ background: value, color: value }}
            onClick={() => setIndex(position)}
          />
        ))}
      </div>
    </div>
  );
}

const privacyRows = [
  { label: msg('Biblioteca'), state: msg('Privada'), Icon: LockKeyhole },
  { label: msg('Anotações'), state: msg('Só você'), Icon: ShieldCheck },
  { label: msg('Perfil público'), state: msg('Se você quiser'), Icon: Eye },
];

/** Privacy switches lighting up one after another. */
export function PrivacyArt() {
  const t = useT();
  const [index] = useCycle(privacyRows.length + 1, 1300);
  return (
    <div className="feature-art feature-art-locks">
      {privacyRows.map(({ label, state, Icon }, position) => {
        const on = position < index || index === privacyRows.length;
        return (
          <div key={label} className={`mini-lock ${on ? 'on' : ''}`}>
            <Icon size={14} />
            <span>{t(label)}</span>
            <small>{t(state)}</small>
            <span className="mini-lock-switch">
              <motion.i layout transition={{ type: 'spring', stiffness: 600, damping: 32 }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

const chat = [
  { mine: false, text: msg('Terminei Frieren ontem 😭') },
  { mine: true, text: msg('O episódio 10 é o melhor!') },
  { mine: false, text: msg('Bora criar um clube?') },
];

/** Friends talking and a club forming. */
export function CommunityArt() {
  const t = useT();
  const [step] = useCycle(chat.length + 2, 1400);
  return (
    <div className="bento-art community-art">
      <div className="community-art-chat">
        <AnimatePresence initial={false}>
          {chat.slice(0, Math.min(step + 1, chat.length)).map((message) => (
            <motion.span
              key={message.text}
              className={message.mine ? 'mine' : ''}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            >
              {t(message.text)}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {step >= chat.length && (
          <motion.div
            className="community-art-club"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease }}
          >
            <Tent size={14} />
            {t('Clube de animes')}
            <span>
              <Check size={11} /> {t('2 membros')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
