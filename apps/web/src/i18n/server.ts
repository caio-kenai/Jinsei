import { cookies, headers } from 'next/headers';
import { LOCALE_COOKIE, matchLocale, translator } from './config';

/** Language for server rendering: the saved choice, otherwise the browser's preference. */
export async function getLocale() {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (saved) return matchLocale(saved);
  return matchLocale((await headers()).get('accept-language'));
}

export async function getT() {
  return translator(await getLocale());
}
