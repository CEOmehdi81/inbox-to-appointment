export type DateFilter = 'today' | 'week' | 'all';

const DEFAULT_TZ = 'Europe/Paris';

function tzOffsetMs(atUtcDate: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(dtf.formatToParts(atUtcDate).map(p => [p.type, p.value]));
  const asUTC = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  );
  return asUTC - atUtcDate.getTime();
}

function zonedTimeToUtc(
  y: number, m1: number, d: number, h = 0, min = 0, s = 0, timeZone = DEFAULT_TZ
) {
  const guess = Date.UTC(y, m1, d, h, min, s);
  const offset = tzOffsetMs(new Date(guess), timeZone);
  return new Date(guess - offset);
}

export function getDateRange(filter: DateFilter, timeZone = DEFAULT_TZ) {
  if (filter === 'all') return { start: undefined, end: undefined };

  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const Y = Number(parts.find(p => p.type === 'year')!.value);
  const M = Number(parts.find(p => p.type === 'month')!.value);
  const D = Number(parts.find(p => p.type === 'day')!.value);

  const startOfToday = zonedTimeToUtc(Y, M - 1, D, 0, 0, 0, timeZone);
  const startOfTomorrow = zonedTimeToUtc(Y, M - 1, D + 1, 0, 0, 0, timeZone);

  if (filter === 'today') return { start: startOfToday, end: startOfTomorrow };

  // ISO week: Monday 00:00 → next Monday 00:00
  const weekday = Number(new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(now)
    .replace(/Sun|Mon|Tue|Wed|Thu|Fri|Sat/, m => ({Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6} as any)[m]));
  const isoDow = weekday === 0 ? 7 : weekday; // Sun=7
  const monday = zonedTimeToUtc(Y, M - 1, D - (isoDow - 1), 0, 0, 0, timeZone);
  const nextMonday = zonedTimeToUtc(Y, M - 1, D - (isoDow - 1) + 7, 0, 0, 0, timeZone);
  return { start: monday, end: nextMonday };
}

export function formatForLocale(
  date: Date | string,
  locale?: string,
  opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
  timeZone = DEFAULT_TZ
) {
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat(locale || 'en', { ...opts, timeZone }).format(d);
  } catch {
    return new Intl.DateTimeFormat('en', { ...opts, timeZone }).format(d);
  }
}

export function isMissed(requestedStart: Date | string, now = new Date()) {
  const d = typeof requestedStart === 'string' ? new Date(requestedStart) : requestedStart;
  return d.getTime() < now.getTime();
}

