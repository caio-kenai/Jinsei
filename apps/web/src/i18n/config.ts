import { locales, type Locale } from '@jinsei/contracts';
import { enUS, es, ptBR } from 'date-fns/locale';
import { en } from './messages/en';
import { es as spanish } from './messages/es';

export const LOCALE_COOKIE = 'jinsei-locale';
export const defaultLocale: Locale = 'pt-BR';

/**
 * Portuguese is the source language: each message is its own key, and the other
 * languages map that text to a translation (missing entries fall back to Portuguese).
 */
const catalogs: Record<Locale, Record<string, string> | null> = {
  'pt-BR': null,
  en,
  es: spanish,
};

export type Translate = (text: string, values?: Record<string, string | number>) => string;

export function translator(locale: Locale): Translate {
  const catalog = catalogs[locale];
  return (text, values) => {
    const message = catalog?.[text] ?? text;
    return values
      ? message.replace(/\{(\w+)\}/g, (match, name: string) =>
          name in values ? String(values[name]) : match,
        )
      : message;
  };
}

/** Picks a supported locale from a cookie value or an Accept-Language header. */
export function matchLocale(value?: string | null): Locale {
  if (!value) return defaultLocale;
  for (const part of value.split(',')) {
    const tag = part.split(';')[0]!.trim().toLowerCase();
    if (!tag) continue;
    const exact = locales.find((locale) => locale.toLowerCase() === tag);
    if (exact) return exact;
    const language = tag.split('-')[0];
    if (language === 'pt') return 'pt-BR';
    const match = locales.find((locale) => locale === language);
    if (match) return match;
  }
  return defaultLocale;
}

export const dateLocales = { 'pt-BR': ptBR, en: enUS, es } as const;

let activeLocale: Locale = defaultLocale;
/** Called by the provider so plain helpers (outside React) format in the active language. */
export const setActiveLocale = (locale: Locale) => {
  activeLocale = locale;
};
export const currentLocale = () => activeLocale;
export const currentDateLocale = () => dateLocales[activeLocale];
export const numberLocales: Record<Locale, string> = { 'pt-BR': 'pt-BR', en: 'en-US', es: 'es-ES' };

/**
 * Marks Portuguese text that is translated later (module-level labels, option lists).
 * Returns the text untouched; render it with `t(label)`.
 */
export const msg = <T extends string>(text: T): T => text;
