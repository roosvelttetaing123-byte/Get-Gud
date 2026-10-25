/**
 * "Your day": today's moments in time order, read off the sleep engine (energy phases,
 * the Rise-style habits, trade windows) plus today's two rituals (check in, close the day).
 * Pure and cheap, so the strip can re-read states every minute without rebuilding the schedule.
 */
import { habits, type Schedule } from '@/lib/sleep';
import { tradeWindows, type SleepEdge } from '@/lib/sleepEdge';
import type { DayLog } from '@/lib/store';

const M = 60_000;
const H = 60 * M;

export type MomentKind = 'checkin' | 'light' | 'peak' | 'dip' | 'window' | 'caffeine' | 'close' | 'screens' | 'bed';
/** Where a tap goes. */
export type MomentGo = 'gate' | 'sleep' | 'checkin' | 'close';
export type MomentState = 'past' | 'now' | 'due' | 'next';

export interface Moment {
  key: string;
  kind: MomentKind;
  at: number; // ms; the start for ranges
  end?: number; // ms, ranges only (phases and trade windows)
  label: string;
  go: MomentGo;
  /** Something you do (check in, daylight, phone away…). Done ones get a check. */
  ritual: boolean;
  done: boolean;
}

/** Ties at the same minute read in this order. */
const ORDER: MomentKind[] = ['checkin', 'light', 'window', 'peak', 'dip', 'caffeine', 'close', 'screens', 'bed'];

const HABIT_LABEL: Partial<Record<string, string>> = {
  light: 'Get daylight',
  caffeine: 'Last caffeine',
  screens: 'Phone away',
  bed: 'In bed',
};

/** Local wall-clock hour on the day of `ts`. */
const atHour = (ts: number, h: number) => {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h).getTime();
};

/**
 * Today's moments. `day` and `habitsDone` belong to the schedule's day (keyOf(sched.wakeAt)),
 * the same key the Sleep tab ticks its habits under.
 */
export function dayMoments(sched: Schedule, edge: SleepEdge, day: DayLog | undefined, habitsDone: string[]): Moment[] {
  const out: Moment[] = [];
  const done = new Set(habitsDone);
  const checkin = day?.checkin;
  const close = day?.close;

  out.push({
    key: 'checkin',
    kind: 'checkin',
    at: checkin?.at ?? sched.wakeAt + 30 * M,
    label: checkin ? 'Checked in' : 'Check in',
    go: 'checkin',
    ritual: true,
    done: !!checkin,
  });

  // Trade windows: every good phase today, past ones too (they dim).
  const windows = tradeWindows(sched, edge, -Infinity).windows;
  const windowPhases = new Set<string>(windows.map((w) => w.phase));
  for (const w of windows) {
    out.push({ key: `window-${w.phase}`, kind: 'window', at: w.start, end: w.end, label: 'Trade window', go: 'gate', ritual: false, done: false });
  }

  // The first peak and the dip, unless that phase is already a trade window (one column, not two).
  for (const p of sched.phases) {
    if ((p.id !== 'peak1' && p.id !== 'dip') || windowPhases.has(p.id)) continue;
    out.push({ key: p.id, kind: p.id === 'peak1' ? 'peak' : 'dip', at: p.start, end: p.end, label: p.label, go: 'sleep', ritual: false, done: false });
  }

  for (const h of habits(sched)) {
    const label = HABIT_LABEL[h.id];
    if (!label) continue; // the meal cut-off lives on the Sleep tab
    out.push({ key: h.id, kind: h.id as MomentKind, at: h.at, label, go: 'sleep', ritual: true, done: done.has(h.id) });
  }

  // Close the day: when Today starts asking for it (17:00 once checked in, else 18:00).
  out.push({
    key: 'close',
    kind: 'close',
    at: close?.at ?? atHour(sched.wakeAt, checkin ? 17 : 18),
    label: close ? 'Day closed' : 'Close the day',
    go: 'close',
    ritual: true,
    done: !!close,
  });

  return out.sort((a, b) => a.at - b.at || ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
}

/** Where a moment stands at `now`. Rituals still worth doing stay lit ("due") after their time. */
export function momentState(m: Moment, now: number, bedAt?: number): MomentState {
  if (m.end !== undefined) return now >= m.end ? 'past' : now >= m.at ? 'now' : 'next';
  if (now < m.at) return 'next';
  if (m.done) return 'past';
  if (m.kind === 'checkin') return now < atHour(m.at, 17) ? 'due' : 'past';
  if (m.kind === 'close') return 'due';
  // Phone away runs until bedtime.
  if (m.kind === 'screens' && bedAt !== undefined && now < bedAt) return 'now';
  return 'past';
}

/** Index in `moments` where the "now" marker goes: after everything that has started. */
export function nowIndex(moments: Moment[], now: number): number {
  const i = moments.findIndex((m) => m.at > now);
  return i < 0 ? moments.length : i;
}

/**
 * No night logged and you're up: before your usual wake time, or within 4 h of it. Logging it
 * (or a Health sync) moves today's whole schedule to when you really woke.
 */
export const wantsNightLog = (sched: Schedule, lastNight: number | undefined, now: number) =>
  lastNight === undefined && !sched.actualWake && now < sched.wakeAt + 4 * H;
