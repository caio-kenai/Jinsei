'use client';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@jinsei/contracts';
import {
  LOCALE_COOKIE,
  dateLocales,
  defaultLocale,
  numberLocales,
  setActiveLocale,
  translator,
  type Translate,
} from './config';

type I18n = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
  dateLocale: (typeof dateLocales)[Locale];
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({
  locale: initial,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setState] = useState<Locale>(initial);
  setActiveLocale(locale);
  const setLocale = useCallback(
    (next: Locale) => {
      setActiveLocale(next);
      setState((current) => {
        if (current === next) return current;
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        document.documentElement.lang = next;
        // Server-rendered text (page titles, legal pages) follows the cookie on refresh.
        queueMicrotask(() => router.refresh());
        return next;
      });
    },
    [router],
  );
  const value = useMemo<I18n>(
    () => ({
      locale,
      setLocale,
      t: translator(locale),
      dateLocale: dateLocales[locale],
      formatNumber: (number, options) =>
        new Intl.NumberFormat(numberLocales[locale], options).format(number),
    }),
    [locale, setLocale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

const fallback: I18n = {
  locale: defaultLocale,
  setLocale: () => undefined,
  t: translator(defaultLocale),
  dateLocale: dateLocales[defaultLocale],
  formatNumber: (number, options) => new Intl.NumberFormat('pt-BR', options).format(number),
};

export function useI18n() {
  return useContext(I18nContext) ?? fallback;
}

/** Translates Portuguese source text into the active language. */
export function useT() {
  return useI18n().t;
}
