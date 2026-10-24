/**
 * Pure helpers for the gate screen. Business rules live in src/lib/derive.ts
 * (evaluateGate); this file only shapes data for display.
 */
import { C, SYS, VALENCE } from '@/constants/theme';
import { EMOTIONS, emotionTone, type TradingToday } from '@/lib/derive';
import { dayKey, type Settings, type State, type Trade } from '@/lib/store';

export const OVERRIDE_PHRASE = 'I accept the risk';

/** What the trader picks from on "Name it", in display order. */
export const FEELINGS = EMOTIONS.filter((e) => !e.retired).map((e) => e.label);

/** "What's it about?" */
export const ASSOCIATIONS = [
  'After a loss',
  'After a win',
  'News',
  'Tired',
  'Bored',
  'Personal life',
  'Money pressure',
];

export type Meaning = 'good' | 'smaller' | 'stop';

export const meaningOf = (label: string): Meaning => {
  const t = emotionTone(label);
  return t === 'coral' ? 'stop' : t === 'tangerine' ? 'smaller' : 'good';
};

export const MEANING: Record<Meaning, { color: string; label: string }> = {
  good: { color: SYS.green, label: 'Good to trade' },
  smaller: { color: SYS.orange, label: 'Trade smaller' },
  stop: { color: SYS.red, label: 'Don’t trade' },
};

/** The most serious meaning among the picked feelings. */
export function worstMeaning(picked: string[]): Meaning | null {
  if (!picked.length) return null;
  const ms = picked.map(meaningOf);
  return ms.includes('stop') ? 'stop' : ms.includes('smaller') ? 'smaller' : 'good';
}

/** Toggle, keeping the canonical order of `all`. */
export function toggleIn(all: string[], selected: string[], label: string): string[] {
  const on = selected.includes(label);
  return all.filter((l) => (l === label ? !on : selected.includes(l)));
}

/* ---------- suggestions ---------- */

const BY_VALENCE: Record<number, string[]> = {
  1: ['Frustrated', 'Revenge', 'Anxious'],
  2: ['Frustrated', 'Anxious'],
  3: ['Anxious', 'Tired', 'Impatient'],
  4: ['Calm', 'Bored'],
  5: ['Calm', 'Focused'],
  6: ['Confident', 'Focused'],
  7: ['Euphoric', 'Confident'],
};

const closedAt = (t: Trade) => t.closedTs ?? t.ts;

function lastClosed(s: State): Trade | undefined {
  let best: Trade | undefined;
  for (const t of s.trades) if (t.taken && t.result && (!best || closedAt(t) > closedAt(best))) best = t;
  return best;
}

/** Outlined (not selected) hints: feelings from the valence, associations from recent trades. */
export function suggestions(valence: number, s: State, now: number): { feelings: string[]; about: string[] } {
  const about: string[] = [];
  const last = lastClosed(s);
  if (last && now - closedAt(last) < 2 * 3600_000) {
    if (last.result === 'loss') about.push('After a loss');
    if (last.result === 'win') about.push('After a win');
  }
  return { feelings: BY_VALENCE[valence] ?? [], about };
}

/** This morning's check-in valence, if he checked in today. */
export const morningValence = (s: State, now: number): number | undefined => s.days[dayKey(now)]?.checkin?.valence;

/* ---------- valence colour ---------- */

export type RGB = [number, number, number];

const hexRgb = (hex: string): RGB => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const STOPS = VALENCE.map((v) => hexRgb(v.color));

/** Colour at a fractional position on the 1..7 scale, so tints glide between moods. */
export function valenceRgb(pos: number): RGB {
  const x = Math.max(0, Math.min(6, pos - 1));
  const i = Math.min(5, Math.floor(x));
  const t = x - i;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  return [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * t)) as RGB;
}

export const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

export const valenceLabel = (v: number) => VALENCE[Math.max(1, Math.min(7, Math.round(v))) - 1].label;

/* ---------- today's session badges ---------- */

export interface SessionBadge {
  key: string;
  label: string;
  color: string;
  solid?: boolean;
}

/** Compact facts for the top of step 1: trades used, loss streak, cool-down, limit. */
export function sessionBadges(t: TradingToday, s: Settings, coolLeftMin: number | null): SessionBadge[] {
  const out: SessionBadge[] = [];
  if (t.limitHit) out.push({ key: 'limit', label: 'Limit hit', color: SYS.red, solid: true });
  const used = t.taken.length;
  out.push({
    key: 'trades',
    label: `${used}/${s.maxTrades} trades`,
    color: used >= s.maxTrades ? SYS.red : used === s.maxTrades - 1 ? SYS.orange : C.label,
  });
  const n = t.lossStreak;
  out.push({
    key: 'streak',
    label: n === 0 ? 'No losses in a row' : `${n} ${n === 1 ? 'loss' : 'losses'} in a row`,
    color: n >= s.maxLossStreak ? SYS.red : s.maxLossStreak > 1 && n === s.maxLossStreak - 1 ? SYS.orange : C.label,
  });
  if (coolLeftMin !== null) out.push({ key: 'cool', label: `Cool-down ${coolLeftMin} min`, color: SYS.orange });
  return out;
}

/** Minutes left on the cool-down after the last loss, or null. */
export function coolLeft(s: State, now: number): number | null {
  let lastLoss: Trade | undefined;
  for (const t of s.trades)
    if (t.taken && t.result === 'loss' && (!lastLoss || closedAt(t) > closedAt(lastLoss))) lastLoss = t;
  if (!lastLoss) return null;
  const end = closedAt(lastLoss) + s.settings.cooldownMin * 60000;
  return end > now ? Math.max(1, Math.ceil((end - now) / 60000)) : null;
}

/** Every time you walked away from a trade, all time. */
export const walkedTotal = (s: State) => s.trades.filter((t) => !t.taken).length;

/** 14:32 */
export function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
