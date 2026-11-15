'use client';
import { msg } from '@/i18n/config';
import { useT } from '@/i18n/provider';
import { currentDateLocale } from '@/i18n/config';
import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import { Activity, MessagesSquare, UsersRound, Tent, Users } from 'lucide-react';
import type { CommunityUser } from '@jinsei/contracts';
import { cn } from '@/lib/utils';
import { useCommunitySummary } from './use-community';

const avatarColors = ['#7050cf', '#e5306f', '#2f7bff', '#f7832b', '#15936a', '#c77c02', '#0e9aa7'];

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

export const relativeTime = (value: string) =>
  formatDistanceToNowStrict(parseISO(value), { locale: currentDateLocale(), addSuffix: true });

export function UserAvatar({
  user,
  size = 36,
  className,
}: {
  user: Pick<CommunityUser, 'displayName' | 'avatarUrl'>;
  size?: number;
  className?: string;
}) {
  const hash = [...user.displayName].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (
    <span
      className={cn('community-avatar', className)}
      style={
        {
          width: size,
          height: size,
          fontSize: Math.round(size * 0.38),
          '--avatar-color': avatarColors[hash % avatarColors.length],
        } as CSSProperties
      }
      aria-hidden
    >
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" />
      ) : (
        initials(user.displayName)
      )}
    </span>
  );
}

/** Name plus @username, linked to the public profile when there is one. */
export function UserName({ user }: { user: CommunityUser }) {
  const content = (
    <>
      <strong>{user.displayName}</strong>
      {user.username && <small>@{user.username}</small>}
    </>
  );
  return user.username && user.isPublic ? (
    <Link className="community-user-name" href={`/u/${user.username}`}>
      {content}
    </Link>
  ) : (
    <span className="community-user-name">{content}</span>
  );
}

const tabs = [
  { href: '/community', label: msg('Atividade'), Icon: Activity, color: '#7050cf' },
  { href: '/community/friends', label: msg('Amigos'), Icon: UsersRound, color: '#2f7bff' },
  { href: '/community/messages', label: msg('Mensagens'), Icon: MessagesSquare, color: '#15936a' },
  { href: '/community/clubs', label: msg('Clubes'), Icon: Tent, color: '#f7832b' },
] as const;

export function CommunityShell({ children }: { children: ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const summary = useCommunitySummary().data;
  const badge = (href: string) =>
    href === '/community/friends'
      ? summary?.pendingRequests
      : href === '/community/messages'
        ? summary?.unreadMessages
        : 0;
  const active = (href: string) =>
    href === '/community' ? pathname === href : pathname.startsWith(href);
  return (
    <>
      <header className="context-header">
        <div className="context-title">
          <span className="context-icon community-context-icon">
            <Users size={14} />
          </span>
          <div>
            <h1>{t('Comunidade')}</h1>
            <div className="breadcrumb">{t('Amigos, conversas e clubes do Jinsei')}</div>
          </div>
        </div>
      </header>
      <nav className="view-tabs community-tabs" aria-label={t('Seções da comunidade')}>
        {tabs.map(({ href, label, Icon, color }) => (
          <Link
            key={href}
            href={href}
            className={cn('view-tab community-tab', active(href) && 'active')}
            style={{ '--tab-color': color } as CSSProperties}
            aria-current={active(href) ? 'page' : undefined}
          >
            <Icon size={15} />
            {t(label)}
            {Boolean(badge(href)) && <span className="community-badge">{badge(href)}</span>}
            {active(href) && (
              <motion.span
                layoutId="community-tab"
                className="community-tab-indicator"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
          </Link>
        ))}
      </nav>
      <div className="library-scroll community-page">{children}</div>
    </>
  );
}

export function CommunityEmpty({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state community-empty">
      <span className="empty-state-icon">{icon}</span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
