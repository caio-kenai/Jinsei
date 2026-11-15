'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import {
  Home,
  Library,
  Heart,
  Settings,
  Search,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  SlidersHorizontal,
  Sun,
  Moon,
  Compass,
  CupSoda,
  Info,
  FolderHeart,
  Target,
  Sparkles,
  ChartColumn,
  Trophy,
  Users,
} from 'lucide-react';
import { categoryLabels, mediaTypes, type CurrentUser } from '@jinsei/contracts';
import { Brand } from '@/components/shared/brand';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { EmailVerificationBanner } from '@/features/auth/account-recovery';
import { useCommunitySummary } from '@/features/community/use-community';
import { usePreferences } from '@/features/auth/use-preferences';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { transitionTheme } from '@/lib/theme-transition';
import { toast } from 'sonner';
import { SupportDialog } from '@/features/support/support-dialog';
import { UserMenu } from '@/features/profile/user-menu';
import { AboutDialog } from '@/features/about/about-dialog';
import { categoryIcons } from '@/components/shared/category-icons';
import { useProgressionAnnouncements } from '@/features/progression/use-progression';
import { CommandPalette } from '@/features/command/command-palette';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { CategoryPicker } from '@/features/settings/category-picker';
import { useI18n } from '@/i18n/provider';

/** Sidebar link whose selected background glides to the active page. */
function NavLink({
  active,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { active: boolean }) {
  return (
    <Link {...props} className={cn('nav-link', active && 'active', className)}>
      {active && <motion.span layoutId="nav-active" className="nav-active-bg" aria-hidden="true" />}
      {children}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useI18n();
  const { data: user } = useCurrentUser();
  const accountLocale = user?.preferences.locale;
  const syncedLocale = useRef<string | null>(null);
  useEffect(() => {
    // The account's language wins once per change; a local switch is then saved back to it.
    if (!accountLocale || syncedLocale.current === accountLocale) return;
    syncedLocale.current = accountLocale;
    if (accountLocale !== locale) setLocale(accountLocale);
  }, [accountLocale, locale, setLocale]);
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setTheme, resolvedTheme } = useTheme();
  const preferences = usePreferences();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  // Missions and streaks follow the person's local day, so the browser zone is kept in sync.
  const savedZone = user?.preferences.timezone;
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (savedZone && zone && zone !== savedZone) preferences.mutate({ timezone: zone });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Runs only when the stored zone changes
  }, [savedZone]);
  useProgressionAnnouncements();
  const community = useCommunitySummary().data;
  const communityBadge = (community?.pendingRequests ?? 0) + (community?.unreadMessages ?? 0);
  if (!user) return null;
  const collapsed = user.preferences.sidebarCollapsed;
  const navigation = (close: () => void) => (
    <>
      <div className="workspace-label">
        <span>{t('Meu espaço')}</span>
      </div>
      <nav className="sidebar-navigation" aria-label={t('Navegação principal')}>
        <NavLink href="/home" onClick={close} active={pathname === '/home'}>
          <Home size={17} />
          {t('Início')}
        </NavLink>
        <NavLink href="/library" onClick={close} active={pathname === '/library'}>
          <Library size={17} />
          {t('Minha biblioteca')}
        </NavLink>
        <button
          className="sidebar-section"
          onClick={() => setLibraryOpen(!libraryOpen)}
          aria-expanded={libraryOpen}
        >
          <span>{t('Minha biblioteca')}</span>
          <ChevronDown
            size={13}
            className={cn('sidebar-section-chevron', !libraryOpen && 'closed')}
          />
        </button>
        <AnimatePresence initial={false}>
          {libraryOpen && (
            <motion.div
              key="library-categories"
              className="sidebar-collapsible"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              {mediaTypes
                .filter((type) => user.preferences.categories.includes(type))
                .map((type) => {
                  const Icon = categoryIcons[type];
                  return (
                    <NavLink
                      key={type}
                      href={`/library/${type}`}
                      onClick={close}
                      active={pathname === `/library/${type}`}
                    >
                      <Icon size={16} />
                      {t(categoryLabels[type])}
                      {pathname === `/library/${type}` && <span className="nav-active-dot" />}
                    </NavLink>
                  );
                })}
              <button
                type="button"
                className="nav-link nav-customize"
                onClick={() => {
                  close();
                  setCategoriesOpen(true);
                }}
              >
                <SlidersHorizontal size={15} />
                <span>{t('Personalizar categorias')}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="sidebar-divider" />
        <NavLink href="/favorites" onClick={close} active={pathname === '/favorites'}>
          <Heart size={17} />
          {t('Favoritos')}
        </NavLink>
        <NavLink href="/collections" onClick={close} active={pathname.startsWith('/collections')}>
          <FolderHeart size={17} />
          {t('Coleções')}
        </NavLink>
        <NavLink href="/statistics" onClick={close} active={pathname === '/statistics'}>
          <ChartColumn size={17} />
          {t('Estatísticas')}
        </NavLink>
        <NavLink href="/journey" onClick={close} active={pathname === '/journey'}>
          <Sparkles size={17} />
          {t('Jornada')}
        </NavLink>
        <NavLink href="/goals" onClick={close} active={pathname === '/goals'}>
          <Target size={17} />
          {t('Metas')}
        </NavLink>
        <NavLink href="/community" onClick={close} active={pathname.startsWith('/community')}>
          <Users size={17} />
          {t('Comunidade')}
          {communityBadge > 0 && (
            <span className="community-badge nav-badge">{communityBadge}</span>
          )}
        </NavLink>
        <NavLink href="/discover" onClick={close} active={pathname === '/discover'}>
          <Compass size={17} />
          {t('Descobrir')}
        </NavLink>
        <NavLink href="/rankings" onClick={close} active={false}>
          <Trophy size={17} />
          {t('Rankings')}
        </NavLink>
      </nav>
      <div className="sidebar-bottom">
        <NavLink href="/settings" onClick={close} active={pathname === '/settings'}>
          <Settings size={17} />
          {t('Configurações')}
        </NavLink>
        <button className="nav-link support-nav" onClick={() => setSupportOpen(true)}>
          <CupSoda size={17} />
          {t('Buy Me a Monster')}
        </button>
        <button className="nav-link support-nav" onClick={() => setAboutOpen(true)}>
          <Info size={17} />
          {t('Sobre')}
        </button>
      </div>
    </>
  );
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
      queryClient.clear();
      router.replace('/login');
    } catch {
      toast.error(t('Não foi possível sair. Tente novamente.'));
    }
  }
  function changeTheme(theme: CurrentUser['preferences']['theme'], origin: Element) {
    transitionTheme(() => setTheme(theme), origin, theme);
    preferences.mutate({ theme }, { onError: () => setTheme(user!.preferences.theme) });
  }
  return (
    <div
      className={cn('app-shell', collapsed && 'sidebar-collapsed')}
      data-density={user.preferences.density}
    >
      <aside className="global-rail" aria-label={t('Atalhos globais')}>
        <button
          className="rail-collapse"
          aria-label={collapsed ? t('Expandir barra lateral') : t('Recolher barra lateral')}
          onClick={() => {
            // Collapses at once; the preference is saved in the background.
            queryClient.setQueryData<CurrentUser>(['me'], (current) =>
              current
                ? {
                    ...current,
                    preferences: { ...current.preferences, sidebarCollapsed: !collapsed },
                  }
                : current,
            );
            preferences.mutate({ sidebarCollapsed: !collapsed });
          }}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
        {[
          { href: '/home', label: t('Início'), Icon: Home },
          { href: '/library', label: t('Biblioteca'), Icon: Library },
          { href: '/favorites', label: t('Favoritos'), Icon: Heart },
          { href: '/collections', label: t('Coleções'), Icon: FolderHeart },
          { href: '/goals', label: t('Metas'), Icon: Target },
          { href: '/community', label: t('Social'), Icon: Users },
          { href: '/journey', label: t('Jornada'), Icon: Sparkles },
          { href: '/discover', label: t('Descobrir'), Icon: Compass },
        ].map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn('rail-button', pathname.startsWith(href) && 'active')}
            title={label}
            aria-label={label}
          >
            {pathname.startsWith(href) && (
              <motion.span layoutId="rail-active" className="rail-active-bg" aria-hidden="true" />
            )}
            <Icon size={20} />
            <small>{label}</small>
          </Link>
        ))}
        <div className="rail-spacer" />
        <Link
          href="/settings"
          className="rail-button"
          title={t('Configurações')}
          aria-label={t('Configurações')}
        >
          <Settings size={20} />
        </Link>
      </aside>
      <aside className="main-sidebar">
        <LayoutGroup id="sidebar">{navigation(() => undefined)}</LayoutGroup>
      </aside>
      <div className="app-workspace">
        <header className="global-header">
          <Link href="/home" className="global-brand" aria-label={t('Jinsei início')}>
            <Brand adaptive className="global-wordmark" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="mobile-menu"
            aria-label={t('Abrir navegação')}
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={18} />
          </Button>
          <form
            className="global-search"
            onSubmit={(event) => {
              event.preventDefault();
              const query = searchRef.current?.value.trim();
              if (query) router.push(`/library?q=${encodeURIComponent(query)}`);
            }}
          >
            <Search size={14} />
            <input
              ref={searchRef}
              placeholder={t('Pesquisar na sua biblioteca')}
              aria-label={t('Busca global na biblioteca')}
              onFocus={(event) => {
                event.currentTarget.blur();
                setPaletteOpen(true);
              }}
            />
            <kbd>Ctrl K</kbd>
          </form>
          <div className="header-actions">
            <Button
              id="theme-toggle"
              variant="ghost"
              size="icon"
              className="theme-toggle"
              aria-label={resolvedTheme === 'dark' ? t('Usar tema claro') : t('Usar tema escuro')}
              title={resolvedTheme === 'dark' ? t('Tema claro') : t('Tema escuro')}
              onClick={(event) =>
                changeTheme(resolvedTheme === 'dark' ? 'light' : 'dark', event.currentTarget)
              }
            >
              <Sun className="theme-light-icon" size={17} />
              <Moon className="theme-dark-icon" size={17} />
            </Button>
            <UserMenu user={user} onLogout={logout} onSupport={() => setSupportOpen(true)} />
          </div>
        </header>
        <EmailVerificationBanner />
        <main id="main-content" className="workspace-content">
          {children}
        </main>
      </div>
      <Dialog open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <DialogContent className="categories-dialog">
          <DialogTitle className="dialog-title">{t('Categorias da biblioteca')}</DialogTitle>
          <DialogDescription className="dialog-description">
            {t(
              'Escolha o que aparece no menu e na sua biblioteca. Desativar uma categoria só a esconde.',
            )}
          </DialogDescription>
          <CategoryPicker className="categories-dialog-grid" />
        </DialogContent>
      </Dialog>
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="mobile-navigation">
          <DialogTitle className="sr-only">{t('Navegação')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('Acesse sua biblioteca e as configurações')}
          </DialogDescription>
          <LayoutGroup id="drawer">{navigation(() => setMobileOpen(false))}</LayoutGroup>
        </DialogContent>
      </Dialog>
      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        categories={user.preferences.categories}
      />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </div>
  );
}
