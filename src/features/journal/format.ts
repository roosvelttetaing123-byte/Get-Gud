/**
 * Presentation helpers for the journal and the trade result modal.
 * Pure functions only: formatting, grouping and R maths. Stats live in src/lib/derive.ts.
 */
import { C } from '@/constants/theme';
import { round } from '@/lib/derive';
import { dayKey, type Result, type Trade } from '@/lib/store';

const pad = (n: number) => String(n).padStart(2, '0');
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 24-hour local clock, e.g. "21:40". */
export function clock(ts: number) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Today", "Yesterday", or "Mon 20 Oct" (with the year when it isn't this year). */
export function dayLabel(ts: number, now: number) {
  const key = dayKey(ts);
  if (key === dayKey(now)) return 'Today';
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (key === dayKey(y)) return 'Yesterday';
  const d = new Date(ts);
  const base = `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === new Date(now).getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;

export const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "once", "twice", "3 times". */
export const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

/** R with a real minus sign, e.g. "+2.5R", "−1R", "0R". */
export function fmtRx(r: number) {
  const v = round(r);
  if (v === 0) return '0R';
  return `${v > 0 ? '+' : '−'}${Math.abs(v)}R`;
}

/** Colour for an R value: green above zero, red below, secondary label at zero. */
export const rColor = (r: number) => (r > 0 ? C.green : r < 0 ? C.red : C.label2);

/** A loss is always negative R and a win always positive, whatever sign was entered. */
export function signR(r: number, result: Result) {
  if (result === 'loss') return -Math.abs(r);
  if (result === 'win') return Math.abs(r);
  return r;
}

const closedInOrder = (trades: Trade[]) =>
  trades.filter((t) => t.taken && t.result).sort((a, b) => (a.closedTs ?? a.ts) - (b.closedTs ?? b.ts));

/** Cumulative R after each closed trade, in the order they closed, starting from 0. */
export function equityCurve(trades: Trade[]): number[] {
  const out = [0];
  for (const t of closedInOrder(trades)) out.push(round(out[out.length - 1] + (t.r ?? 0)));
  return out;
}

export interface DayGroup {
  key: string;
  ts: number;
  trades: Trade[];
  closed: number;
  netR: number;
}

/** Trades newest first, grouped by local calendar day. */
export function groupByDay(trades: Trade[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const t of [...trades].sort((a, b) => b.ts - a.ts)) {
    const key = dayKey(t.ts);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = { key, ts: t.ts, trades: [], closed: 0, netR: 0 };
      groups.push(g);
    }
    g.trades.push(t);
    if (t.taken && t.result) {
      g.closed++;
      g.netR = round(g.netR + (t.r ?? 0));
    }
  }
  return groups;
}

/* ---------- R stepper maths (trade result) ---------- */

export const R_STEP = 0.25;
const R_MAX = 20;
const BE_MAX = 0.75;

const clampR = (r: number, lo: number, hi: number) => round(Math.min(hi, Math.max(lo, r)));

/**
 * Step the R value by ±0.25 along the number line. The sign follows the result:
 * a win stays at +0.25 or more, a loss at −0.25 or less, a break-even near zero.
 * With no result yet, the new sign picks one.
 */
export function stepR(r: number, dir: 1 | -1, result: Result | undefined): { r: number; result: Result | undefined } {
  const next = round(r + dir * R_STEP);
  if (result === 'win') return { r: clampR(next, R_STEP, R_MAX), result };
  if (result === 'loss') return { r: clampR(next, -R_MAX, -R_STEP), result };
  if (result === 'be') return { r: clampR(next, -BE_MAX, BE_MAX), result };
  const v = clampR(next, -R_MAX, R_MAX);
  return { r: v, result: v > 0 ? 'win' : v < 0 ? 'loss' : undefined };
}

/** Picking a result flips the sign of what's there, or seeds ±1R. Break-even resets to 0. */
export function rForResult(r: number, result: Result): number {
  if (result === 'be') return 0;
  const mag = Math.abs(r) || 1;
  return signR(mag, result);
}

/** Whether the − / + buttons can move from here. */
export function canStep(r: number, dir: 1 | -1, result: Result | undefined) {
  return stepR(r, dir, result).r !== r;
}
