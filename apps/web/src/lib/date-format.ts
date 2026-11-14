'use client';
import { format, parseISO } from 'date-fns';
import { useCurrentUser } from '@/features/auth/use-current-user';

const toDate = (value: string | Date) => (typeof value === 'string' ? parseISO(value) : value);

/** Formats dates and times with the account's chosen patterns (defaults when signed out). */
export function useDateFormat() {
  const { data } = useCurrentUser();
  const datePattern = data?.preferences.dateFormat ?? 'dd/MM/yyyy';
  const timePattern = data?.preferences.timeFormat === '12h' ? 'h:mm a' : 'HH:mm';
  return {
    date: (value: string | Date) => format(toDate(value), datePattern),
    time: (value: string | Date) => format(toDate(value), timePattern),
    dateTime: (value: string | Date) => format(toDate(value), `${datePattern} ${timePattern}`),
  };
}
