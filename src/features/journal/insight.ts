/**
 * Journal insight: the one Highlight sentence, and the per-day R series for the chart.
 * Pure functions; the screen passes `now` in.
 */
import {
  ChartColumn,
  DoorOpen,
  OctagonX,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react-native';

import { C } from '@/constants/theme';
import { round, type Bucket, type JournalStats } from '@/lib/derive';
import { dayKey, type Trade } from '@/lib/store';

import { count, fmtRx, MONTHS, pct, rColor, times, WEEKDAYS, WEEKDAYS_LONG } from './format';
import { feelingLook } from './look';

/* ---------- highlight ---------- */

/** A run of sentence text; `color` marks an emphasised word (a feeling, a number). */
export type Span = { text: string; color?: string };

export interface Highlight {
  icon: LucideIcon;
  color: string;
  category: string;
  sentence: Span[];
  value: string;
  valueColor: string;
  unit: string;
}

/** Closed trades needed before patterns are worth showing. */
export const WARMUP = 3;

const name = (label: string): Span => ({ text: label, color: feelingLook(label).color });
const num = (text: string, color: string): Span => ({ text, color });

/** Feelings to compare: prefer ones seen at least twice, so one lucky trade doesn't lead. */
function feelingPair(byEmotion: Bucket[]): { worst: Bucket; best: Bucket } | null {
  const solid = byEmotion.filter((b) => b.n >= 2);
  const pool = solid.length >= 2 ? solid : byEmotion;
  if (pool.length < 2) return null;
  const worst = pool[0];
  const best = pool[pool.length - 1];
  if (worst.avgR >= best.avgR && worst.winRate >= best.winRate) return null;
  return { worst, best };
}

/**
 * The most useful thing to say, in this order: worst vs best feeling, rules followed vs
 * broken, overrides, then walk-aways. Returns null while there are too few closed trades.
 */
export function pickHighlight(st: JournalStats): Highlight | null {
  if (st.closed < WARMUP) return null;

  const pair = feelingPair(st.byEmotion);
  if (pair) {
    const { worst, best } = pair;
    const look = feelingLook(worst.label);
    if (best.winRate - worst.winRate >= 0.1) {
      return {
        icon: look.icon,
        color: look.color,
        category: 'Feelings',
        sentence: [
          { text: 'When you traded ' },
          name(worst.label),
          { text: ', your win rate was ' },
          num(pct(worst.winRate), C.red),
          { text: ' vs ' },
          num(pct(best.winRate), C.green),
          { text: ' when ' },
          name(best.label),
          { text: '.' },
        ],
        value: pct(worst.winRate),
        valueColor: C.red,
        unit: `win rate · ${worst.label}`,
      };
    }
    return {
      icon: look.icon,
      color: look.color,
      category: 'Feelings',
      sentence: [
        { text: 'When you traded ' },
        name(worst.label),
        { text: ', you averaged ' },
        num(fmtRx(worst.avgR), rColor(worst.avgR)),
        { text: ' vs ' },
        num(fmtRx(best.avgR), rColor(best.avgR)),
        { text: ' when ' },
        name(best.label),
        { text: '.' },
      ],
      value: fmtRx(worst.avgR),
      valueColor: rColor(worst.avgR),
      unit: `per trade · ${worst.label}`,
    };
  }

  const { followed, broke } = st;
  if (followed.n && broke.n && (followed.winRate !== broke.winRate || followed.avgR !== broke.avgR)) {
    if (followed.winRate !== broke.winRate) {
      return {
        icon: ShieldCheck,
        color: C.green,
        category: 'Rules',
        sentence: [
          { text: 'When you followed your rules, your win rate was ' },
          num(pct(followed.winRate), C.green),
          { text: ' vs ' },
          num(pct(broke.winRate), C.red),
          { text: ' when you broke them.' },
        ],
        value: pct(followed.winRate),
        valueColor: C.green,
        unit: 'win rate by the rules',
      };
    }
    return {
      icon: ShieldCheck,
      color: C.green,
      category: 'Rules',
      sentence: [
        { text: 'By the rules you averaged ' },
        num(fmtRx(followed.avgR), rColor(followed.avgR)),
        { text: ' a trade vs ' },
        num(fmtRx(broke.avgR), rColor(broke.avgR)),
        { text: ' when you broke them.' },
      ],
      value: fmtRx(followed.avgR),
      valueColor: rColor(followed.avgR),
      unit: 'per trade by the rules',
    };
  }

  if (st.overrides.n) {
    const o = st.overrides;
    return {
      icon: OctagonX,
      color: C.red,
      category: 'Overrides',
      sentence: [
        { text: `You overrode a stop ${times(o.n)}. Those trades won ` },
        num(pct(o.winRate), rColor(o.winRate - 0.5)),
        { text: ' and averaged ' },
        num(fmtRx(o.avgR), rColor(o.avgR)),
        { text: '.' },
      ],
      value: fmtRx(o.avgR),
      valueColor: rColor(o.avgR),
      unit: 'per override',
    };
  }

  if (st.skipped) {
    return {
      icon: DoorOpen,
      color: C.mint,
      category: 'Walked away',
      sentence: [
        { text: 'You walked away ' },
        num(times(st.skipped), C.mint),
        { text: '. Every one was a rule kept.' },
      ],
      value: String(st.skipped),
      valueColor: C.mint,
      unit: st.skipped === 1 ? 'time' : 'times',
    };
  }

  return {
    icon: ChartColumn,
    color: C.tint,
    category: 'Trading',
    sentence: [
      { text: `Across ${count(st.closed, 'trade')} your win rate is ` },
      num(pct(st.winRate), C.label),
      { text: ', averaging ' },
      num(fmtRx(st.avgR), rColor(st.avgR)),
      { text: '.' },
    ],
    value: pct(st.winRate),
    valueColor: C.tint,
    unit: 'win rate',
  };
}

/* ---------- chart series ---------- */

/** Rolling windows ending today, like Health: never empty just because it's Monday. */
export type Range = '7d' | '30d';

export interface DayBar {
  key: string;
  /** Under the bar: weekday letter (7 days) or a date on weekly ticks (30 days). */
  tick: string;
  /** For the header while you read a day: "Today", "Fri 23 Oct". */
  title: string;
  /** "Friday 23 October" */
  spoken: string;
  netR: number;
  closed: number;
  wins: number;
  /** Times you walked away that day. */
  skipped: number;
  isToday: boolean;
}

export interface Series {
  bars: DayBar[];
  netR: number;
  closed: number;
  winRate: number;
  title: string;
}

/** The last 7 or 30 days ending today. Trades count on the day they were entered. */
export function chartSeries(trades: Trade[], range: Range, now: number): Series {
  const today = new Date(now);
  const todayKey = dayKey(today);
  const n = range === '7d' ? 7 : 30;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (n - 1), 12);

  const byDay = new Map<string, { r: number; closed: number; wins: number; skipped: number }>();
  for (const t of trades) {
    if (t.taken && !t.result) continue;
    const k = dayKey(t.ts);
    const d = byDay.get(k) ?? { r: 0, closed: 0, wins: 0, skipped: 0 };
    if (!t.taken) d.skipped++;
    else {
      d.r += t.r ?? 0;
      d.closed++;
      if (t.result === 'win') d.wins++;
    }
    byDay.set(k, d);
  }

  const bars: DayBar[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const k = dayKey(d);
    const v = byDay.get(k);
    // 30-day ticks fall weekly, counted back from today so today always has one.
    const tick = range === '7d' ? WEEKDAYS[d.getDay()][0] : (n - 1 - i) % 7 === 0 ? String(d.getDate()) : '';
    const isToday = k === todayKey;
    bars.push({
      key: k,
      tick,
      title: isToday ? 'Today' : `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`,
      spoken: `${WEEKDAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`,
      netR: round(v?.r ?? 0),
      closed: v?.closed ?? 0,
      wins: v?.wins ?? 0,
      skipped: v?.skipped ?? 0,
      isToday,
    });
  }

  const closed = bars.reduce((a, b) => a + b.closed, 0);
  const wins = bars.reduce((a, b) => a + b.wins, 0);
  return {
    bars,
    netR: round(bars.reduce((a, b) => a + b.netR, 0)),
    closed,
    winRate: closed ? wins / closed : 0,
    title: range === '7d' ? 'Last 7 days' : 'Last 30 days',
  };
}

/** The line under the big number: for the whole range, or for the day you're reading. */
export function barLine(b: Pick<DayBar, 'closed' | 'wins' | 'skipped'>): string {
  const walked = b.skipped ? `walked away ${times(b.skipped)}` : '';
  if (!b.closed) return walked ? `No trades · ${walked}` : 'No trades';
  const base = `${pct(b.wins / b.closed)} win rate · ${count(b.closed, 'trade')}`;
  return walked ? `${base} · ${walked}` : base;
}
