/**
 * Reminder times, stored on the device next to the main store (its own key, so the store's
 * shape and backups stay unchanged). Times are "HH:MM", 24-hour.
 * There are no notifications yet; Settings shows these as the times to open the app.
 */
import { useSyncExternalStore } from 'react';

import { kv } from '@/lib/kv';

export interface Reminders {
  morning: string;
  evening: string;
}
export type ReminderKey = keyof Reminders;

export const DEFAULT_REMINDERS: Reminders = { morning: '07:30', evening: '21:30' };

const KEY = 'getgud:reminders';
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function load(): Reminders {
  try {
    const raw = kv.get(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Reminders>) : {};
    return {
      morning: TIME.test(parsed.morning ?? '') ? parsed.morning! : DEFAULT_REMINDERS.morning,
      evening: TIME.test(parsed.evening ?? '') ? parsed.evening! : DEFAULT_REMINDERS.evening,
    };
  } catch {
    return { ...DEFAULT_REMINDERS };
  }
}

let current: Reminders = load();
const listeners = new Set<() => void>();

function commit(next: Reminders) {
  current = next;
  try {
    kv.set(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable: keep it in memory
  }
  listeners.forEach((l) => l());
}

export function useReminders(): Reminders {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => current,
  );
}

export function setReminder(key: ReminderKey, time: string) {
  if (!TIME.test(time) || current[key] === time) return;
  commit({ ...current, [key]: time });
}

export function resetReminders() {
  commit({ ...DEFAULT_REMINDERS });
}

/** "07:30" -> [7, 30]. */
export const splitTime = (t: string): [number, number] => {
  const [h, m] = t.split(':').map(Number);
  return [h || 0, m || 0];
};
export const joinTime = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
