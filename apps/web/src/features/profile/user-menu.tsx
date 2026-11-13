'use client';
import '@/app/profile.css';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  UserRound,
  Settings,
  LogOut,
  Heart,
  ArrowUpRight,
  LockKeyhole,
  LoaderCircle,
  Server,
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

export function UserMenu({ user, onLogout }: { user: CurrentUser; onLogout: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const favorites = useQuery({
    queryKey: ['library', 'menu-favorites'],
    queryFn: () => api<LibraryResponse>('/library/entries?favorite=true&limit=4'),
    enabled: open,
    staleTime: 30000,
  });
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="avatar profile-trigger" aria-label="Menu da conta">
          {initials(user.profile.displayName)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="user-menu">
        <DropdownMenuItem className="user-menu-identity" asChild>
          <Link href="/profile">
            <span className="avatar">{initials(user.profile.displayName)}</span>
            <span>
              <strong>{user.profile.displayName}</strong>
              <small>@{user.profile.username ?? 'meu-perfil'}</small>
            </span>
            <ArrowUpRight size={15} />
          </Link>
        </DropdownMenuItem>
        <p className="user-menu-email" title={user.email}>
          {user.email}
        </p>
        <span className="user-menu-private">
          <LockKeyhole size={12} />
          Seu espaço privado
        </span>
        <DropdownMenuSeparator />
        <div className="user-menu-favorites-heading">
          <span>
            <Heart size={13} />
            Seus favoritos
          </span>
          <span>{favorites.data?.total ?? '—'}</span>
        </div>
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
                <Link href={`/library?entry=${entry.id}`} aria-label={`Abrir ${entry.title}`}>
                  <MediaCover
                    title={entry.title}
                    url={entry.coverUrl}
                    layout={entry.coverAttribution?.layout}
                    large
                  />
                  <span>{entry.title}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        ) : (
          <p className="user-menu-empty">
            Marque as histórias que mais te representam com um coração.
          </p>
        )}
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound size={16} />
            Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/favorites">
            <Heart size={16} />
            Todos os favoritos
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings size={16} />
            Configurações da conta
          </Link>
        </DropdownMenuItem>
        {user.isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/settings/instance">
              <Server size={16} />
              Administrar instância
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => void onLogout()}>
          <LogOut size={16} />
          Sair do Jinsei
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
