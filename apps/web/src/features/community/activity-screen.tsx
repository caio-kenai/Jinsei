'use client';
import { useT } from '@/i18n/provider';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Activity, LoaderCircle, MessageCircle, Tent, UserPlus, UsersRound } from 'lucide-react';
import { categoryLabels } from '@jinsei/contracts';
import { Button } from '@/components/ui/button';
import { categoryIcons } from '@/components/shared/category-icons';
import { MediaCover } from '@/features/library/media-cover';
import { StatusBadge } from '@/features/library/status-badge';
import { categoryColors, statusColors } from '@/lib/palette';
import { CommunityEmpty, UserAvatar, UserName, relativeTime } from './community-ui';
import { useClubs, useCommunitySummary, useFeed, useFriends } from './use-community';

const ease = [0.22, 1, 0.36, 1] as const;

export function ActivityScreen() {
  const t = useT();
  const feed = useFeed();
  const friends = useFriends().data;
  const summary = useCommunitySummary().data;
  const clubs = useClubs('', true).data?.clubs ?? [];
  const stats = [
    {
      label: t('Amigos'),
      value: friends?.friends.length ?? 0,
      Icon: UsersRound,
      color: '#2f7bff',
      href: '/community/friends',
    },
    {
      label: t('Pedidos'),
      value: summary?.pendingRequests ?? 0,
      Icon: UserPlus,
      color: '#e5306f',
      href: '/community/friends',
    },
    {
      label: t('Não lidas'),
      value: summary?.unreadMessages ?? 0,
      Icon: MessageCircle,
      color: '#15936a',
      href: '/community/messages',
    },
    {
      label: t('Clubes'),
      value: clubs.length,
      Icon: Tent,
      color: '#f7832b',
      href: '/community/clubs',
    },
  ];
  return (
    <div className="community-activity">
      <div className="community-stats">
        {stats.map(({ label, value, Icon, color, href }, index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.45, ease }}
          >
            <Link
              href={href}
              className="community-stat"
              style={{ '--stat-color': color } as CSSProperties}
            >
              <span className="community-stat-icon">
                <Icon size={17} />
              </span>
              <span>
                <strong>{value}</strong>
                <small>{label}</small>
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
      <div className="community-columns">
        <section className="community-card">
          <div className="community-card-title">
            <Activity size={16} />
            <h2>{t('O que seus amigos estão vendo, lendo e jogando')}</h2>
          </div>
          {feed.isPending ? (
            <div className="empty-state">
              <LoaderCircle className="spin" />
            </div>
          ) : !feed.data?.items.length ? (
            <CommunityEmpty
              icon={<UsersRound size={24} />}
              title={t('Nada por aqui ainda')}
              action={
                <Button variant="outline" asChild>
                  <Link href="/community/friends">
                    <UserPlus size={14} />
                    {t('Encontrar amigos')}
                  </Link>
                </Button>
              }
            >
              {t(
                'Quando seus amigos atualizarem a biblioteca e compartilharem o histórico, as novidades aparecem aqui.',
              )}
            </CommunityEmpty>
          ) : (
            <ol className="community-feed">
              {feed.data.items.map((item, index) => {
                const Icon = categoryIcons[item.mediaType];
                const cover = <MediaCover title={item.title} url={item.coverUrl} />;
                return (
                  <motion.li
                    key={`${item.user.id}-${item.title}-${item.updatedAt}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index, 10) * 0.03, duration: 0.4, ease }}
                  >
                    <UserAvatar user={item.user} size={34} />
                    <div className="community-feed-body">
                      <div className="community-feed-head">
                        <UserName user={item.user} />
                        <time dateTime={item.updatedAt}>{relativeTime(item.updatedAt)}</time>
                      </div>
                      <div className="community-feed-work">
                        {item.workId ? <Link href={`/obras/${item.workId}`}>{cover}</Link> : cover}
                        <div>
                          {item.workId ? (
                            <Link href={`/obras/${item.workId}`} className="community-work-title">
                              {item.title}
                            </Link>
                          ) : (
                            <span className="community-work-title">{item.title}</span>
                          )}
                          <div className="community-feed-meta">
                            <span
                              className="community-category"
                              style={{ '--cat': categoryColors[item.mediaType] } as CSSProperties}
                            >
                              <Icon size={12} />
                              {t(categoryLabels[item.mediaType])}
                            </span>
                            <StatusBadge status={item.status} />
                            {item.progressLabel && <span>{item.progressLabel}</span>}
                            {item.rating !== null && <span>★ {item.rating}</span>}
                          </div>
                          {item.progressPercent !== null && (
                            <span className="community-progress">
                              <motion.i
                                style={{ background: statusColors[item.status] }}
                                initial={{ width: 0 }}
                                animate={{ width: `${item.progressPercent}%` }}
                                transition={{ duration: 0.8, ease }}
                              />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          )}
        </section>
        <aside className="community-side">
          <section className="community-card">
            <div className="community-card-title">
              <UsersRound size={16} />
              <h2>{t('Amigos')}</h2>
              <Link href="/community/friends" className="community-more">
                {t('Ver todos')}
              </Link>
            </div>
            {friends?.friends.length ? (
              <ul className="community-mini-list">
                {friends.friends.slice(0, 8).map((friend) => (
                  <li key={friend.id}>
                    <UserAvatar user={friend} size={30} />
                    <UserName user={friend} />
                    <Link
                      href={`/community/messages?com=${friend.id}`}
                      className="community-icon-link"
                      aria-label={t('Conversar com {displayName}', {
                        displayName: friend.displayName,
                      })}
                    >
                      <MessageCircle size={15} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="community-hint">{t('Adicione amigos pelo nome de usuário.')}</p>
            )}
          </section>
          <section className="community-card">
            <div className="community-card-title">
              <Tent size={16} />
              <h2>{t('Meus clubes')}</h2>
              <Link href="/community/clubs" className="community-more">
                {t('Explorar')}
              </Link>
            </div>
            {clubs.length ? (
              <ul className="community-mini-list">
                {clubs.slice(0, 6).map((club) => (
                  <li key={club.id}>
                    <span
                      className="community-club-dot"
                      style={
                        {
                          '--cat': club.mediaType ? categoryColors[club.mediaType] : '#7050cf',
                        } as CSSProperties
                      }
                    >
                      {club.name[0]?.toUpperCase()}
                    </span>
                    <Link href={`/community/clubs/${club.slug}`} className="community-user-name">
                      <strong>{club.name}</strong>
                      <small>
                        {club.memberCount} {t('membros')}
                      </small>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="community-hint">
                {t('Entre em clubes para conversar sobre o que você ama.')}
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
