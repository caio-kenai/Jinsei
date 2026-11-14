import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExternalLink, FolderHeart, ListOrdered } from 'lucide-react';
import {
  categoryLabels,
  goalStateLabels,
  goalUnits,
  statusLabels,
  type PublicProfile,
} from '@jinsei/contracts';
import { PublicFooter, PublicHeader } from '@/features/presentation/public-navigation';
import { categoryIcons } from '@/components/shared/category-icons';
import { PublicWorkCard } from './public-work';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

export function PublicProfilePage({ profile }: { profile: PublicProfile }) {
  return (
    <div className="public-surface public-profile">
      <PublicHeader />
      <main className="marketing-container">
        <div
          className="public-banner"
          style={profile.bannerUrl ? { backgroundImage: `url(${profile.bannerUrl})` } : undefined}
        />
        <header className="public-profile-header">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Uploaded avatar served by the API
            <img className="public-avatar" src={profile.avatarUrl} alt="" />
          ) : (
            <span className="public-avatar">{initials(profile.displayName)}</span>
          )}
          <div>
            <h1>{profile.displayName}</h1>
            <p className="public-username">
              @{profile.username}
              {profile.title && <span className="profile-title-chip">{profile.title}</span>}
            </p>
            {profile.bio && <p className="public-bio">{profile.bio}</p>}
            <p className="public-since">
              No Jinsei desde{' '}
              {format(parseISO(profile.memberSince), "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            {profile.links.length > 0 && (
              <nav className="public-links" aria-label="Links">
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
          </div>
        </header>
        {profile.statistics && (
          <section className="public-section public-stats">
            <div>
              <strong>{profile.statistics.entries.toLocaleString('pt-BR')}</strong>
              <span>títulos</span>
            </div>
            <div>
              <strong>{profile.statistics.completed.toLocaleString('pt-BR')}</strong>
              <span>concluídos</span>
            </div>
            <div>
              <strong>
                {profile.statistics.averageRating === null
                  ? '—'
                  : `${profile.statistics.averageRating.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ★`}
              </strong>
              <span>nota média</span>
            </div>
            {profile.statistics.byCategory.map((row) => {
              const Icon = categoryIcons[row.mediaType];
              return (
                <div key={row.mediaType}>
                  <strong>
                    <Icon size={14} /> {row.total.toLocaleString('pt-BR')}
                  </strong>
                  <span>{categoryLabels[row.mediaType]}</span>
                </div>
              );
            })}
          </section>
        )}
        {profile.favorites && profile.favorites.length > 0 && (
          <section className="public-section">
            <h2>Favoritos</h2>
            <div className="public-grid">
              {profile.favorites.map((work) => (
                <PublicWorkCard key={`${work.mediaType}:${work.title}`} work={work} />
              ))}
            </div>
          </section>
        )}
        {profile.collections.length > 0 && (
          <section className="public-section">
            <h2>Coleções</h2>
            <div className="public-collections">
              {profile.collections.map((collection) => (
                <Link
                  key={collection.slug}
                  href={`/u/${profile.username}/collections/${collection.slug}`}
                  className="public-collection-link"
                >
                  {collection.ranked ? <ListOrdered size={15} /> : <FolderHeart size={15} />}
                  <span>
                    <strong>{collection.name}</strong>
                    <small>
                      {collection.itemCount} {collection.itemCount === 1 ? 'título' : 'títulos'}
                    </small>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
        {profile.reviews && profile.reviews.length > 0 && (
          <section className="public-section">
            <h2>Resenhas</h2>
            <div className="public-reviews">
              {profile.reviews.map((review) => (
                <PublicWorkCard key={`${review.mediaType}:${review.title}`} work={review}>
                  <p className="public-review">{review.review}</p>
                </PublicWorkCard>
              ))}
            </div>
          </section>
        )}
        {profile.goals && profile.goals.length > 0 && (
          <section className="public-section">
            <h2>Metas</h2>
            <ul className="public-goals">
              {profile.goals.map((goal) => (
                <li key={goal.name}>
                  <strong>{goal.name}</strong>
                  <span>
                    {goal.current.toLocaleString('pt-BR')} / {goal.target.toLocaleString('pt-BR')}{' '}
                    {goalUnits[goal.metric][1]} · {goalStateLabels[goal.state]}
                  </span>
                  <span className="mission-track">
                    <span
                      style={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {profile.history && profile.history.length > 0 && (
          <section className="public-section">
            <h2>Atividade recente</h2>
            <ul className="public-history">
              {profile.history.map((item) => (
                <li key={`${item.mediaType}:${item.title}:${item.updatedAt}`}>
                  <strong>{item.title}</strong>
                  <span>
                    {statusLabels[item.status]} ·{' '}
                    {format(parseISO(item.updatedAt), 'd MMM yyyy', { locale: ptBR })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
