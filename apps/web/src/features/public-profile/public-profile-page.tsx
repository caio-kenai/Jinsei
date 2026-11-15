'use client';
import { currentDateLocale, currentLocale } from '@/i18n/config';
import { useT } from '@/i18n/provider';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import {
  CalendarDays,
  CircleCheck,
  ExternalLink,
  FolderHeart,
  Heart,
  LayoutGrid,
  Library,
  ListOrdered,
  Star,
} from 'lucide-react';
import {
  categoryLabels,
  goalStateLabels,
  goalUnits,
  statusKeys,
  statusLabels,
  type MediaType,
  type PublicProfile,
} from '@jinsei/contracts';
import { PublicFooter, PublicHeader } from '@/features/presentation/public-navigation';
import { categoryIcons } from '@/components/shared/category-icons';
import { NumberTicker } from '@/components/motion/number-ticker';
import { MediaCover } from '@/features/library/media-cover';
import { StatusBadge } from '@/features/library/status-badge';
import { categoryColors, statusColors } from '@/lib/palette';
import { FriendButton } from '@/features/community/friend-button';
import { PublicWorkCard } from './public-work';

type Category = NonNullable<PublicProfile['statistics']>['categories'][number];
const ease = [0.22, 1, 0.36, 1] as const;
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

function StatusBar({ statuses }: { statuses: Category['statuses'] }) {
  const t = useT();
  const total = Object.values(statuses).reduce((sum, value) => sum + value, 0);
  return (
    <div className="profile-status">
      <div className="profile-status-bar">
        {statusKeys.map((status) =>
          statuses[status] ? (
            <motion.i
              key={status}
              style={{ background: statusColors[status] }}
              initial={{ width: 0 }}
              animate={{ width: `${(statuses[status] / Math.max(1, total)) * 100}%` }}
              transition={{ duration: 0.9, ease }}
            />
          ) : null,
        )}
      </div>
      <ul>
        {statusKeys.map((status) => (
          <li key={status}>
            <i style={{ background: statusColors[status] }} />
            {t(statusLabels[status])}
            <strong>{statuses[status].toLocaleString(currentLocale())}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryCard({ category, compact = false }: { category: Category; compact?: boolean }) {
  const t = useT();
  const Icon = categoryIcons[category.mediaType];
  return (
    <motion.article
      className={`profile-category-card ${compact ? 'is-compact' : ''}`}
      style={{ '--cat': categoryColors[category.mediaType] } as React.CSSProperties}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
    >
      <header>
        <span className="profile-category-icon">
          <Icon size={16} />
        </span>
        <h3>{t(categoryLabels[category.mediaType])}</h3>
        <span className="profile-category-score">
          <Star size={13} fill="currentColor" />
          {category.averageRating === null
            ? '—'
            : category.averageRating.toLocaleString(currentLocale(), { maximumFractionDigits: 2 })}
        </span>
      </header>
      <StatusBar statuses={category.statuses} />
      <dl>
        <div>
          <dt>{t('Total')}</dt>
          <dd>
            <NumberTicker value={category.total} />
          </dd>
        </div>
        <div>
          <dt>{t('Favoritos')}</dt>
          <dd>
            <NumberTicker value={category.favorites} />
          </dd>
        </div>
        {category.units.map((unit) => (
          <div key={unit.label}>
            <dt>{unit.label}</dt>
            <dd>
              <NumberTicker value={unit.value} decimals={Number.isInteger(unit.value) ? 0 : 1} />
            </dd>
          </div>
        ))}
      </dl>
    </motion.article>
  );
}

export function PublicProfilePage({ profile }: { profile: PublicProfile }) {
  const t = useT();
  const categories = useMemo(() => profile.statistics?.categories ?? [], [profile.statistics]);
  const present = useMemo(() => {
    const types = new Set<MediaType>([
      ...categories.map((row) => row.mediaType),
      ...(profile.favorites ?? []).map((work) => work.mediaType),
      ...(profile.history ?? []).map((work) => work.mediaType),
    ]);
    return [...types];
  }, [categories, profile.favorites, profile.history]);
  const [tab, setTab] = useState<'all' | MediaType>('all');
  const matches = (type: MediaType) => tab === 'all' || tab === type;
  const favorites = (profile.favorites ?? []).filter((work) => matches(work.mediaType));
  const history = (profile.history ?? []).filter((work) => matches(work.mediaType)).slice(0, 8);
  const reviews = (profile.reviews ?? []).filter((work) => matches(work.mediaType));
  const selected = categories.find((row) => row.mediaType === tab);
  return (
    <div className="public-surface public-profile">
      <PublicHeader />
      <div
        className="profile-banner"
        style={profile.bannerUrl ? { backgroundImage: `url(${profile.bannerUrl})` } : undefined}
      />
      <main className="marketing-container profile-layout">
        <aside className="profile-aside">
          <motion.div
            className="profile-avatar"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
          >
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Uploaded avatar served by the API
              <img src={profile.avatarUrl} alt="" />
            ) : (
              <span>{initials(profile.displayName)}</span>
            )}
          </motion.div>
          <h1>{profile.displayName}</h1>
          <p className="public-username">
            @{profile.username}
            {profile.title && <span className="profile-title-chip">{t(profile.title)}</span>}
          </p>
          <FriendButton username={profile.username} />
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          <dl className="profile-info">
            <div>
              <dt>
                <CalendarDays size={13} />
                {t('No Jinsei desde')}
              </dt>
              <dd>
                {format(parseISO(profile.memberSince), t("MMM 'de' yyyy"), {
                  locale: currentDateLocale(),
                })}
              </dd>
            </div>
            {profile.statistics && (
              <>
                <div>
                  <dt>
                    <Library size={13} />
                    {t('Títulos')}
                  </dt>
                  <dd>{profile.statistics.entries.toLocaleString(currentLocale())}</dd>
                </div>
                <div>
                  <dt>
                    <CircleCheck size={13} />
                    {t('Concluídos')}
                  </dt>
                  <dd>{profile.statistics.completed.toLocaleString(currentLocale())}</dd>
                </div>
                <div>
                  <dt>
                    <Star size={13} />
                    {t('Nota média')}
                  </dt>
                  <dd>
                    {profile.statistics.averageRating === null
                      ? '—'
                      : profile.statistics.averageRating.toLocaleString(currentLocale(), {
                          maximumFractionDigits: 2,
                        })}
                  </dd>
                </div>
              </>
            )}
          </dl>
          {profile.links.length > 0 && (
            <nav className="profile-links" aria-label={t('Links')}>
              {profile.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                >
                  {link.label}
                  <ExternalLink size={11} />
                </a>
              ))}
            </nav>
          )}
          {profile.collections.length > 0 && (
            <section className="profile-aside-section">
              <h2>{t('Coleções')}</h2>
              {profile.collections.map((collection) => (
                <Link
                  key={collection.slug}
                  href={`/u/${profile.username}/collections/${collection.slug}`}
                  className="profile-collection-link"
                >
                  {collection.ranked ? <ListOrdered size={15} /> : <FolderHeart size={15} />}
                  <span>
                    <strong>{collection.name}</strong>
                    <small>
                      {collection.itemCount}{' '}
                      {collection.itemCount === 1 ? t('título') : t('títulos')}
                    </small>
                  </span>
                </Link>
              ))}
            </section>
          )}
        </aside>
        <section className="profile-main">
          <nav className="profile-tabs" role="tablist" aria-label={t('Categorias do perfil')}>
            {(['all', ...present] as const).map((type) => {
              const Icon = type === 'all' ? LayoutGrid : categoryIcons[type];
              return (
                <button
                  key={type}
                  role="tab"
                  aria-selected={tab === type}
                  className={tab === type ? 'active' : ''}
                  style={
                    {
                      '--cat': type === 'all' ? '#7050cf' : categoryColors[type],
                    } as React.CSSProperties
                  }
                  onClick={() => setTab(type)}
                >
                  {tab === type && <motion.i layoutId="profile-tab" className="profile-tab-bg" />}
                  <Icon size={16} />
                  {type === 'all' ? t('Visão geral') : t(categoryLabels[type])}
                </button>
              );
            })}
          </nav>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              className="profile-panels"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {profile.statistics && (
                <section className="profile-panel">
                  <h2>{t('Estatísticas')}</h2>
                  {tab === 'all' ? (
                    categories.length ? (
                      <div className="profile-category-grid">
                        {categories.map((category) => (
                          <CategoryCard key={category.mediaType} category={category} compact />
                        ))}
                      </div>
                    ) : (
                      <p className="muted">{t('Nenhum título registrado ainda.')}</p>
                    )
                  ) : selected ? (
                    <CategoryCard category={selected} />
                  ) : (
                    <p className="muted">{t('Sem títulos nesta categoria.')}</p>
                  )}
                </section>
              )}
              {history.length > 0 && (
                <section className="profile-panel">
                  <h2>{t('Últimas atualizações')}</h2>
                  <ul className="profile-updates">
                    {history.map((item, index) => {
                      const content = (
                        <>
                          <MediaCover title={item.title} url={item.coverUrl} />
                          <span className="profile-update-main">
                            <strong>{item.title}</strong>
                            {item.progressPercent !== null && (
                              <span className="profile-update-track">
                                <motion.i
                                  style={{ background: statusColors[item.status] }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.progressPercent}%` }}
                                  transition={{ duration: 0.8, delay: index * 0.04, ease }}
                                />
                              </span>
                            )}
                            <small>
                              <StatusBadge status={item.status} />
                              {item.progressLabel}
                              {item.rating !== null &&
                                ` · ${item.rating.toLocaleString(currentLocale())} ★`}
                            </small>
                          </span>
                          <time dateTime={item.updatedAt}>
                            {formatDistanceToNowStrict(parseISO(item.updatedAt), {
                              addSuffix: true,
                              locale: currentDateLocale(),
                            })}
                          </time>
                        </>
                      );
                      return (
                        <motion.li
                          key={`${item.title}:${item.updatedAt}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.35, delay: index * 0.04, ease }}
                        >
                          {item.workId ? (
                            <Link href={`/obras/${item.workId}`}>{content}</Link>
                          ) : (
                            <div>{content}</div>
                          )}
                        </motion.li>
                      );
                    })}
                  </ul>
                </section>
              )}
              {favorites.length > 0 && (
                <section className="profile-panel">
                  <h2>
                    <Heart size={16} /> {t('Favoritos')}
                  </h2>
                  <div className="public-grid">
                    {favorites.map((work) => (
                      <PublicWorkCard key={`${work.mediaType}:${work.title}`} work={work} />
                    ))}
                  </div>
                </section>
              )}
              {reviews.length > 0 && (
                <section className="profile-panel">
                  <h2>{t('Reviews')}</h2>
                  <div className="public-reviews">
                    {reviews.map((review) => (
                      <PublicWorkCard key={`${review.mediaType}:${review.title}`} work={review}>
                        <p className="public-review">{review.review}</p>
                      </PublicWorkCard>
                    ))}
                  </div>
                </section>
              )}
              {tab === 'all' && profile.goals && profile.goals.length > 0 && (
                <section className="profile-panel">
                  <h2>{t('Metas')}</h2>
                  <ul className="public-goals">
                    {profile.goals.map((goal) => (
                      <li key={goal.name}>
                        <strong>{goal.name}</strong>
                        <span>
                          {goal.current.toLocaleString(currentLocale())} /{' '}
                          {goal.target.toLocaleString(currentLocale())} {goalUnits[goal.metric][1]}{' '}
                          · {t(goalStateLabels[goal.state])}
                        </span>
                        <span className="mission-track">
                          <span
                            style={{
                              width: `${Math.min(100, (goal.current / goal.target) * 100)}%`,
                            }}
                          />
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
