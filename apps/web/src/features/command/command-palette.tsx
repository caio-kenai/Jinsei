'use client';
import { useT } from '@/i18n/provider';
import { useState } from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ChartColumn,
  Compass,
  CornerDownLeft,
  FolderHeart,
  Heart,
  Home,
  Library,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  type LucideIcon,
} from 'lucide-react';
import {
  categoryLabels,
  mediaTypes,
  type LibraryResponse,
  type MediaType,
} from '@jinsei/contracts';
import { api } from '@/lib/api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { categoryIcons } from '@/components/shared/category-icons';
import { MediaCover } from '@/features/library/media-cover';
import { AddEntryDialog } from '@/features/library/add-entry-dialog';
import { useCollections } from '@/features/collections/use-collections';
import { useGoals } from '@/features/goals/use-goals';

type Command = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  Icon?: LucideIcon;
  cover?: { title: string; url: string | null };
  run: () => void;
};
const normalize = (value: string) => value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Ctrl/Cmd + K: navigation, quick actions and search across titles, collections and goals. */
export function CommandPalette({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: MediaType[];
}) {
  const t = useT();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [adding, setAdding] = useState(false);
  const debounced = useDebouncedValue(query.trim());
  const entries = useQuery({
    queryKey: ['library', 'palette', debounced],
    queryFn: () =>
      api<LibraryResponse>(`/library/entries?${new URLSearchParams({ q: debounced, limit: '6' })}`),
    enabled: open && debounced.length > 1,
  });
  const collections = useCollections();
  const goals = useGoals();
  const close = () => {
    setQuery('');
    setActive(0);
    onOpenChange(false);
  };
  const go = (href: string) => () => {
    close();
    router.push(href);
  };
  const term = normalize(query.trim());
  const matches = (text: string) => !term || normalize(text).includes(term);
  const navigation: Command[] = [
    { id: 'home', group: t('Ir para'), label: t('Início'), Icon: Home, run: go('/home') },
    {
      id: 'library',
      group: t('Ir para'),
      label: t('Minha biblioteca'),
      Icon: Library,
      run: go('/library'),
    },
    ...mediaTypes
      .filter((type) => categories.includes(type))
      .map((type) => ({
        id: `category:${type}`,
        group: t('Ir para'),
        label: t(categoryLabels[type]),
        Icon: categoryIcons[type],
        run: go(`/library/${type}`),
      })),
    {
      id: 'favorites',
      group: t('Ir para'),
      label: t('Favoritos'),
      Icon: Heart,
      run: go('/favorites'),
    },
    {
      id: 'collections',
      group: t('Ir para'),
      label: t('Coleções'),
      Icon: FolderHeart,
      run: go('/collections'),
    },
    { id: 'goals', group: t('Ir para'), label: t('Metas'), Icon: Target, run: go('/goals') },
    {
      id: 'journey',
      group: t('Ir para'),
      label: t('Jornada'),
      Icon: Sparkles,
      run: go('/journey'),
    },
    {
      id: 'statistics',
      group: t('Ir para'),
      label: t('Estatísticas'),
      Icon: ChartColumn,
      run: go('/statistics'),
    },
    {
      id: 'discover',
      group: t('Ir para'),
      label: t('Descobrir'),
      Icon: Compass,
      run: go('/discover'),
    },
    {
      id: 'settings',
      group: t('Ir para'),
      label: t('Configurações'),
      Icon: Settings,
      run: go('/settings'),
    },
  ].filter((command) => matches(command.label));
  const actions: Command[] = [
    {
      id: 'add',
      group: t('Ações'),
      label: t('Adicionar título'),
      Icon: Plus,
      run: () => {
        close();
        setAdding(true);
      },
    },
    {
      id: 'search-library',
      group: t('Ações'),
      label: term
        ? t('Buscar “{trim}” na biblioteca', { trim: query.trim() })
        : t('Buscar na biblioteca'),
      Icon: Search,
      run: go(`/library${term ? `?q=${encodeURIComponent(query.trim())}` : ''}`),
    },
  ].filter((command) => command.id === 'search-library' || matches(command.label));
  const titles: Command[] =
    debounced.length > 1
      ? (entries.data?.items ?? []).map((entry) => ({
          id: `entry:${entry.id}`,
          group: t('Títulos'),
          label: entry.title,
          hint: t(categoryLabels[entry.mediaType]),
          cover: { title: entry.title, url: entry.coverUrl },
          run: go(`/library/${entry.mediaType}?entry=${entry.id}`),
        }))
      : [];
  const collectionCommands: Command[] = term
    ? (collections.data?.collections ?? [])
        .filter((collection) => matches(collection.name))
        .slice(0, 4)
        .map((collection) => ({
          id: `collection:${collection.id}`,
          group: t('Coleções'),
          label: collection.name,
          Icon: FolderHeart,
          run: go(`/collections/${collection.id}`),
        }))
    : [];
  const goalCommands: Command[] = term
    ? (goals.data?.goals ?? [])
        .filter((goal) => matches(goal.name))
        .slice(0, 4)
        .map((goal) => ({
          id: `goal:${goal.id}`,
          group: t('Metas'),
          label: goal.name,
          hint: `${goal.current}/${goal.target}`,
          Icon: Target,
          run: go('/goals'),
        }))
    : [];
  const commands = [...actions, ...titles, ...collectionCommands, ...goalCommands, ...navigation];
  const current = Math.min(active, Math.max(0, commands.length - 1));
  let previousGroup = '';
  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
        <DialogContent className="command-palette">
          <DialogTitle className="sr-only">{t('Paleta de comandos')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('Busque títulos, coleções e metas ou navegue pelo Jinsei.')}
          </DialogDescription>
          <div className="command-input">
            <Search size={15} />
            <input
              autoFocus
              role="combobox"
              aria-expanded
              aria-controls="command-list"
              aria-activedescendant={
                commands[current] ? `command-${commands[current].id}` : undefined
              }
              placeholder={t('Buscar títulos, coleções, metas ou páginas…')}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActive((current + 1) % Math.max(1, commands.length));
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActive((current - 1 + commands.length) % Math.max(1, commands.length));
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  commands[current]?.run();
                }
              }}
            />
            <kbd>{t('Esc')}</kbd>
          </div>
          <ul id="command-list" role="listbox" className="command-list">
            {commands.map((command, index) => {
              const heading = command.group !== previousGroup ? command.group : null;
              previousGroup = command.group;
              return (
                <li key={command.id} role="presentation">
                  {heading && <div className="command-group">{heading}</div>}
                  <button
                    id={`command-${command.id}`}
                    role="option"
                    aria-selected={index === current}
                    className={`command-item ${index === current ? 'active' : ''}`}
                    onMouseEnter={() => setActive(index)}
                    onClick={command.run}
                  >
                    {index === current && (
                      <motion.span
                        layoutId="command-active"
                        className="command-active-bg"
                        transition={{ type: 'spring', stiffness: 700, damping: 46 }}
                        aria-hidden="true"
                      />
                    )}
                    {command.cover ? (
                      <MediaCover title={command.cover.title} url={command.cover.url} />
                    ) : (
                      command.Icon && <command.Icon size={15} />
                    )}
                    <span className="command-label">{command.label}</span>
                    {command.hint && <span className="command-hint">{command.hint}</span>}
                    {index === current && <CornerDownLeft size={12} className="command-enter" />}
                  </button>
                </li>
              );
            })}
            {commands.length === 0 && <li className="command-empty">{t('Nada encontrado.')}</li>}
          </ul>
        </DialogContent>
      </Dialog>
      <AddEntryDialog open={adding} onOpenChange={setAdding} />
    </>
  );
}
