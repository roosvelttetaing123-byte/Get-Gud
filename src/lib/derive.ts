/**
 * Pure logic: the pre-trade gate, today's trading state, streaks and stats.
 * No React here so it stays easy to test and reason about.
 */
import type { Tone } from '@/constants/theme';
import { dayKey, isToday, type DayLog, type Settings, type State, type Trade, type Verdict } from './store';
import { sleepSummary } from './sleep';

/* ---------- emotions ---------- */

export interface Emotion {
  label: string;
  tone: Tone; // jade = good to trade, tangerine = trade smaller, coral = do not trade
  hint: string;
  /** Kept so old entries still read correctly; no longer offered in the gate. */
  retired?: boolean;
}

/** Gate feelings in display order: good, then smaller, then the hot ones. */
export const EMOTIONS: Emotion[] = [
  { label: 'Calm', tone: 'jade', hint: 'Steady, unhurried' },
  { label: 'Focused', tone: 'jade', hint: 'Locked on the plan' },
  { label: 'Confident', tone: 'jade', hint: 'Trust the process' },
  { label: 'Patient', tone: 'jade', hint: 'Happy to wait for it' },
  { label: 'Bored', tone: 'tangerine', hint: 'Looking for action' },
  { label: 'Impatient', tone: 'tangerine', hint: 'Want it to happen now' },
  { label: 'Tired', tone: 'tangerine', hint: 'Slow, sloppy reads' },
  { label: 'Anxious', tone: 'tangerine', hint: 'Fear of losing' },
  { label: 'FOMO', tone: 'coral', hint: 'Chasing a move' },
  { label: 'Frustrated', tone: 'tangerine', hint: 'Market owes you' },
  { label: 'Revenge', tone: 'coral', hint: 'Win it back now' },
  { label: 'Euphoric', tone: 'tangerine', hint: 'Riding a win' },
  { label: 'Desperate', tone: 'coral', hint: 'Need this one', retired: true },
];

/**
 * Feelings that turn into revenge or oversizing right after a trade closes
 * (loss: revenge; win: overconfidence). Inside the cool-down they mean Stop.
 */
export const HOT_AFTER_TRADE = ['Revenge', 'Frustrated', 'Euphoric'];

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
  valence?: number; // 1-7 State of Mind, from the gate's first step
  associations?: string[]; // what the feeling is about
}

/** Why a reason fired. Parallel to GateResult.reasons, so the UI can pick an icon. */
export type GateCause =
  | 'limit' // daily trade or loss limit hit
  | 'hot' // revenge / euphoric feeling inside the cool-down after a trade
  | 'red' // a do-not-trade feeling
  | 'rules' // an unticked rule
  | 'cooldown' // cool-down after a loss is still running
  | 'amber' // a trade-smaller feeling
  | 'mood' // low valence
  | 'sleep' // short sleep
  | 'streak' // one loss from the daily limit
  | 'last' // last trade of the day
  | 'unnamed' // no feeling named
  | 'clear';

export interface GateResult {
  verdict: Verdict;
  reasons: string[]; // plain short sentences, most serious first
  causes: GateCause[]; // one per reason
  /** When a cool-down after a loss is running: the time (ms) it ends. */
  waitUntil?: number;
  /** The revenge / loss pattern: a walk-away goes to the urge timer. */
  lossDriven: boolean;
}

const closedAt = (t: Trade) => t.closedTs ?? t.ts;

/** The most recently closed trade you actually took, optionally only losses. */
function lastClosed(s: State, result?: Trade['result']): Trade | undefined {
  let best: Trade | undefined;
  for (const t of s.trades) {
    if (!t.taken || !t.result || (result && t.result !== result)) continue;
    if (!best || closedAt(t) > closedAt(best)) best = t;
  }
  return best;
}

/** "fomo" reads wrong; keep acronyms in caps when a feeling sits mid-sentence. */
function feelings(xs: string[]) {
  const l = xs.map((x) => (x === x.toUpperCase() ? x : x.toLowerCase()));
  if (l.length <= 1) return l.join('');
  return `${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}`;
}

const minsAgo = (ms: number) => Math.max(0, Math.floor(ms / 60000));

export function evaluateGate(input: GateInput, s: State, now = Date.now()): GateResult {
  const stop: [GateCause, string][] = [];
  const wait: [GateCause, string][] = [];
  const t = tradingToday(s, now);
  const settings: Settings = s.settings;
  const today: DayLog | undefined = s.days[dayKey(now)];
  const cool = Math.max(0, settings.cooldownMin) * 60000;
  const felt = input.emotions;

  // 1. Daily limits end the day.
  if (t.limitHit) stop.push(['limit', t.limitHit]);

  // 2. Revenge window: a hot feeling while the last trade (win or loss) is still fresh.
  const last = lastClosed(s);
  const sinceLast = last ? now - closedAt(last) : Infinity;
  const hot = last && sinceLast < cool ? felt.filter((e) => HOT_AFTER_TRADE.includes(e)) : [];
  if (last && hot.length) {
    const m = minsAgo(sinceLast);
    const when = m < 1 ? 'right after' : `${m} min after`;
    const what = last.result === 'loss' ? 'a loss' : last.result === 'win' ? 'a win' : 'a trade';
    const why =
      last.result === 'win' && !hot.includes('Revenge') ? 'That’s when size creeps up.' : 'That’s how revenge trades start.';
    stop.push(['hot', `You feel ${feelings(hot)} ${when} ${what}. ${why}`]);
  }

  // 3. Do-not-trade feelings.
  const red = felt.filter((e) => emotionTone(e) === 'coral' && !hot.includes(e));
  if (red.length) stop.push(['red', `You feel ${feelings(red)}. Don’t trade on it.`]);

  // 4. Every rule, honestly.
  const missed = settings.rules.filter((_, i) => !input.checked[i]);
  if (missed.length === 1) stop.push(['rules', `Rule not met: ${missed[0]}`]);
  else if (missed.length > 1) stop.push(['rules', `${missed.length} rules not met.`]);

  // 5. Cool-down after a loss: wait it out (not a stop on its own).
  let waitUntil: number | undefined;
  const lastLoss = lastClosed(s, 'loss');
  if (lastLoss && closedAt(lastLoss) + cool > now) {
    waitUntil = closedAt(lastLoss) + cool;
    const m = minsAgo(now - closedAt(lastLoss));
    const left = Math.max(1, Math.ceil((waitUntil - now) / 60000));
    wait.push(['cooldown', `Last loss ${m < 1 ? 'just now' : `${m} min ago`}. Cool down ${left} more min.`]);
  }

  // 6. Trade-smaller feelings.
  const amber = felt.filter((e) => emotionTone(e) === 'tangerine' && !hot.includes(e));
  if (amber.length) wait.push(['amber', `You feel ${feelings(amber)}. Half size or skip.`]);

  // 7. Low mood.
  if (input.valence !== undefined && input.valence <= 2)
    wait.push(['mood', `You feel ${input.valence <= 1 ? 'very unpleasant' : 'unpleasant'}. Patience goes first.`]);
  else if (input.valence === undefined && today?.mood !== undefined && today.mood <= 2)
    wait.push(['mood', 'Mood is low today.']);

  // 8. Short sleep: logged night first, then the morning check-in, then the older yes/no field.
  //    Heavy sleep debt also waits, even after one good night.
  const { debt, phase } = sleepSummary(s, now);
  const sleep = debt.lastNight ?? today?.checkin?.sleepHours;
  if (sleep !== undefined && sleep < 6) wait.push(['sleep', `Only ${round(sleep)} h of sleep. Reactions are slower.`]);
  else if (debt.known >= 3 && debt.hours >= 10)
    wait.push(['sleep', `Sleep debt is ${Math.round(debt.hours)} h. Your edge is the first thing to go.`]);
  else if (sleep === undefined && today?.sleptWell === false) wait.push(['sleep', 'You slept badly. Reactions are slower.']);
  else if (phase?.id === 'melatonin' || phase?.id === 'sleep')
    wait.push(['sleep', 'Your body clock says sleep. Late trades are tired trades.']);

  // 9. Close to the daily limits.
  if (!t.limitHit && settings.maxLossStreak > 1 && t.lossStreak === settings.maxLossStreak - 1)
    wait.push(['streak', 'One more loss ends your day.']);
  if (!t.limitHit && t.taken.length === settings.maxTrades - 1) wait.push(['last', 'This is your last trade today.']);
  if (felt.length === 0) wait.push(['unnamed', 'Name what you feel first.']);

  const lossDriven =
    felt.includes('Revenge') ||
    (hot.length > 0 && last?.result === 'loss') ||
    waitUntil !== undefined ||
    (!!t.limitHit && t.lossStreak >= settings.maxLossStreak) ||
    (input.associations ?? []).includes('After a loss');

  const pack = (verdict: Verdict, rs: [GateCause, string][]): GateResult => ({
    verdict,
    reasons: rs.map((r) => r[1]),
    causes: rs.map((r) => r[0]),
    ...(waitUntil !== undefined ? { waitUntil } : null),
    lossDriven,
  });

  if (stop.length) return pack('stop', [...stop, ...wait]);
  if (wait.length) return pack('wait', wait);
  return pack('clear', [
    ['clear', 'Rules met. Head is clear.'],
    ['clear', 'Execute the plan, then let it play.'],
  ]);
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
