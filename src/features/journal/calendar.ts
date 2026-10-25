/**
 * "Your days": the month grid and what each day holds. Pure functions; the screen passes `now`.
 * Months are stepped with the calendar at noon, so daylight saving never shifts a day.
 */
import { asleepHours, isNap, keyOf } from '@/lib/sleep';
import type { CheckIn, DayClose, DayLog, State, Trade } from '@/lib/store';

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface CalDay {
  key: string;
  day: number; // day of the month
  inMonth: boolean;
  today: boolean;
  future: boolean;
}

export interface MonthGrid {
  offset: number; // 0 = this month, -1 = last month
  title: string; // "October", or "October 2025" outside this year
  days: CalDay[]; // 6 weeks × 7, Monday first
}

/** Month `offset` months from the month of `now`. */
export function monthGrid(offset: number, now: number): MonthGrid {
  const today = new Date(now);
  const todayKey = keyOf(now);
  const first = new Date(today.getFullYear(), today.getMonth() + offset, 1, 12);
  const y = first.getFullYear();
  const m = first.getMonth();
  const lead = (first.getDay() + 6) % 7;
  const days: CalDay[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(y, m, 1 - lead + i, 12);
    const key = keyOf(d.getTime());
    return { key, day: d.getDate(), inMonth: d.getMonth() === m, today: key === todayKey, future: key > todayKey };
  });
  return { offset, title: y === today.getFullYear() ? MONTHS_LONG[m] : `${MONTHS_LONG[m]} ${y}`, days };
}

/** How many months back `key` is from the month of `now` (0 or negative). */
export function monthOffset(key: string, now: number): number {
  const d = new Date(now);
  const [y, m] = key.split('-').map(Number);
  return (y - d.getFullYear()) * 12 + (m - 1 - d.getMonth());
}

/** The first day anything was logged: a check-in or close, a trade, an urge or a night. */
export function firstKey(s: State): string | undefined {
  const keys = [
    ...Object.keys(s.days),
    ...s.trades.map((t) => keyOf(t.ts)),
    ...s.urges.map((u) => keyOf(u.ts)),
    ...(s.sleeps ?? []).map((l) => keyOf(l.wake)),
  ];
  return keys.length ? keys.sort()[0] : undefined;
}

/** This morning's State of Mind, 1–7. Older 1–5 moods are spread onto the same scale. */
export function valenceOf(d?: DayLog): number | undefined {
  const v = d?.checkin?.valence;
  if (v !== undefined) return Math.max(1, Math.min(7, Math.round(v)));
  if (d?.mood !== undefined) return Math.max(1, Math.min(7, Math.round(1 + (d.mood - 1) * 1.5)));
  return undefined;
}

/** "22 check-ins · 18 on the pleasant side", for the month in view. */
export function monthLine(s: State, grid: MonthGrid): string {
  const vs = grid.days.filter((d) => d.inMonth).map((d) => valenceOf(s.days[d.key])).filter((v): v is number => v !== undefined);
  if (!vs.length) return grid.offset === 0 ? 'Check in on Today to colour your days' : 'No check-ins this month';
  const pleasant = vs.filter((v) => v >= 5).length;
  const n = `${vs.length} ${vs.length === 1 ? 'check-in' : 'check-ins'}`;
  return pleasant ? `${n} · ${pleasant} on the pleasant side` : n;
}

/** "Friday 23 October". */
export function dayTitle(key: string): string {
  const d = new Date(`${key}T12:00:00`);
  return `${WEEKDAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
}

/* ---------- one day ---------- */

export interface DayDetail {
  key: string;
  title: string; // "Friday 23 October"
  checkin?: CheckIn;
  valence?: number;
  close?: DayClose;
  /** Sleep that ended this morning, and naps later in the day. */
  sleep?: { hours: number; bed: number; wake: number; naps: number };
  trades: Trade[]; // oldest first
  promises: { name: string; kept: boolean }[];
  urges: { logged: number; riddenOut: number };
  empty: boolean;
}

export function dayDetail(s: State, key: string): DayDetail {
  const day = s.days[key];
  const logs = (s.sleeps ?? []).filter((l) => keyOf(l.wake) === key);
  const mains = logs.filter((l) => !isNap(l)).sort((a, b) => a.bed - b.bed);
  const naps = logs.filter((l) => isNap(l)).reduce((a, l) => a + asleepHours(l), 0);
  const sleep = mains.length
    ? { hours: mains.reduce((a, l) => a + asleepHours(l), 0), bed: mains[0].bed, wake: mains[mains.length - 1].wake, naps }
    : undefined;
  const trades = s.trades.filter((t) => keyOf(t.ts) === key).sort((a, b) => a.ts - b.ts);
  // Promises you had that day: today's list, plus any older ones that day still mentions.
  const names = [...s.settings.promises, ...Object.keys(day?.promises ?? {}).filter((p) => !s.settings.promises.includes(p) && day?.promises[p])];
  const promises = names.map((name) => ({ name, kept: !!day?.promises?.[name] }));
  const urges = s.urges.filter((u) => keyOf(u.ts) === key);
  const tracked = !!day && !!(day.checkin || day.close || Object.values(day.promises ?? {}).some(Boolean));
  return {
    key,
    title: dayTitle(key),
    checkin: day?.checkin,
    valence: valenceOf(day),
    close: day?.close,
    sleep,
    trades,
    promises: tracked ? promises : [],
    urges: { logged: urges.length, riddenOut: urges.filter((u) => u.outcome === 'resisted').length },
    empty: !tracked && !sleep && !trades.length && !urges.length,
  };
}
