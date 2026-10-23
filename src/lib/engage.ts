/**
 * Daily engagement: rings, forgiving streaks, medals.
 *
 * Evidence-based choices (see DESIGN.md):
 * - Rings give partial credit, so a 70% day still shows progress.
 * - The streak counts days you SHOWED UP (check-in, close or any promise), not perfect days.
 * - Freezes auto-protect missed days (start with 2, +1 per 7-day streak, max 3); rest days never break it.
 * - Medals reward process (discipline, honoured Stops), never P&L.
 */
import type { ImageSource } from 'expo-image';

import { RING, type RingKey } from '@/constants/theme';

import { dayKey, type State, type Trade } from './store';

/* ---------- rings ---------- */

export interface Rings {
  promises: number; // 0..1+
  mind: number;
  discipline: number;
}

export interface RingDetail {
  key: RingKey;
  label: string;
  value: number; // 0..1 (can exceed 1 visually only for promises; capped elsewhere)
  done: number;
  total: number;
  caption: string; // plain words for under the ring
}

const tradesOn = (s: State, key: string) => s.trades.filter((t) => dayKey(t.ts) === key);

const honoured = (t: Trade) => !t.overridden && t.followedRules !== false;

export function ringsFor(s: State, key: string): Rings {
  const day = s.days[key];
  const ps = s.settings.promises;
  const kept = ps.filter((p) => day?.promises?.[p]).length;
  const entries = tradesOn(s, key);
  return {
    promises: ps.length ? kept / ps.length : 0,
    mind: (day?.checkin ? 0.5 : 0) + (day?.close ? 0.5 : 0),
    discipline: entries.length ? entries.filter(honoured).length / entries.length : 1,
  };
}

export function ringDetails(s: State, key: string): RingDetail[] {
  const day = s.days[key];
  const ps = s.settings.promises;
  const kept = ps.filter((p) => day?.promises?.[p]).length;
  const entries = tradesOn(s, key);
  const good = entries.filter(honoured).length;
  const mindDone = (day?.checkin ? 1 : 0) + (day?.close ? 1 : 0);
  return [
    {
      key: 'promises',
      label: RING.promises.label,
      value: ps.length ? kept / ps.length : 0,
      done: kept,
      total: ps.length,
      caption: ps.length ? `${kept} of ${ps.length} kept` : 'Add promises',
    },
    {
      key: 'mind',
      label: RING.mind.label,
      value: mindDone / 2,
      done: mindDone,
      total: 2,
      caption: !day?.checkin ? 'Check in' : !day?.close ? 'Close the day' : 'Both rituals done',
    },
    {
      key: 'discipline',
      label: RING.discipline.label,
      value: entries.length ? good / entries.length : 1,
      done: good,
      total: entries.length,
      caption: entries.length ? `${good} of ${entries.length} by the rules` : 'No trades. That counts.',
    },
  ];
}

export const isPerfect = (r: Rings) => r.promises >= 1 && r.mind >= 1 && r.discipline >= 1;

/* ---------- streak ---------- */

export function showedUp(s: State, key: string): boolean {
  const d = s.days[key];
  if (!d) return false;
  return !!(d.checkin || d.close || Object.values(d.promises ?? {}).some(Boolean));
}

function earliestKey(s: State): string | null {
  const keys = [...Object.keys(s.days), ...s.trades.map((t) => dayKey(t.ts)), ...s.urges.map((u) => dayKey(u.ts))];
  return keys.length ? keys.sort()[0] : null;
}

const prevDay = (d: Date) => {
  const x = new Date(d);
  x.setDate(x.getDate() - 1);
  return x;
};

/** Days in a row you showed up. Frozen and rest days are skipped (they don't break it or count). */
export function streak(s: State, now = new Date()): number {
  const first = earliestKey(s);
  if (!first) return 0;
  let n = showedUp(s, dayKey(now)) ? 1 : 0;
  let d = prevDay(now);
  for (let i = 0; i < 2000; i++) {
    const k = dayKey(d);
    if (k < first) break;
    if (showedUp(s, k)) n++;
    else if (s.days[k]?.frozen || s.settings.restDays.includes(d.getDay())) {
      // protected: keep walking
    } else break;
    d = prevDay(d);
  }
  return n;
}

export interface StreakDay {
  key: string;
  date: Date;
  state: 'done' | 'frozen' | 'rest' | 'missed' | 'today' | 'future';
  rings: Rings;
}

/** The current week, Monday first, for the week strip. */
export function weekStrip(s: State, now = new Date()): StreakDay[] {
  const today = dayKey(now);
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const k = dayKey(d);
    let st: StreakDay['state'];
    if (k > today) st = 'future';
    else if (showedUp(s, k)) st = 'done';
    else if (k === today) st = 'today';
    else if (s.days[k]?.frozen) st = 'frozen';
    else if (s.settings.restDays.includes(d.getDay())) st = 'rest';
    else st = 'missed';
    return { key: k, date: d, state: st, rings: ringsFor(s, k) };
  });
}

/**
 * Run once per day (on launch / focus). Auto-applies freezes to missed days since you
 * last showed up, and credits a new freeze for every 7-day streak (max 3).
 * Returns the new state, or the same object if nothing changed.
 */
export function reconcile(s: State, now = new Date()): State {
  const today = dayKey(now);
  if (s.lastReconciled === today) return s;
  let next: State = { ...s, lastReconciled: today };

  // 1) Find missed days between the last day you showed up and yesterday.
  const gap: string[] = [];
  let d = prevDay(now);
  const first = earliestKey(s);
  for (let i = 0; i < 60 && first; i++) {
    const k = dayKey(d);
    if (k < first) break;
    if (showedUp(s, k) || s.days[k]?.frozen) break;
    if (!s.settings.restDays.includes(d.getDay())) gap.push(k);
    d = prevDay(d);
  }
  const hadStreak = first ? streak({ ...s, days: s.days }, d) > 0 : false; // streak as of the day before the gap
  if (gap.length && hadStreak && gap.length <= s.settings.freezes) {
    const days = { ...next.days };
    gap.forEach((k) => (days[k] = { ...(days[k] ?? { promises: {} }), frozen: true }));
    next = { ...next, days, settings: { ...next.settings, freezes: next.settings.freezes - gap.length } };
  }

  // 2) Earn freezes: +1 per completed 7-day block of the current streak (max 3 in the bank).
  const current = streak(next, prevDay(now));
  const blocks = Math.floor(current / 7);
  const mark = next.freezeMark ?? 0;
  if (blocks > mark) {
    next = {
      ...next,
      freezeMark: blocks,
      settings: { ...next.settings, freezes: Math.min(3, next.settings.freezes + (blocks - mark)) },
    };
  } else if (blocks < mark) {
    next = { ...next, freezeMark: blocks };
  }
  return next;
}

/* ---------- medals ---------- */

export interface Award {
  id: string;
  title: string;
  detail: string; // how it's earned, in plain words
  image: ImageSource;
  earned: (s: State) => boolean;
  /** For locked medals: progress toward it, 0..1. */
  progress?: (s: State) => number;
}

const resisted = (s: State) => s.urges.filter((u) => u.outcome === 'resisted').length;
const walkedAway = (s: State) => s.trades.filter((t) => !t.taken).length;

function perfectDays(s: State): string[] {
  return Object.keys(s.days)
    .filter((k) => isPerfect(ringsFor(s, k)))
    .sort();
}

function longestPerfectRun(s: State): number {
  const ks = perfectDays(s);
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of ks) {
    if (prev) {
      const p = new Date(prev);
      p.setDate(p.getDate() + 1);
      run = dayKey(p) === k ? run + 1 : 1;
    } else run = 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

function bestStreak(s: State): number {
  // Current streak is the one that matters for unlocking; past runs are credited when they happened.
  return streak(s);
}

const streakAward = (n: number, image: ImageSource): Award => ({
  id: `streak-${n}`,
  title: `${n}-day streak`,
  detail: n === 66 ? `Show up ${n} days in a row. The median time for a habit to stick.` : `Show up ${n} days in a row.`,
  image,
  earned: (s) => bestStreak(s) >= n,
  progress: (s) => Math.min(1, bestStreak(s) / n),
});

export const AWARDS: Award[] = [
  {
    id: 'walked-away',
    title: 'Walked away',
    detail: 'Honour a Stop from the gate. The trade most traders can’t make.',
    image: require('@/assets/3d/medal-walked-away.webp'),
    earned: (s) => walkedAway(s) >= 1,
    progress: (s) => Math.min(1, walkedAway(s)),
  },
  streakAward(3, require('@/assets/3d/medal-streak-3.webp')),
  streakAward(7, require('@/assets/3d/medal-streak-7.webp')),
  {
    id: 'perfect-day',
    title: 'Perfect day',
    detail: 'Close all three rings in one day.',
    image: require('@/assets/3d/medal-perfect-day.webp'),
    earned: (s) => perfectDays(s).length >= 1,
  },
  {
    id: 'urge-surfer',
    title: 'Urge surfer',
    detail: 'Ride out 5 urges without giving in.',
    image: require('@/assets/3d/medal-urge-surfer.webp'),
    earned: (s) => resisted(s) >= 5,
    progress: (s) => Math.min(1, resisted(s) / 5),
  },
  streakAward(21, require('@/assets/3d/medal-streak-21.webp')),
  {
    id: 'ring-trophy',
    title: 'Ring trophy',
    detail: 'Close all three rings 7 days in a row.',
    image: require('@/assets/3d/ring-trophy.webp'),
    earned: (s) => longestPerfectRun(s) >= 7,
    progress: (s) => Math.min(1, longestPerfectRun(s) / 7),
  },
  streakAward(66, require('@/assets/3d/medal-streak-66.webp')),
  streakAward(100, require('@/assets/3d/medal-streak-100.webp')),
];

export const LOCKED_MEDAL: ImageSource = require('@/assets/3d/medal-locked.webp');

/** Award ids whose condition is met but aren't stamped yet. */
export function newlyEarned(s: State): string[] {
  return AWARDS.filter((a) => !s.awards[a.id] && a.earned(s)).map((a) => a.id);
}

/** Earned but not yet celebrated. */
export function uncelebrated(s: State): Award[] {
  return AWARDS.filter((a) => s.awards[a.id] && !s.seenAwards.includes(a.id));
}

/* ---------- what to do next ---------- */

export type Stage = 'checkin' | 'day' | 'close' | 'done';

/** Drives Today's one primary action. */
export function stageOf(s: State, now = new Date()): Stage {
  const d = s.days[dayKey(now)];
  const h = now.getHours();
  if (d?.close) return 'done';
  if (!d?.checkin && h < 17) return 'checkin';
  if (h >= 18 || (d?.checkin && h >= 17)) return 'close';
  return d?.checkin ? 'day' : 'checkin';
}
