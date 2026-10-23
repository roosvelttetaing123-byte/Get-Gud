/**
 * Pure helpers for the gate screen. Business rules stay in src/lib/derive.ts;
 * this file only shapes that output for display.
 */
import type { Tone } from '@/constants/theme';
import { EMOTIONS, emotionTone, tradingToday, type Emotion } from '@/lib/derive';
import { dayKey, type State, type Verdict } from '@/lib/store';

export const OVERRIDE_PHRASE = 'I accept the risk';

export type MeaningTone = 'jade' | 'tangerine' | 'coral';

export const EMOTION_GROUPS: { tone: MeaningTone; caption: string; items: Emotion[] }[] = [
  { tone: 'jade', caption: 'Good to trade', items: EMOTIONS.filter((e) => e.tone === 'jade') },
  { tone: 'tangerine', caption: 'Trade smaller', items: EMOTIONS.filter((e) => e.tone === 'tangerine') },
  { tone: 'coral', caption: 'Don’t trade', items: EMOTIONS.filter((e) => e.tone === 'coral') },
];

export const VERDICT: Record<Verdict, { word: string; tone: MeaningTone }> = {
  clear: { word: 'Clear.', tone: 'jade' },
  wait: { word: 'Wait.', tone: 'tangerine' },
  stop: { word: 'Stop.', tone: 'coral' },
};

/** Toggle an emotion, keeping the selection in the canonical EMOTIONS order. */
export function toggleEmotion(selected: string[], label: string): string[] {
  const on = selected.includes(label);
  return EMOTIONS.map((e) => e.label).filter((l) => (l === label ? !on : selected.includes(l)));
}

export interface Fact {
  text: string;
  tone: Extract<Tone, 'neutral' | 'tangerine' | 'coral'>;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function fmtMins(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/**
 * Today's facts as the gate will see them. Coral = will trigger stop,
 * tangerine = will trigger wait. Each line says the consequence in words,
 * so colour is never the only signal.
 */
export function todayFacts(s: State, now: number): Fact[] {
  const t = tradingToday(s, now);
  const { maxTrades, maxLossStreak, cooldownMin } = s.settings;
  const out: Fact[] = [];

  const used = t.taken.length;
  if (used >= maxTrades) out.push({ text: `${used} of ${maxTrades} trades used. Done for today.`, tone: 'coral' });
  else if (used === maxTrades - 1)
    out.push({ text: `${used} of ${maxTrades} trades used. This would be your last.`, tone: 'tangerine' });
  else out.push({ text: `${used} of ${maxTrades} trades used.`, tone: 'neutral' });

  const n = t.lossStreak;
  const streak = `${n} ${plural(n, 'loss', 'losses')} in a row`;
  if (n >= maxLossStreak) out.push({ text: `${streak}. Done for today.`, tone: 'coral' });
  else if (maxLossStreak > 1 && n === maxLossStreak - 1)
    out.push({ text: `${streak}. One more ends your day.`, tone: 'tangerine' });
  else out.push({ text: n === 0 ? 'No losses in a row.' : `${streak}.`, tone: 'neutral' });

  if (t.minsSinceLoss !== null) {
    const m = t.minsSinceLoss;
    const when = m < 1 ? 'Last loss just now.' : `Last loss ${fmtMins(m)} ago.`;
    if (m < cooldownMin) out.push({ text: `${when} Cool down ${cooldownMin - m} more min.`, tone: 'coral' });
    else out.push({ text: when, tone: 'neutral' });
  }

  const day = s.days[dayKey(now)];
  if (day?.sleptWell === false) out.push({ text: 'Slept badly last night.', tone: 'tangerine' });
  if (day?.mood !== undefined && day.mood <= 2) out.push({ text: 'Mood is low today.', tone: 'tangerine' });

  const open = t.open.length;
  if (open > 0)
    out.push({
      text: `${open} ${plural(open, 'trade has', 'trades have')} no result yet. Log ${plural(open, 'it', 'them')} so the gate can see ${plural(open, 'it', 'them')}.`,
      tone: 'neutral',
    });

  return out;
}

/**
 * True when a stop is driven by loss or by a do-not-trade emotion, i.e. the
 * revenge-trade pattern. Mirrors the loss-related conditions in evaluateGate.
 */
export function isLossDriven(emotions: string[], s: State, now: number): boolean {
  const t = tradingToday(s, now);
  const { maxLossStreak, cooldownMin } = s.settings;
  const coral = emotions.some((e) => emotionTone(e) === 'coral');
  const streak = t.lossStreak > 0 && (t.lossStreak >= maxLossStreak || t.lossStreak === maxLossStreak - 1);
  const cooling = t.minsSinceLoss !== null && t.minsSinceLoss < cooldownMin;
  return coral || streak || cooling;
}
