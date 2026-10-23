/**
 * Pure helpers for the gate screen. Business rules stay in src/lib/derive.ts;
 * this file only shapes that output for display.
 */
import type { Tone } from '@/constants/theme';
import { EMOTIONS, emotionTone, tradingToday, type Emotion, type TradingToday } from '@/lib/derive';
import { dayKey, type Settings, type State, type Verdict } from '@/lib/store';

export const OVERRIDE_PHRASE = 'I accept the risk';

export type MeaningTone = 'jade' | 'tangerine' | 'coral';

export const EMOTION_GROUPS: { tone: MeaningTone; caption: string; aside: string; items: Emotion[] }[] = [
  { tone: 'jade', caption: 'Good to trade', aside: 'Trade your plan', items: EMOTIONS.filter((e) => e.tone === 'jade') },
  {
    tone: 'tangerine',
    caption: 'Trade smaller',
    aside: 'Half size or skip',
    items: EMOTIONS.filter((e) => e.tone === 'tangerine'),
  },
  { tone: 'coral', caption: 'Don’t trade', aside: 'Sit this one out', items: EMOTIONS.filter((e) => e.tone === 'coral') },
];

/** What each emotion group means for the next trade, in two words. */
export const GROUP_SHORT: Record<MeaningTone, string> = {
  jade: 'Full size',
  tangerine: 'Half size',
  coral: 'Don’t trade',
};

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

export type FactKind = 'trades' | 'streak' | 'loss' | 'sleep' | 'mood' | 'open';

export interface Fact {
  kind: FactKind;
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
  const trades = (text: string, tone: Fact['tone']) => out.push({ kind: 'trades', text, tone });
  if (used >= maxTrades) trades(`${used} of ${maxTrades} trades used. Done for today.`, 'coral');
  else if (used === maxTrades - 1) trades(`${used} of ${maxTrades} trades used. This would be your last.`, 'tangerine');
  else trades(`${used} of ${maxTrades} trades used.`, 'neutral');

  const n = t.lossStreak;
  const streak = `${n} ${plural(n, 'loss', 'losses')} in a row`;
  if (n >= maxLossStreak) out.push({ kind: 'streak', text: `${streak}. Done for today.`, tone: 'coral' });
  else if (maxLossStreak > 1 && n === maxLossStreak - 1)
    out.push({ kind: 'streak', text: `${streak}. One more ends your day.`, tone: 'tangerine' });
  else out.push({ kind: 'streak', text: n === 0 ? 'No losses in a row.' : `${streak}.`, tone: 'neutral' });

  if (t.minsSinceLoss !== null) {
    const m = t.minsSinceLoss;
    const when = m < 1 ? 'Last loss just now.' : `Last loss ${fmtMins(m)} ago.`;
    if (m < cooldownMin) out.push({ kind: 'loss', text: `${when} Cool down ${cooldownMin - m} more min.`, tone: 'coral' });
    else out.push({ kind: 'loss', text: when, tone: 'neutral' });
  }

  const day = s.days[dayKey(now)];
  if (day?.sleptWell === false) out.push({ kind: 'sleep', text: 'Slept badly last night.', tone: 'tangerine' });
  if (day?.mood !== undefined && day.mood <= 2) out.push({ kind: 'mood', text: 'Mood is low today.', tone: 'tangerine' });

  const open = t.open.length;
  if (open > 0)
    out.push({
      kind: 'open',
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

/* ---------- the session card on step 1 ---------- */

export interface Session {
  /** Overall state: coral = the gate will stop you, tangerine = be careful, jade = within limits. */
  tone: MeaningTone;
  pill: string;
  headline: string;
  line: string;
  /** Minutes of cool-down left after the last loss, if any. */
  cooldownLeft: number | null;
}

/** Today's trading state as one sentence and a status, most serious first. */
export function sessionSummary(t: TradingToday, s: Settings): Session {
  const { maxTrades, maxLossStreak, cooldownMin } = s;
  const used = t.taken.length;
  const left = Math.max(0, maxTrades - used);
  const cooldownLeft = t.minsSinceLoss !== null && t.minsSinceLoss < cooldownMin ? cooldownMin - t.minsSinceLoss : null;

  if (t.limitHit)
    return {
      tone: 'coral',
      pill: 'Limit hit',
      headline: 'Done for today.',
      line: 'You can still check in. The gate will say stop.',
      cooldownLeft,
    };
  if (cooldownLeft !== null)
    return {
      tone: 'coral',
      pill: 'Cooling down',
      headline: 'Cool down first.',
      line: `Last loss ${t.minsSinceLoss} min ago. Give it ${cooldownLeft} more min before the next one.`,
      cooldownLeft,
    };
  if (maxLossStreak > 1 && t.lossStreak === maxLossStreak - 1)
    return {
      tone: 'tangerine',
      pill: 'One loss left',
      headline: 'One more loss ends your day.',
      line: 'Be picky. Only take the setup you would show a mentor.',
      cooldownLeft,
    };
  if (used === maxTrades - 1)
    return {
      tone: 'tangerine',
      pill: 'Last trade',
      headline: 'Last trade of the day.',
      line: 'Make it one you would take again on a calm day.',
      cooldownLeft,
    };
  if (used === 0)
    return {
      tone: 'jade',
      pill: 'Fresh session',
      headline: `${maxTrades} ${plural(maxTrades, 'trade', 'trades')} available today.`,
      line: 'Nothing on the board yet. Start slow and let the setup come to you.',
      cooldownLeft,
    };
  return {
    tone: 'jade',
    pill: 'Within limits',
    headline: `${left} ${plural(left, 'trade', 'trades')} left today.`,
    line: t.lossStreak === 0 ? 'No losses in a row. Stay patient.' : 'Still inside your limits. Stay patient.',
    cooldownLeft,
  };
}

/** Every time you walked away from a trade, all time. */
export const walkedTotal = (s: State) => s.trades.filter((t) => !t.taken).length;
