import { defaultLocale, translator, type Locale, type Translate } from '@jinsei/contracts';
import { enUS, es, ptBR } from 'date-fns/locale';

export { defaultLocale, matchLocale, msg, translator, type Translate } from '@jinsei/contracts';
export const LOCALE_COOKIE = 'jinsei-locale';

export const dateLocales = { 'pt-BR': ptBR, en: enUS, es } as const;

let activeLocale: Locale = defaultLocale;
/** Called by the provider so plain helpers (outside React) format in the active language. */
export const setActiveLocale = (locale: Locale) => {
  activeLocale = locale;
};
export const currentLocale = () => activeLocale;
export const currentDateLocale = () => dateLocales[activeLocale];
export const numberLocales: Record<Locale, string> = { 'pt-BR': 'pt-BR', en: 'en-US', es: 'es-ES' };

/** Translates outside React (helpers, toasts in plain functions) using the active language. */
export const translate: Translate = (text, values) => translator(activeLocale)(text, values);

/** First validation message of a failed parse, in the active language. */
export const issueMessage = (error: { issues: { message: string }[] }) =>
  error.issues[0] ? translate(error.issues[0].message) : undefined;
