import type { MissionPeriod } from '@jinsei/contracts';

const formatter = new Map<string, Intl.DateTimeFormat>();
function parts(date: Date, timeZone: string) {
  if (!formatter.has(timeZone))
    formatter.set(
      timeZone,
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }),
    );
  return Object.fromEntries(
    formatter
      .get(timeZone)!
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', string>;
}
/** Difference between local wall-clock time in the zone and UTC at that instant. */
function offset(instant: number, timeZone: string) {
  const local = parts(new Date(instant), timeZone);
  const wall = Date.UTC(
    Number(local.year),
    Number(local.month) - 1,
    Number(local.day),
    Number(local.hour),
    Number(local.minute),
    Number(local.second),
  );
  return wall - Math.floor(instant / 1000) * 1000;
}

/** Calendar day (YYYY-MM-DD) of an instant in the person's time zone. */
export function localDay(date: Date, timeZone: string) {
  const local = parts(date, timeZone);
  return `${local.year}-${local.month}-${local.day}`;
}
export function addDays(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
/** UTC instant of local midnight at the start of a day in the zone. */
export function zonedStart(day: string, timeZone: string) {
  const guess = Date.parse(`${day}T00:00:00.000Z`);
  const first = guess - offset(guess, timeZone);
  return new Date(guess - offset(first, timeZone));
}

export type PeriodRange = { key: string; start: Date; end: Date };
export function periodRange(period: MissionPeriod, today: string, timeZone: string): PeriodRange {
  if (period === 'daily')
    return {
      key: `d:${today}`,
      start: zonedStart(today, timeZone),
      end: zonedStart(addDays(today, 1), timeZone),
    };
  if (period === 'weekly') {
    const weekday = new Date(`${today}T00:00:00.000Z`).getUTCDay();
    const monday = addDays(today, -((weekday + 6) % 7));
    return {
      key: `w:${monday}`,
      start: zonedStart(monday, timeZone),
      end: zonedStart(addDays(monday, 7), timeZone),
    };
  }
  const first = `${today.slice(0, 7)}-01`;
  const next = new Date(`${first}T00:00:00.000Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return {
    key: `m:${today.slice(0, 7)}`,
    start: zonedStart(first, timeZone),
    end: zonedStart(next.toISOString().slice(0, 10), timeZone),
  };
}
