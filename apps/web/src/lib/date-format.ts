'use client';
import { format, parseISO } from 'date-fns';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { useI18n } from '@/i18n/provider';

const toDate = (value: string | Date) => (typeof value === 'string' ? parseISO(value) : value);

/** Formats dates and times with the account's chosen patterns (defaults when signed out). */
export function useDateFormat() {
  const { data } = useCurrentUser();
  const { dateLocale: locale } = useI18n();
  const datePattern = data?.preferences.dateFormat ?? 'dd/MM/yyyy';
  const timePattern = data?.preferences.timeFormat === '12h' ? 'h:mm a' : 'HH:mm';
  return {
    date: (value: string | Date) => format(toDate(value), datePattern, { locale }),
    time: (value: string | Date) => format(toDate(value), timePattern, { locale }),
    dateTime: (value: string | Date) =>
      format(toDate(value), `${datePattern} ${timePattern}`, { locale }),
  };
}
