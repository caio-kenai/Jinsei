'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BookmarkPlus,
  Check,
  ChevronDown,
  ExternalLink,
  Heart,
  LoaderCircle,
  Medal,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  Users,
  Scale,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  categoryLabels,
  recommendationLabels,
  statusKeys,
  statusLabels,
  type LibraryEntry,
  type PublicWorkPage,
  type Recommendation,
  type WorkReview,
} from '@jinsei/contracts';
import { api, ApiError } from '@/lib/api';
import { categoryColors, statusColors } from '@/lib/palette';
import { categoryIcons } from '@/components/shared/category-icons';
import { StarRating } from '@/components/shared/star-rating';
import { MediaCover } from '@/features/library/media-cover';
import { StatusBadge } from '@/features/library/status-badge';
import { PublicFooter, PublicHeader } from '@/features/presentation/public-navigation';
import { SignupDialog } from '@/features/auth/signup-dialog';
import { NumberTicker } from '@/components/motion/number-ticker';

const recommendationIcons: Record<Recommendation, typeof ThumbsUp> = {
  recommended: ThumbsUp,
  mixed: Scale,
  not_recommended: ThumbsDown,
};
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

function LibraryButton({ work }: { work: PublicWorkPage }) {
  const client = useQueryClient();
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const membership = useQuery({
    queryKey: ['work-entry', work.id],
    queryFn: async () => {
      try {
        return await api<{ entry: LibraryEntry | null }>(`/library/works/${work.id}`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return { entry: null, guest: true };
        throw error;
      }
    },
    retry: false,
  });
  const entry = membership.data?.entry;
  const guest = Boolean(membership.data && 'guest' in membership.data);
  async function add() {
    if (guest) return setSignup(true);
    setBusy(true);
    try {
      const created = await api<LibraryEntry>('/library/entries', {
        method: 'POST',
        body: JSON.stringify({ mediaId: work.id, status: 'planned' }),
      });
      client.setQueryData(['work-entry', work.id], { entry: created });
      void client.invalidateQueries({ queryKey: ['library'] });
      toast.success('Adicionado à sua biblioteca');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível adicionar');
    } finally {
      setBusy(false);
    }
  }
  if (membership.isPending)
    return (
      <span className="work-library-button is-loading">
        <LoaderCircle size={15} className="spin" />
      </span>
    );
  if (entry)
    return (
      <Link
        className="work-library-button is-member"
        href={`/library/${work.mediaType}?entry=${entry.id}`}
      >
        <Check size={15} />
        Na sua biblioteca · {statusLabels[entry.status]}
      </Link>
    );
  return (
    <>
      <button type="button" className="work-library-button" onClick={add} disabled={busy}>
        {busy ? <LoaderCircle size={15} className="spin" /> : <BookmarkPlus size={15} />}
        Adicionar à minha biblioteca
      </button>
      <SignupDialog open={signup} onOpenChange={setSignup} />
    </>
  );
}

function Review({ review }: { review: WorkReview }) {
  const [open, setOpen] = useState(false);
  const long = review.text.length > 420;
  const Icon = review.recommendation ? recommendationIcons[review.recommendation] : null;
  return (
    <motion.article
      className="work-review"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <header>
        <Link href={`/u/${review.author.username}`} className="work-review-author">
          {review.author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Avatar served by the API
            <img src={review.author.avatarUrl} alt="" />
          ) : (
            <span>{initials(review.author.displayName)}</span>
          )}
          <strong>{review.author.displayName}</strong>
          <small>@{review.author.username}</small>
        </Link>
        <time dateTime={review.updatedAt}>
          {format(parseISO(review.updatedAt), "d 'de' MMM yyyy", { locale: ptBR })}
        </time>
      </header>
      <div className="work-review-meta">
        {review.recommendation && Icon && (
          <span className={`work-recommendation is-${review.recommendation}`}>
            <Icon size={13} />
            {recommendationLabels[review.recommendation]}
          </span>
        )}
        <StatusBadge status={review.status} />
        {review.rating !== null && <StarRating value={review.rating} size={12} />}
      </div>
      <p className={open || !long ? '' : 'is-clamped'}>{review.text}</p>
      {long && (
        <button type="button" className="work-review-more" onClick={() => setOpen(!open)}>
          {open ? 'Mostrar menos' : 'Ler mais'}
          <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : undefined }} />
        </button>
      )}
    </motion.article>
  );
}

const tabs = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'cast', label: 'Personagens e equipe' },
  { id: 'reviews', label: 'Reviews' },
] as const;

export function WorkPage({ work }: { work: PublicWorkPage }) {
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('overview');
  const { community, detail } = work;
  const Icon = categoryIcons[work.mediaType];
  const color = categoryColors[work.mediaType];
  const totalReviews = Object.values(work.reviewCounts).reduce((sum, value) => sum + value, 0);
  const statusTotal = Object.values(community.statuses).reduce((sum, value) => sum + value, 0);
  const scores = [
    {
      label: 'Nota Jinsei',
      value: community.average,
      decimals: 2,
      suffix: ' ★',
      hint: `${community.ratings.toLocaleString('pt-BR')} ${community.ratings === 1 ? 'avaliação' : 'avaliações'}`,
      Icon: Star,
      color: '#e8a400',
    },
    {
      label: 'Ranking',
      value: community.rank,
      prefix: '#',
      hint: categoryLabels[work.mediaType],
      Icon: Trophy,
      color: '#7050cf',
    },
    {
      label: 'Popularidade',
      value: community.popularity,
      prefix: '#',
      hint: 'por membros',
      Icon: Medal,
      color: '#e5306f',
    },
    {
      label: 'Membros',
      value: community.members,
      hint: `${community.favorites.toLocaleString('pt-BR')} favoritos`,
      Icon: Users,
      color: '#2f7bff',
    },
  ];
  return (
    <div
      className="public-surface work-surface"
      style={{ '--work-color': color } as React.CSSProperties}
    >
      <PublicHeader />
      <div className="work-backdrop" aria-hidden="true">
        {work.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- Decorative blurred cover
          <img src={work.coverUrl} alt="" referrerPolicy="no-referrer" />
        )}
      </div>
      <main className="marketing-container work-page">
        <aside className="work-aside">
          <motion.div
            className="work-cover"
            initial={{ opacity: 0, y: 16, rotate: -1.5 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <MediaCover
              title={work.title}
              url={work.coverUrl}
              large
              layout={work.coverAttribution?.layout}
            />
          </motion.div>
          <LibraryButton work={work} />
          <section className="work-facts">
            <h2>Informações</h2>
            <dl>
              <div>
                <dt>Categoria</dt>
                <dd>{categoryLabels[work.mediaType]}</dd>
              </div>
              {detail.facts.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>
          {detail.genres.length > 0 && (
            <section className="work-facts">
              <h2>Gêneros</h2>
              <div className="work-genres">
                {detail.genres.map((genre) => (
                  <span key={genre}>{genre}</span>
                ))}
              </div>
            </section>
          )}
          {detail.links.length > 0 && (
            <section className="work-facts">
              <h2>Links</h2>
              <div className="work-links">
                {detail.links.map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                    {link.label}
                    <ExternalLink size={12} />
                  </a>
                ))}
              </div>
            </section>
          )}
        </aside>
        <div className="work-main">
          <motion.header
            className="work-heading"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="work-type">
              <Icon size={14} />
              {categoryLabels[work.mediaType]}
              {work.releaseYear && <> · {work.releaseYear}</>}
            </span>
            <h1>{work.title}</h1>
          </motion.header>
          <div className="work-scores">
            {scores.map(
              (
                { label, value, decimals, prefix, suffix, hint, Icon: ScoreIcon, color: tone },
                index,
              ) => (
                <motion.div
                  key={label}
                  className="work-score"
                  style={{ '--tile-color': tone } as React.CSSProperties}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.45,
                    delay: 0.1 + index * 0.06,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <span className="work-score-icon">
                    <ScoreIcon size={15} />
                  </span>
                  <span className="work-score-label">{label}</span>
                  <strong>
                    {value === null ? (
                      '—'
                    ) : (
                      <>
                        {prefix}
                        <NumberTicker value={value} decimals={decimals ?? 0} />
                        {suffix}
                      </>
                    )}
                  </strong>
                  <small>{hint}</small>
                </motion.div>
              ),
            )}
            {detail.externalScore && (
              <motion.div
                className="work-score"
                style={{ '--tile-color': '#15936a' } as React.CSSProperties}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="work-score-icon">
                  <Heart size={15} />
                </span>
                <span className="work-score-label">{detail.externalScore.source}</span>
                <strong>
                  <NumberTicker value={detail.externalScore.value} decimals={1} />
                  <small>/{detail.externalScore.max}</small>
                </strong>
                <small>nota externa</small>
              </motion.div>
            )}
          </div>
          {statusTotal > 0 && (
            <div className="work-statuses">
              <div className="work-status-bar">
                {statusKeys.map((status) =>
                  community.statuses[status] ? (
                    <motion.i
                      key={status}
                      style={{ background: statusColors[status] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(community.statuses[status] / statusTotal) * 100}%` }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      title={`${statusLabels[status]}: ${community.statuses[status]}`}
                    />
                  ) : null,
                )}
              </div>
              <ul>
                {statusKeys.map((status) => (
                  <li key={status}>
                    <i style={{ background: statusColors[status] }} />
                    {statusLabels[status]}
                    <strong>{community.statuses[status].toLocaleString('pt-BR')}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <nav className="work-tabs" role="tablist" aria-label="Seções da obra">
            {tabs.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={tab === item.id}
                className={tab === item.id ? 'active' : ''}
                onClick={() => setTab(item.id)}
              >
                {item.label}
                {item.id === 'reviews' && totalReviews > 0 && <span>{totalReviews}</span>}
                {tab === item.id && <motion.i layoutId="work-tab" className="work-tab-indicator" />}
              </button>
            ))}
          </nav>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {tab === 'overview' && (
                <>
                  <section className="work-section">
                    <h2>Sinopse</h2>
                    {detail.synopsis ? (
                      detail.synopsis
                        .split(/\n{2,}/)
                        .map((paragraph) => <p key={paragraph}>{paragraph}</p>)
                    ) : (
                      <p className="muted">Ainda não temos uma sinopse para esta obra.</p>
                    )}
                  </section>
                  {detail.characters.length > 0 && (
                    <section className="work-section">
                      <div className="work-section-title">
                        <h2>Personagens principais</h2>
                        <button type="button" onClick={() => setTab('cast')}>
                          Ver todos
                        </button>
                      </div>
                      <div className="work-character-strip">
                        {detail.characters.slice(0, 6).map((character) => (
                          <figure key={character.name}>
                            {character.image ? (
                              // eslint-disable-next-line @next/next/no-img-element -- Catalog image
                              <img src={character.image} alt="" referrerPolicy="no-referrer" />
                            ) : (
                              <span>{initials(character.name)}</span>
                            )}
                            <figcaption>{character.name}</figcaption>
                          </figure>
                        ))}
                      </div>
                    </section>
                  )}
                  {work.reviews.length > 0 && (
                    <section className="work-section">
                      <div className="work-section-title">
                        <h2>Review em destaque</h2>
                        <button type="button" onClick={() => setTab('reviews')}>
                          Ver todas
                        </button>
                      </div>
                      <Review review={work.reviews[0]} />
                    </section>
                  )}
                </>
              )}
              {tab === 'cast' && (
                <>
                  <section className="work-section">
                    <h2>Personagens e elenco</h2>
                    {detail.characters.length ? (
                      <div className="work-cast">
                        {detail.characters.map((character) => (
                          <div key={character.name} className="work-cast-row">
                            <span className="work-person">
                              {character.image ? (
                                // eslint-disable-next-line @next/next/no-img-element -- Catalog image
                                <img src={character.image} alt="" referrerPolicy="no-referrer" />
                              ) : (
                                <span>{initials(character.name)}</span>
                              )}
                              <span>
                                <strong>{character.name}</strong>
                                <small>{character.role}</small>
                              </span>
                            </span>
                            {character.voice && (
                              <span className="work-person is-right">
                                <span>
                                  <strong>{character.voice.name}</strong>
                                  <small>{character.voice.language}</small>
                                </span>
                                {character.voice.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element -- Catalog image
                                  <img
                                    src={character.voice.image}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span>{initials(character.voice.name)}</span>
                                )}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">
                        Os catálogos abertos não trazem personagens desta obra.
                      </p>
                    )}
                  </section>
                  {detail.staff.length > 0 && (
                    <section className="work-section">
                      <h2>Equipe</h2>
                      <div className="work-cast">
                        {detail.staff.map((person) => (
                          <div key={`${person.name}-${person.role}`} className="work-cast-row">
                            <span className="work-person">
                              {person.image ? (
                                // eslint-disable-next-line @next/next/no-img-element -- Catalog image
                                <img src={person.image} alt="" referrerPolicy="no-referrer" />
                              ) : (
                                <span>{initials(person.name)}</span>
                              )}
                              <span>
                                <strong>{person.name}</strong>
                                <small>{person.role}</small>
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
              {tab === 'reviews' && (
                <section className="work-section">
                  <h2>Reviews da comunidade</h2>
                  {totalReviews > 0 && (
                    <div className="work-review-summary">
                      {(Object.keys(recommendationLabels) as Recommendation[]).map((key) => {
                        const ReviewIcon = recommendationIcons[key];
                        return (
                          <span key={key} className={`work-recommendation is-${key}`}>
                            <ReviewIcon size={13} />
                            {work.reviewCounts[key]} {recommendationLabels[key]}
                          </span>
                        );
                      })}
                      <div className="work-review-bar">
                        {(Object.keys(recommendationLabels) as Recommendation[]).map((key) => (
                          <i
                            key={key}
                            className={`is-${key}`}
                            style={{ width: `${(work.reviewCounts[key] / totalReviews) * 100}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {work.reviews.length ? (
                    <div className="work-review-list">
                      {work.reviews.map((review) => (
                        <Review key={review.id} review={review} />
                      ))}
                    </div>
                  ) : (
                    <p className="muted">
                      Ninguém publicou uma review ainda. Adicione a obra à sua biblioteca e escreva
                      a primeira nos detalhes do título.
                    </p>
                  )}
                </section>
              )}
            </motion.div>
          </AnimatePresence>
          <p className="work-attribution">
            Informações de{' '}
            {detail.source ? (
              detail.source.url ? (
                <a href={detail.source.url} target="_blank" rel="noreferrer">
                  {detail.source.label}
                </a>
              ) : (
                detail.source.label
              )
            ) : work.attribution.url ? (
              <a href={work.attribution.url} target="_blank" rel="noreferrer">
                {work.attribution.label}
              </a>
            ) : (
              work.attribution.label
            )}{' '}
            · {detail.source?.license ?? work.attribution.license}. Notas e reviews da comunidade do
            Jinsei. <Link href="/rankings">Ver rankings</Link>
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
