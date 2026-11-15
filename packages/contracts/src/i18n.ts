import { en } from './messages/en';
import { es } from './messages/es';
import { defaultLocale, locales, type Locale } from './index';

/**
 * Portuguese is the source language: each message is its own key, and the other
 * languages map that text to a translation (missing entries fall back to Portuguese).
 */
const catalogs: Record<Locale, Record<string, string> | null> = {
  'pt-BR': null,
  en,
  es,
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

export { msg } from './msg';
