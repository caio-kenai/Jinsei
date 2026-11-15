'use client';
import '@/app/profile.css';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  CupSoda,
  Heart,
  LoaderCircle,
  LogOut,
  Server,
  ShieldAlert,
  Settings,
  UserRound,
  Users,
} from 'lucide-react';
import type { CurrentUser, LibraryResponse } from '@jinsei/contracts';
import { api } from '@/lib/api';
import { initials } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MediaCover } from '@/features/library/media-cover';
import { useCommunitySummary } from '@/features/community/use-community';

function Avatar({ user, className }: { user: CurrentUser; className?: string }) {
  return (
    <span className={`avatar ${className ?? ''}`}>
      {user.profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.profile.avatarUrl} alt="" />
      ) : (
        initials(user.profile.displayName)
      )}
    </span>
  );
}

export function UserMenu({
  user,
  onLogout,
  onSupport,
}: {
  user: CurrentUser;
  onLogout: () => Promise<void>;
  onSupport?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const community = useCommunitySummary().data;
  const pending = (community?.pendingRequests ?? 0) + (community?.unreadMessages ?? 0);
  const favorites = useQuery({
    queryKey: ['library', 'menu-favorites'],
    queryFn: () => api<LibraryResponse>('/library/entries?favorite=true&limit=4'),
    enabled: open,
    staleTime: 30000,
  });
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="profile-trigger" aria-label="Menu da conta">
          <Avatar user={user} />
          <span className="profile-trigger-status" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="user-menu" align="end">
        <DropdownMenuItem className="user-menu-identity" asChild>
          <Link href="/profile">
            <Avatar user={user} />
            <span>
              <strong>{user.profile.displayName}</strong>
              <small title={user.email}>{user.email}</small>
            </span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="user-menu-favorites-heading">
          <Link href="/favorites">
            <Heart size={16} />
            Favoritos
            <span className="user-menu-count">{favorites.data?.total ?? '—'}</span>
            <ChevronRight size={14} />
          </Link>
        </DropdownMenuItem>
        {favorites.isPending ? (
          <div className="user-menu-loading">
            <LoaderCircle className="spin" size={16} />
          </div>
        ) : favorites.error ? (
          <p className="user-menu-empty">Não foi possível carregar os favoritos.</p>
        ) : favorites.data?.items.length ? (
          <div className="user-menu-favorites">
            {favorites.data.items.map((entry) => (
              <DropdownMenuItem key={entry.id} asChild className="user-menu-cover">
                <Link
                  href={`/library?entry=${entry.id}`}
                  aria-label={`Abrir ${entry.title}`}
                  title={entry.title}
                >
                  <MediaCover
                    title={entry.title}
                    url={entry.coverUrl}
                    layout={entry.coverAttribution?.layout}
                    large
                  />
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        ) : (
          <p className="user-menu-empty">Marque suas histórias preferidas com um coração.</p>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound size={16} />
            Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/community">
            <Users size={16} />
            Comunidade
            {pending > 0 && <span className="community-badge user-menu-badge">{pending}</span>}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings size={16} />
            Configurações
          </Link>
        </DropdownMenuItem>
        {user.isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin/moderation">
              <ShieldAlert size={16} />
              Moderação
            </Link>
          </DropdownMenuItem>
        )}
        {user.isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/settings/instance">
              <Server size={16} />
              Administrar instância
            </Link>
          </DropdownMenuItem>
        )}
        {onSupport && (
          <DropdownMenuItem onSelect={onSupport}>
            <CupSoda size={16} />
            Buy Me a Monster
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void onLogout()} className="user-menu-logout">
          <LogOut size={16} />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
