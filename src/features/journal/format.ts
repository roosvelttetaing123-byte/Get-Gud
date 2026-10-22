/**
 * Presentation helpers for the journal and the trade result modal.
 * Pure functions only: formatting, grouping and R parsing. Stats live in src/lib/derive.ts.
 */
import { C, type Tone } from '@/constants/theme';
import { round } from '@/lib/derive';
import { dayKey, type Result, type Trade, type Verdict } from '@/lib/store';

const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 24-hour local clock, e.g. "21:40". */
export function clock(ts: number) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Today", "Yesterday", or "Mon 20 Oct" (with the year when it isn't this year). */
export function dayLabel(ts: number, now = new Date()) {
  const key = dayKey(ts);
  if (key === dayKey(now)) return 'Today';
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (key === dayKey(y)) return 'Yesterday';
  const d = new Date(ts);
  const base = `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;

export const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** An emotion label as it reads mid-sentence: "frustrated", but "FOMO". */
export const inSentence = (label: string) => (label === label.toUpperCase() ? label : label.toLowerCase());

/** Colour for an R value: jade above zero, coral below, mist at zero. */
export const rColor = (r: number) => (r > 0 ? C.jade : r < 0 ? C.coral : C.mist);

export const VERDICT: Record<Verdict, { word: string; tone: Tone }> = {
  clear: { word: 'Clear', tone: 'jade' },
  wait: { word: 'Wait', tone: 'tangerine' },
  stop: { word: 'Stop', tone: 'coral' },
};

/** What happened to a trade, as a badge. */
export function outcome(t: Trade): { label: string; tone: Tone } {
  if (!t.taken) return { label: 'Walked away', tone: 'jade' };
  if (!t.result) return { label: 'Open', tone: 'tangerine' };
  if (t.result === 'win') return { label: 'Win', tone: 'jade' };
  if (t.result === 'loss') return { label: 'Loss', tone: 'coral' };
  return { label: 'Break-even', tone: 'neutral' };
}

/**
 * Parse what was typed into the R field. Accepts "2", "-1", "+1.5", "1,5", "2R", "−1".
 * Returns undefined for anything that isn't a plain number.
 */
export function parseR(text: string): number | undefined {
  const clean = text
    .replace(/[−–—]/g, '-')
    .replace(',', '.')
    .replace(/r/gi, '')
    .replace(/\s+/g, '');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(clean)) return undefined;
  const n = Number(clean);
  return Number.isFinite(n) ? n : undefined;
}

/** A loss is always negative R and a win always positive, whatever sign was typed. */
export function signR(r: number, result: Result) {
  if (result === 'loss') return -Math.abs(r);
  if (result === 'win') return Math.abs(r);
  return r;
}

export interface DayGroup {
  key: string;
  ts: number;
  trades: Trade[];
  closed: number;
  netR: number;
}

/** All trades newest first, grouped by local calendar day. */
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
