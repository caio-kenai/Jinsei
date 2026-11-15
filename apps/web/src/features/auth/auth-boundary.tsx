'use client';
import { useT } from '@/i18n/provider';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { LoaderCircle } from 'lucide-react';
import { useCurrentUser } from './use-current-user';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';

export function AuthBoundary({ children }: { children: React.ReactNode }) {
  const t = useT();
  const { data: user, isPending, error, refetch } = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) router.replace('/login');
    if (user && !user.preferences.onboarded && pathname !== '/onboarding')
      router.replace('/onboarding');
    if (user && user.preferences.onboarded && pathname === '/onboarding') router.replace('/home');
  }, [user, error, pathname, router]);
  useEffect(() => {
    if (user) {
      setTheme(user.preferences.theme);
      document.documentElement.dataset.accent = user.preferences.accent;
      document.documentElement.dataset.visualTheme = user.preferences.visualTheme;
    }
  }, [user, setTheme]);
  if (
    isPending ||
    (error instanceof ApiError && error.status === 401) ||
    (user && !user.preferences.onboarded && pathname !== '/onboarding')
  )
    return (
      <div className="full-screen-state">
        <LoaderCircle className="spin" size={24} />
        <span>{t('Preparando sua jornada…')}</span>
      </div>
    );
  if (error)
    return (
      <div className="full-screen-state">
        <h1>{t('Não foi possível conectar')}</h1>
        <p>{t('Confira se o Jinsei está disponível e tente novamente.')}</p>
        <Button onClick={() => void refetch()}>{t('Tentar novamente')}</Button>
      </div>
    );
  return children;
}
