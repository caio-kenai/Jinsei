'use client';
import { currentDateLocale } from '@/i18n/config';
import { useT } from '@/i18n/provider';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  CircleCheck,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  LoaderCircle,
  Play,
} from 'lucide-react';
import { calendarEventLabels, type CalendarEvent, type MediaType } from '@jinsei/contracts';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

const eventIcons = { started: Play, completed: CircleCheck, viewed: Clapperboard };
const VISIBLE = 3;
const iso = (date: Date) => format(date, 'yyyy-MM-dd');

export function LibraryCalendar({
  mediaType,
  favorite,
  onOpen,
}: {
  mediaType?: MediaType;
  favorite?: boolean;
  onOpen: (id: string) => void;
}) {
  const t = useT();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [expanded, setExpanded] = useState<string | null>(null);
  const first = startOfWeek(startOfMonth(month));
  const last = endOfWeek(endOfMonth(month));
  const days: Date[] = [];
  for (let date = first; date <= last; date = addDays(date, 1)) days.push(date);
  const parameters = new URLSearchParams({ from: iso(first), to: iso(last) });
  if (mediaType) parameters.set('mediaType', mediaType);
  if (favorite) parameters.set('favorite', 'true');
  const result = useQuery({
    queryKey: ['library', 'calendar', parameters.toString()],
    queryFn: () => api<{ events: CalendarEvent[] }>(`/library/calendar?${parameters}`),
  });
  const byDay = new Map<string, CalendarEvent[]>();
  for (const event of result.data?.events ?? [])
    byDay.set(event.date, [...(byDay.get(event.date) ?? []), event]);
  return (
    <div className="calendar">
      <div className="calendar-toolbar">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('Mês anterior')}
          onClick={() => setMonth(addMonths(month, -1))}
        >
          <ChevronLeft size={15} />
        </Button>
        <h2>{format(month, t("MMMM 'de' yyyy"), { locale: currentDateLocale() })}</h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('Próximo mês')}
          onClick={() => setMonth(addMonths(month, 1))}
        >
          <ChevronRight size={15} />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>
          {t('Hoje')}
        </Button>
        {result.isFetching && <LoaderCircle className="spin muted" size={13} />}
        <span className="calendar-legend">
          {Object.entries(calendarEventLabels).map(([kind, label]) => {
            const Icon = eventIcons[kind as keyof typeof eventIcons];
            return (
              <span key={kind} data-kind={kind}>
                <Icon size={11} />
                {label}
              </span>
            );
          })}
        </span>
      </div>
      {result.error && <p className="error-banner">{result.error.message}</p>}
      <div className="calendar-grid" role="grid" aria-label={t('Calendário da biblioteca')}>
        {days.slice(0, 7).map((day) => (
          <div className="calendar-weekday" role="columnheader" key={day.toISOString()}>
            {format(day, 'EEE', { locale: currentDateLocale() })}
          </div>
        ))}
        {days.map((day) => {
          const key = iso(day);
          const events = byDay.get(key) ?? [];
          const open = expanded === key;
          const visible = open ? events : events.slice(0, VISIBLE);
          return (
            <div
              key={key}
              role="gridcell"
              className={`calendar-day ${isSameMonth(day, month) ? '' : 'outside'} ${
                isToday(day) ? 'today' : ''
              } ${open ? 'expanded' : ''}`}
              aria-label={t('{day}: {count} eventos', {
                day: format(day, t("d 'de' MMMM"), { locale: currentDateLocale() }),
                count: events.length,
              })}
            >
              <span className="calendar-date">{format(day, 'd')}</span>
              {visible.map((event) => {
                const Icon = eventIcons[event.kind];
                return (
                  <button
                    key={`${event.kind}:${event.entryId}:${event.date}`}
                    className="calendar-event"
                    data-kind={event.kind}
                    title={`${t(calendarEventLabels[event.kind])}: ${event.title}`}
                    onClick={() => onOpen(event.entryId)}
                  >
                    <Icon size={10} />
                    <span>{event.title}</span>
                  </button>
                );
              })}
              {events.length > VISIBLE && (
                <button
                  className="calendar-more"
                  onClick={() => setExpanded(open ? null : key)}
                  aria-expanded={open}
                >
                  {open ? t('Mostrar menos') : `+${events.length - VISIBLE} mais`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
