/**
 * Pure logic: the pre-trade gate, today's trading state, streaks and stats.
 * No React here so it stays easy to test and reason about.
 */
import type { Tone } from '@/constants/theme';
import { dayKey, isToday, type DayLog, type Settings, type State, type Trade, type Verdict } from './store';

/* ---------- emotions ---------- */

export interface Emotion {
  label: string;
  tone: Tone; // jade = good to trade, tangerine = trade smaller, coral = do not trade
  hint: string;
}

export const EMOTIONS: Emotion[] = [
  { label: 'Calm', tone: 'jade', hint: 'Steady, patient' },
  { label: 'Focused', tone: 'jade', hint: 'Locked on the plan' },
  { label: 'Confident', tone: 'jade', hint: 'Trust the process' },
  { label: 'Bored', tone: 'tangerine', hint: 'Looking for action' },
  { label: 'Tired', tone: 'tangerine', hint: 'Slow, sloppy reads' },
  { label: 'Anxious', tone: 'tangerine', hint: 'Fear of losing' },
  { label: 'Frustrated', tone: 'tangerine', hint: 'Market “owes” you' },
  { label: 'Euphoric', tone: 'tangerine', hint: 'Riding a win' },
  { label: 'FOMO', tone: 'coral', hint: 'Chasing a move' },
  { label: 'Revenge', tone: 'coral', hint: 'Win it back now' },
  { label: 'Desperate', tone: 'coral', hint: 'Need this one' },
];

export const emotionTone = (label: string): Tone => EMOTIONS.find((e) => e.label === label)?.tone ?? 'neutral';

/** Emotions offered after a trade closes. */
export const AFTER_EMOTIONS = ['Proud', 'Calm', 'Relieved', 'Indifferent', 'Annoyed', 'Angry', 'Regret', 'Greedy', 'Shaken'];

/* ---------- today's trading state ---------- */

export interface TradingToday {
  taken: Trade[]; // trades actually entered today
  skipped: number; // gate said wait/stop and you walked away
  open: Trade[]; // taken but no result logged yet (any day)
  wins: number;
  losses: number;
  netR: number;
  lossStreak: number; // consecutive losses at the end of today's sequence
  minsSinceLoss: number | null;
  limitHit: string | null; // reason trading is done for today, if any
}

export function tradingToday(s: State, now = Date.now()): TradingToday {
  const todays = s.trades.filter((t) => isToday(t.ts));
  const taken = todays.filter((t) => t.taken);
  const skipped = todays.filter((t) => !t.taken).length;
  const open = s.trades.filter((t) => t.taken && !t.result);
  const closed = taken.filter((t) => t.result).sort((a, b) => (a.closedTs ?? a.ts) - (b.closedTs ?? b.ts));

  let lossStreak = 0;
  for (let i = closed.length - 1; i >= 0; i--) {
    if (closed[i].result === 'loss') lossStreak++;
    else break;
  }
  const lastLoss = closed.filter((t) => t.result === 'loss').pop();
  const minsSinceLoss = lastLoss ? Math.floor((now - (lastLoss.closedTs ?? lastLoss.ts)) / 60000) : null;

  const { maxTrades, maxLossStreak } = s.settings;
  let limitHit: string | null = null;
  if (lossStreak >= maxLossStreak) limitHit = `${lossStreak} losses in a row. Done for today.`;
  else if (taken.length >= maxTrades) limitHit = `${taken.length} of ${maxTrades} trades used. Done for today.`;

  return {
    taken,
    skipped,
    open,
    wins: closed.filter((t) => t.result === 'win').length,
    losses: closed.filter((t) => t.result === 'loss').length,
    netR: round(closed.reduce((a, t) => a + (t.r ?? 0), 0)),
    lossStreak,
    minsSinceLoss,
    limitHit,
  };
}

/* ---------- the gate ---------- */

export interface GateInput {
  emotions: string[];
  checked: boolean[]; // one per settings.rules
}

export interface GateResult {
  verdict: Verdict;
  reasons: string[]; // plain sentences, most serious first
}

export function evaluateGate(input: GateInput, s: State, now = Date.now()): GateResult {
  const stop: string[] = [];
  const wait: string[] = [];
  const t = tradingToday(s, now);
  const settings: Settings = s.settings;
  const today: DayLog | undefined = s.days[dayKey(now)];

  const red = input.emotions.filter((e) => emotionTone(e) === 'coral');
  const amber = input.emotions.filter((e) => emotionTone(e) === 'tangerine');

  if (t.limitHit) stop.push(t.limitHit);
  if (red.length) stop.push(`You feel ${list(red)}. That trade is for your ego, not your account.`);

  const missed = settings.rules.filter((_, i) => !input.checked[i]);
  if (missed.length === 1) stop.push(`Rule not met: ${missed[0]}`);
  else if (missed.length > 1) stop.push(`${missed.length} rules not met.`);

  if (t.minsSinceLoss !== null && t.minsSinceLoss < settings.cooldownMin) {
    const left = settings.cooldownMin - t.minsSinceLoss;
    stop.push(`Last loss was ${t.minsSinceLoss} min ago. Cool down ${left} more min.`);
  }

  if (amber.length) wait.push(`You feel ${list(amber)}. Trade half size or skip.`);
  if (today?.sleptWell === false) wait.push('You slept badly. Reaction time and patience are down.');
  if (today?.mood !== undefined && today.mood <= 2) wait.push('Mood is low today.');
  if (t.lossStreak === settings.maxLossStreak - 1 && settings.maxLossStreak > 1)
    wait.push('One more loss ends your day. Be picky.');
  if (t.taken.length === settings.maxTrades - 1) wait.push('This is your last trade today.');
  if (input.emotions.length === 0) wait.push('Name what you feel before you trade.');

  if (stop.length) return { verdict: 'stop', reasons: [...stop, ...wait] };
  if (wait.length) return { verdict: 'wait', reasons: wait };
  return { verdict: 'clear', reasons: ['Rules met. Head is clear. Execute the plan, then let it play.'] };
}

/* ---------- streaks ---------- */

/** A day counts when every promise was kept. Today counts only once complete. */
export function promiseStreak(s: State, now = new Date()): number {
  const ps = s.settings.promises;
  if (!ps.length) return 0;
  const kept = (k: string) => ps.every((p) => s.days[k]?.promises?.[p]);
  let streak = 0;
  const d = new Date(now);
  if (kept(dayKey(d))) streak++;
  d.setDate(d.getDate() - 1);
  while (kept(dayKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** Fraction of promises kept for each of the last n days, oldest first. */
export function lastDays(s: State, n = 7, now = new Date()): { key: string; date: Date; ratio: number }[] {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    const ps = s.settings.promises;
    const kept = ps.filter((p) => s.days[k]?.promises?.[p]).length;
    out.push({ key: k, date: d, ratio: ps.length ? kept / ps.length : 0 });
  }
  return out;
}

/* ---------- journal stats ---------- */

export interface Bucket {
  label: string;
  n: number;
  winRate: number; // 0-1
  avgR: number;
}

export interface JournalStats {
  closed: number;
  winRate: number;
  netR: number;
  avgR: number;
  followed: Bucket; // trades where you followed your rules
  broke: Bucket; // trades where you broke them
  byEmotion: Bucket[]; // by pre-trade emotion, worst avgR first
  overrides: Bucket; // trades taken through a stop
  skipped: number; // times you walked away
}

function bucket(label: string, ts: Trade[]): Bucket {
  const n = ts.length;
  return {
    label,
    n,
    winRate: n ? ts.filter((t) => t.result === 'win').length / n : 0,
    avgR: n ? round(ts.reduce((a, t) => a + (t.r ?? 0), 0) / n) : 0,
  };
}

export function journalStats(s: State): JournalStats {
  const closed = s.trades.filter((t) => t.taken && t.result);
  const all = bucket('All', closed);
  const emotions = Array.from(new Set(closed.flatMap((t) => t.emotions)));
  return {
    closed: closed.length,
    winRate: all.winRate,
    netR: round(closed.reduce((a, t) => a + (t.r ?? 0), 0)),
    avgR: all.avgR,
    followed: bucket('Followed rules', closed.filter((t) => t.followedRules === true)),
    broke: bucket('Broke rules', closed.filter((t) => t.followedRules === false)),
    byEmotion: emotions
      .map((e) => bucket(e, closed.filter((t) => t.emotions.includes(e))))
      .sort((a, b) => a.avgR - b.avgR),
    overrides: bucket('Overrode a stop', closed.filter((t) => t.overridden)),
    skipped: s.trades.filter((t) => !t.taken).length,
  };
}

/* ---------- misc ---------- */

export const round = (x: number) => Math.round(x * 100) / 100;

export const fmtR = (r: number) => `${r > 0 ? '+' : ''}${round(r)}R`;

export function list(xs: string[]) {
  const l = xs.map((x) => x.toLowerCase());
  if (l.length <= 1) return l.join('');
  return `${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}`;
}

export function timeAgo(ts: number, now = Date.now()) {
  const m = Math.floor((now - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}
