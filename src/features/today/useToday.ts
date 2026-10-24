import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { dayKey } from '@/lib/store';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
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

/** "Friday 23 October". Formatted by hand so it never depends on the device's Intl data. */
export function formatDay(d: Date): string {
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Apple style date line: "Saturday, 24 October". */
export function appleDate(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Single-letter weekday for compact strips. */
export function weekdayLetter(d: Date): string {
  return WEEKDAYS[d.getDay()][0];
}

const sameHour = (a: Date, b: Date) => dayKey(a) === dayKey(b) && a.getHours() === b.getHours();

/**
 * The current time as state, refreshed when the hour changes (and when the app comes back
 * from the background). Hourly is enough for Today: the stage flips at 17:00 and 18:00 and
 * the day rolls over at midnight. Re-renders at most once an hour.
 */
export function useHourClock(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => {
      const next = new Date();
      setNow((prev) => (sameHour(prev, next) ? prev : next));
    };
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') refresh();
    });
    const timer = setInterval(refresh, 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);

  return now;
}

/**
 * The current local day as state, so the screen rolls over at midnight
 * (and when the app comes back from the background) without a restart.
 * Only re-renders when the calendar day actually changes.
 */
export function useToday(): { now: Date; key: string } {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => {
      const next = new Date();
      setNow((prev) => (dayKey(prev) === dayKey(next) ? prev : next));
    };
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') refresh();
    });
    const timer = setInterval(refresh, 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);

  return { now, key: dayKey(now) };
}
