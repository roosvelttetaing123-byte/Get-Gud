/**
 * Sleep brain. Pure functions, no React, no storage.
 *
 * Sleep debt: 14-night rolling window against your sleep need. Recent nights weigh more
 * (last night ~15% of the window, older nights share the rest with exponential decay).
 * Extra sleep pays debt down, capped per night so you can't "bank" sleep.
 *
 * Energy schedule: a two-process model (Borbély).
 *   Process S, sleep pressure, builds while awake and starts higher when you carry debt.
 *   Process C, the circadian rhythm, is anchored to your typical wake time (body-clock low
 *   about 2 h before waking). A 24 h and a 12 h harmonic give the morning rise, the
 *   afternoon dip, the evening wake-maintenance peak and the drop into the melatonin window.
 *   Energy = C - S - sleep inertia. Phases are read off the curve, not hard-coded.
 */
import type { SleepLog, State } from './store';

const H = 3_600_000;
const M = 60_000;

/* ---------- basics ---------- */

export const DEFAULT_NEED = 8;
export const DEBT_WINDOW = 14;
/** Default minutes to fall asleep after tapping "Good night". */
export const DEFAULT_LATENCY = 15;

/** Hours actually asleep in a log. */
export function asleepHours(l: SleepLog): number {
  const span = (l.wake - l.bed) / H;
  return Math.max(0, span - ((l.latencyMin ?? 0) + (l.awakeMin ?? 0)) / 60);
}

/** Local day key (YYYY-MM-DD) without importing the store at runtime. */
export function keyOf(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A nap: short, and you woke in the daytime. */
export function isNap(l: SleepLog): boolean {
  if (l.nap !== undefined) return l.nap;
  const h = new Date(l.wake).getHours();
  return (l.wake - l.bed) / H < 3 && h >= 10 && h < 21;
}

const minuteOfDay = (ts: number) => {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
};

/** Circular median of clock times (minutes after midnight), so 23:50 and 00:10 average to midnight. */
function clockMedian(mins: number[]): number | undefined {
  if (!mins.length) return undefined;
  // Unwrap around the first value, take the median, wrap back.
  const ref = mins[0];
  const un = mins.map((m) => (m - ref > 720 ? m - 1440 : ref - m > 720 ? m + 1440 : m)).sort((a, b) => a - b);
  const mid = un[Math.floor(un.length / 2)];
  return ((mid % 1440) + 1440) % 1440;
}

/* ---------- nights and debt ---------- */

export interface Night {
  key: string; // the morning you woke up
  hours: number; // main sleep + naps that day
  main?: SleepLog;
  naps: number; // nap hours
}

/** Sleep per wake-day, for the last `n` days ending today (oldest first). Missing days have hours 0 and no main. */
export function nights(logs: SleepLog[], now = Date.now(), n = DEBT_WINDOW): Night[] {
  const out: Night[] = [];
  const byKey = new Map<string, { main?: SleepLog; mainH: number; naps: number }>();
  for (const l of logs) {
    const k = keyOf(l.wake);
    const e = byKey.get(k) ?? { mainH: 0, naps: 0 };
    const h = asleepHours(l);
    if (isNap(l)) e.naps += h;
    else if (h > e.mainH) {
      // Two main sleeps on one day (split night): keep the longer as main, add the other as extra.
      if (e.main) e.naps += e.mainH;
      e.main = l;
      e.mainH = h;
    } else e.naps += h;
    byKey.set(k, e);
  }
  const today = new Date(now);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i, 12);
    const k = keyOf(d.getTime());
    const e = byKey.get(k);
    out.push({ key: k, hours: e ? e.mainH + e.naps : 0, main: e?.main, naps: e?.naps ?? 0 });
  }
  return out;
}

/** Weights for nights, index 0 = last night. 15% on last night, 85% decaying over the other 13; sums to 1. */
export const DEBT_WEIGHTS: number[] = (() => {
  const decay = 0.88;
  const rest = Array.from({ length: DEBT_WINDOW - 1 }, (_, i) => Math.pow(decay, i));
  const sum = rest.reduce((a, b) => a + b, 0);
  return [0.15, ...rest.map((r) => (0.85 * r) / sum)];
})();

/** Max surplus hours one night can pay back. */
const SURPLUS_CAP = 1.5;

export interface Debt {
  hours: number; // sleep debt, >= 0
  known: number; // nights with data in the window
  lastNight?: number; // hours slept last night (incl. naps yesterday-to-today)
  zone: 'low' | 'moderate' | 'high';
}

/**
 * Debt = 14 x weighted mean nightly shortfall. A steady 1 h short every night gives ~14 h;
 * one bad night (2 h short) gives ~4 h. Nights without data count as neither short nor long.
 */
export function sleepDebt(logs: SleepLog[], need: number, now = Date.now()): Debt {
  const ns = nights(logs, now).reverse(); // index 0 = today (last night)
  let sum = 0;
  let known = 0;
  ns.forEach((n, i) => {
    if (!n.main && n.naps === 0) return;
    known++;
    const diff = need - n.hours;
    sum += DEBT_WEIGHTS[i] * DEBT_WINDOW * (diff < 0 ? Math.max(diff, -SURPLUS_CAP) : diff);
  });
  const hours = Math.max(0, sum);
  const last = ns[0].main || ns[0].naps ? ns[0].hours : undefined;
  return { hours, known, lastNight: last, zone: debtZone(hours) };
}

export const debtZone = (h: number): Debt['zone'] => (h < 5 ? 'low' : h < 10 ? 'moderate' : 'high');

/* ---------- body clock ---------- */

export interface Clock {
  /** Typical wake, minutes after midnight. */
  wake: number;
  /** Typical sleep onset, minutes after midnight. */
  onset: number;
  /**
   * Body-clock low (core temperature minimum), minutes after midnight. Taken from the
   * midpoint of your sleep (the standard chronotype marker), so it moves only half as far
   * as one late bedtime and stays put when you cut sleep short.
   */
  nadir: number;
  /** How many nights the clock is based on (0 = defaults). */
  basis: number;
}

const wrap = (m: number) => ((m % 1440) + 1440) % 1440;

/** Your body clock from the last 10 main sleeps. Falls back to a wake goal (or 07:00) and your need. */
export function bodyClock(logs: SleepLog[], need: number, wakeGoal?: string): Clock {
  const main = logs.filter((l) => !isNap(l)).slice(0, 10);
  const goal = wakeGoal ? parseClock(wakeGoal) : undefined;
  const wake = clockMedian(main.map((l) => minuteOfDay(l.wake))) ?? goal ?? 7 * 60;
  const enough = main.length >= 3;
  const onset = enough ? clockMedian(main.map((l) => minuteOfDay(l.bed + (l.latencyMin ?? 0) * M)))! : wrap(wake - need * 60);
  const mid = enough
    ? clockMedian(main.map((l) => minuteOfDay((l.bed + (l.latencyMin ?? 0) * M + l.wake) / 2)))!
    : wrap(wake - need * 30);
  return { wake, onset, nadir: wrap(mid + 105), basis: main.length };
}

export function parseClock(s: string): number | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return undefined;
  return (Number(m[1]) % 24) * 60 + (Number(m[2]) % 60);
}

/* ---------- energy model ---------- */

const TAU_WAKE = 18.2; // h, rise time constant of sleep pressure
const INERTIA_TAU = 0.6; // h

/*
 * Coefficients fitted (least squares) to the shape of a rested day: groggy first 90 min,
 * morning peak ~3-4 h after waking, afternoon dip ~7-8 h, evening peak ~11-12 h,
 * steep drop into the melatonin window ~16 h after waking.
 */
const FIT = { a1: 1.48, p1: 10.0, a2: 0.8, p2: 4.03, k: 1.11, scale: 30.3, base: 57 };

/** Circadian alertness at h hours after the body-clock low (which sits 2 h before typical wake). */
function circadian(h: number): number {
  const w = (2 * Math.PI) / 24;
  return FIT.a1 * Math.cos(w * (h - FIT.p1)) + FIT.a2 * Math.cos(2 * w * (h - FIT.p2));
}

/**
 * Energy 0..100 at `t` hours after today's wake.
 * Debt drags the whole day down (up to 30 points) and digs the afternoon dip deeper.
 */
export function energyAt(t: number, debt: number, wakeShift = 0): number {
  // wakeShift: today's wake minus typical wake, in hours. The body clock doesn't move with one late morning.
  const h = 2 + wakeShift + t;
  const S = 1 - (1 - 0.18) * Math.exp(-t / TAU_WAKE);
  const inertia = 0.55 * Math.exp(-t / (INERTIA_TAU * (1 + Math.min(0.6, debt * 0.04))));
  const raw = circadian(h) - FIT.k * S - inertia;
  const drag = Math.min(30, debt * 1.8) * (0.65 + 0.35 * Math.exp(-(((t - 8) / 2.2) ** 2)));
  return Math.max(0, Math.min(100, FIT.base + FIT.scale * raw - drag));
}

export type PhaseId = 'groggy' | 'peak1' | 'dip' | 'peak2' | 'winddown' | 'melatonin' | 'sleep';

export interface Phase {
  id: PhaseId;
  label: string;
  start: number; // ms
  end: number; // ms
  tip: string;
}

export interface Schedule {
  wakeAt: number; // ms, today's wake (actual or typical)
  actualWake: boolean;
  melatonin: { start: number; end: number };
  phases: Phase[];
  curve: { t: number; e: number }[]; // t = ms
  /** Bedtime that meets your need for tomorrow's typical wake. */
  bedtimeForNeed: number;
}

const PHASE_COPY: Record<PhaseId, { label: string; tip: string }> = {
  groggy: { label: 'Grogginess', tip: 'Get daylight in your eyes. No big calls yet.' },
  peak1: { label: 'Morning peak', tip: 'Hardest work. Charts, study, decisions.' },
  dip: { label: 'Afternoon dip', tip: 'Easy tasks. A 20 min nap fits here.' },
  peak2: { label: 'Evening peak', tip: 'Second focus window. Good for training.' },
  winddown: { label: 'Wind-down', tip: 'Dim lights, phone away, no new trades.' },
  melatonin: { label: 'Melatonin window', tip: 'Best time to fall asleep fast.' },
  sleep: { label: 'Sleep', tip: 'Sleep through to your wake time.' },
};

/** Start of the local day of `now`, plus `min` minutes. */
const atMinute = (now: number, min: number) => {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() + min * M;
};

/**
 * Today's energy schedule. Uses this morning's real wake time when logged, otherwise your typical wake.
 * After midnight but before your wake time, "today" is still the previous day's schedule.
 */
export function schedule(logs: SleepLog[], need: number, debt: number, now = Date.now(), wakeGoal?: string): Schedule {
  const clock = bodyClock(logs, need, wakeGoal);
  // Which wake does "today" hang off? If we're before typical wake (with 3 h slack), use yesterday's.
  let base = now;
  if (minuteOfDay(now) < clock.wake - 180 || (minuteOfDay(now) < clock.wake && minuteOfDay(now) < 300)) base = now - 24 * H;
  const typicalWake = atMinute(base, clock.wake);
  const todayKey = keyOf(base);
  const real = logs.find((l) => !isNap(l) && keyOf(l.wake) === todayKey);
  const wakeAt = real ? real.wake : typicalWake;
  // Body-clock low before this morning's typical wake. The model expects waking 2 h after it.
  let nadirAt = atMinute(base, clock.nadir);
  if (nadirAt > typicalWake) nadirAt -= 24 * H;
  if (typicalWake - nadirAt > 12 * H) nadirAt += 24 * H;
  const shift = (wakeAt - (nadirAt + 2 * H)) / H;

  // Melatonin window: 1 h, from 15 min before a full-need sleep centred on your body clock would start.
  const melStart = nadirAt + 24 * H - 105 * M - (need / 2) * H - 15 * M;
  const melEnd = melStart + 60 * M;
  const nextWake = typicalWake + 24 * H;
  const bedtimeForNeed = nextWake - need * H - DEFAULT_LATENCY * M;

  // Curve every 10 min from wake to melatonin end.
  const span = (melEnd - wakeAt) / H;
  const curve: { t: number; e: number }[] = [];
  for (let x = 0; x <= span + 1e-6; x += 1 / 6) curve.push({ t: wakeAt + x * H, e: energyAt(x, debt, shift) });

  // Read phases off the curve.
  const at = (i: number) => curve[Math.max(0, Math.min(curve.length - 1, i))];
  const idx = (hours: number) => Math.round(hours * 6);
  const between = (a: number, b: number, pick: 'max' | 'min') => {
    let best = idx(a);
    for (let i = idx(a); i <= Math.min(idx(b), curve.length - 1); i++) {
      if (pick === 'max' ? curve[i].e > curve[best].e : curve[i].e < curve[best].e) best = i;
    }
    return best;
  };
  const groggyEnd = Math.min(idx(1.5 + Math.min(1, debt * 0.06)), curve.length - 1);
  const p1 = between(1.5, 6, 'max');
  const dip = between(5, 10, 'min');
  const p2 = between(Math.max(dip / 6 + 1, 8), Math.max(9, span - 1), 'max');
  // Phase edges: midpoints between extremes, wind-down 2 h before the melatonin window.
  const mid = (a: number, b: number) => Math.round((a + b) / 2);
  const windStart = Math.min(melStart - 2 * H, at(p2).t + 1.5 * H);
  const e1 = at(mid(p1, dip)).t;
  const e2 = at(mid(dip, p2)).t;

  const make = (id: PhaseId, start: number, end: number): Phase => ({ id, start, end, ...PHASE_COPY[id] });
  const phases: Phase[] = [
    make('groggy', wakeAt, at(groggyEnd).t),
    make('peak1', at(groggyEnd).t, e1),
    make('dip', e1, e2),
    make('peak2', e2, Math.max(e2 + 30 * M, windStart)),
    make('winddown', Math.max(e2 + 30 * M, windStart), melStart),
    make('melatonin', melStart, melEnd),
    make('sleep', melEnd, nextWake),
  ].filter((p) => p.end > p.start);

  return { wakeAt, actualWake: !!real, melatonin: { start: melStart, end: melEnd }, phases, curve, bedtimeForNeed };
}

export function phaseAt(s: Schedule, now = Date.now()): Phase | undefined {
  return s.phases.find((p) => now >= p.start && now < p.end);
}

/* ---------- habits ---------- */

export type HabitId = 'light' | 'caffeine' | 'meal' | 'screens' | 'bed';

export interface Habit {
  id: HabitId;
  title: string;
  when: string; // short time label
  at: number; // ms, for ordering and "due" state
  kind: 'by' | 'after' | 'from';
}

const hm = (ts: number) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
export const clockLabel = hm;

/** Today's timed habits, the Rise way: light early, caffeine and food cut-offs, screens down, in bed. */
export function habits(s: Schedule): Habit[] {
  const mel = s.melatonin.start;
  const list: Habit[] = [
    { id: 'light', title: 'Get daylight', kind: 'by', at: s.wakeAt + 60 * M, when: '' },
    { id: 'caffeine', title: 'Last caffeine', kind: 'by', at: mel - 9 * H, when: '' },
    { id: 'meal', title: 'Last big meal', kind: 'by', at: mel - 3 * H, when: '' },
    { id: 'screens', title: 'Dim lights, phone away', kind: 'from', at: mel - 90 * M, when: '' },
    { id: 'bed', title: 'In bed', kind: 'by', at: mel + 15 * M, when: '' },
  ];
  return list.map((h) => ({ ...h, when: `${h.kind === 'from' ? 'From' : 'By'} ${hm(h.at)}` }));
}

/* ---------- convenience ---------- */

export interface SleepSummary {
  need: number;
  debt: Debt;
  sched: Schedule;
  phase?: Phase;
}

export function sleepSummary(s: State, now = Date.now()): SleepSummary {
  const need = s.settings.sleepNeed || DEFAULT_NEED;
  const logs = s.sleeps ?? [];
  const debt = sleepDebt(logs, need, now);
  const sched = schedule(logs, need, debt.hours, now, s.settings.wakeGoal);
  return { need, debt, sched, phase: phaseAt(sched, now) };
}

/** "7 h 20 m", "45 m", "8 h". */
export function fmtDur(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} m`;
  return m ? `${h} h ${m} m` : `${h} h`;
}

/** "3.4 h" style, one decimal under 10. */
export const fmtDebt = (h: number) => (h < 10 ? h.toFixed(1) : Math.round(h).toString());
