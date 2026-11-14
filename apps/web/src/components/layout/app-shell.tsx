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
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  ArrowUpRight,
  Compass,
  CupSoda,
  Info,
} from 'lucide-react';
import { categoryLabels, mediaTypes, type CurrentUser } from '@jinsei/contracts';
import { Brand } from '@/components/shared/brand';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { usePreferences } from '@/features/auth/use-preferences';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SupportDialog } from '@/features/support/support-dialog';
import { UserMenu } from '@/features/profile/user-menu';
import { AboutDialog } from '@/features/about/about-dialog';
import { categoryIcons } from '@/components/shared/category-icons';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: user } = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();
  const preferences = usePreferences();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  if (!user) return null;
  const collapsed = user.preferences.sidebarCollapsed;
  const navigation = (close: () => void) => (
    <>
      <div className="workspace-label">
        <span>Meu espaço</span>
        <ChevronDown size={14} />
      </div>
      <nav className="sidebar-navigation" aria-label="Navegação principal">
        <Link
          href="/home"
          onClick={close}
          className={cn('nav-link', pathname === '/home' && 'active')}
        >
          <Home size={17} />
          Início
        </Link>
        <Link
          href="/library"
          onClick={close}
          className={cn('nav-link', pathname === '/library' && 'active')}
        >
          <Library size={17} />
          Minha biblioteca
        </Link>
        <button
          className="sidebar-section"
          onClick={() => setLibraryOpen(!libraryOpen)}
          aria-expanded={libraryOpen}
        >
          <span>Minha biblioteca</span>
          {libraryOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        {libraryOpen && (
          <div>
            {mediaTypes
              .filter((type) => user.preferences.categories.includes(type))
              .map((type) => {
                const Icon = categoryIcons[type];
                return (
                  <Link
                    key={type}
                    href={`/library/${type}`}
                    onClick={close}
                    className={cn('nav-link', pathname === `/library/${type}` && 'active')}
                  >
                    <Icon size={16} />
                    {categoryLabels[type]}
                    {pathname === `/library/${type}` && <span className="nav-active-dot" />}
                  </Link>
                );
              })}
            <Link href="/settings" onClick={close} className="nav-link nav-add">
              <span>+</span>Personalizar categorias
            </Link>
          </div>
        )}
        <div className="sidebar-divider" />
        <Link
          href="/favorites"
          onClick={close}
          className={cn('nav-link', pathname === '/favorites' && 'active')}
        >
          <Heart size={17} />
          Favoritos
        </Link>
        <Link
          href="/discover"
          onClick={close}
          className={cn('nav-link', pathname === '/discover' && 'active')}
        >
          <Compass size={17} />
          Descobrir
        </Link>
      </nav>
      <div className="sidebar-bottom">
        <Link
          href="/settings"
          onClick={close}
          className={cn('nav-link', pathname === '/settings' && 'active')}
        >
          <Settings size={17} />
          Configurações
        </Link>
        <button className="nav-link support-nav" onClick={() => setSupportOpen(true)}>
          <CupSoda size={17} />
          Buy Me a Monster
        </button>
        <button className="nav-link support-nav" onClick={() => setAboutOpen(true)}>
          <Info size={17} />
          Sobre
        </button>
        <a
          className="nav-link source-link"
          href="https://github.com/caio-kenai/Jinsei"
          target="_blank"
          rel="noreferrer"
        >
          Código aberto
          <ArrowUpRight size={14} />
        </a>
      </div>
    </>
  );
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
      queryClient.clear();
      router.replace('/login');
    } catch {
      toast.error('Não foi possível sair. Tente novamente.');
    }
  }
  function changeTheme(theme: CurrentUser['preferences']['theme']) {
    setTheme(theme);
    preferences.mutate({ theme }, { onError: () => setTheme(user!.preferences.theme) });
  }
  return (
    <div
      className={cn('app-shell', collapsed && 'sidebar-collapsed')}
      data-density={user.preferences.density}
    >
      <aside className="global-rail" aria-label="Atalhos globais">
        <button
          className="rail-collapse"
          aria-label={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          onClick={() => preferences.mutate({ sidebarCollapsed: !collapsed })}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
        {[
          { href: '/home', label: 'Início', Icon: Home },
          { href: '/library', label: 'Biblioteca', Icon: Library },
          { href: '/favorites', label: 'Favoritos', Icon: Heart },
          { href: '/discover', label: 'Descobrir', Icon: Compass },
        ].map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn('rail-button', pathname.startsWith(href) && 'active')}
            title={label}
            aria-label={label}
          >
            <Icon size={20} />
            <small>{label}</small>
          </Link>
        ))}
        <div className="rail-spacer" />
        <Link
          href="/settings"
          className="rail-button"
          title="Configurações"
          aria-label="Configurações"
        >
          <Settings size={20} />
        </Link>
      </aside>
      <aside className="main-sidebar">{navigation(() => undefined)}</aside>
      <div className="app-workspace">
        <header className="global-header">
          <Link href="/home" className="global-brand" aria-label="Jinsei início">
            <Brand className="global-wordmark" />
            <Brand compact className="global-app-icon" />
            <ChevronDown size={12} />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="mobile-menu"
            aria-label="Abrir navegação"
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
              placeholder="Pesquisar na sua biblioteca"
              aria-label="Busca global na biblioteca"
            />
            <kbd>Ctrl K</kbd>
          </form>
          <div className="header-actions">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Alterar tema">
                  <Sun className="theme-light-icon" size={17} />
                  <Moon className="theme-dark-icon" size={17} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Aparência</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => changeTheme('light')}>
                  <Sun size={15} />
                  Claro
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => changeTheme('dark')}>
                  <Moon size={15} />
                  Escuro
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => changeTheme('system')}>
                  <Monitor size={15} />
                  Sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <UserMenu user={user} onLogout={logout} />
          </div>
        </header>
        <main id="main-content" className="workspace-content">
          {children}
        </main>
      </div>
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="mobile-navigation">
          <DialogTitle className="sr-only">Navegação</DialogTitle>
          <DialogDescription className="sr-only">
            Acesse sua biblioteca e as configurações
          </DialogDescription>
          {navigation(() => setMobileOpen(false))}
        </DialogContent>
      </Dialog>
      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </div>
  );
}
