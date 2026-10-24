/**
 * Sleep edge: what tiredness costs you, from your own trades. Pure functions, no React.
 *
 * Every trade is matched to how rested you were when you hit the gate, using only the
 * sleep you had logged by then (so a Health import later fills in old trades too):
 * last night's hours, 14-night sleep debt, and where you were on your energy curve.
 *
 * Rows show plain facts (your real averages). Sentences and decisions are held to more:
 * enough trades per group, small groups pulled toward your overall average, and a gap
 * bigger than its own noise before the app says one group beats another.
 */
import { bodyClock, energyOn, keyOf, sleepSummary, type PhaseId, type Schedule } from './sleep';
import type { State, Trade } from './types';

export type RestBand = 'rested' | 'some' | 'short' | 'heavy';

export interface TradeRest {
  band?: RestBand; // undefined when there's no sleep data for that day
  debt?: number; // hours, when 3+ nights were known
  lastNight?: number; // hours, logged night or morning check-in
  phase?: PhaseId; // undefined until your body clock rests on 3+ nights
  phaseLabel?: string; // clock-aware name, e.g. "Morning peak" or "Second peak"
  energy?: number; // 0-100 on your energy curve
}

/** How rested you were at `ts`, from what you had logged by then. */
export function restAt(s: State, ts: number): TradeRest {
  const logs = (s.sleeps ?? []).filter((l) => l.wake <= ts);
  const sub: State = { ...s, sleeps: logs };
  const { debt, sched, phase } = sleepSummary(sub, ts);
  const lastNight = debt.lastNight ?? s.days[keyOf(ts)]?.checkin?.sleepHours;
  const debtKnown = debt.known >= 3;

  let band: RestBand | undefined;
  if (lastNight !== undefined && lastNight < 6) band = 'short';
  else if (debtKnown) band = debt.zone === 'high' ? 'heavy' : debt.zone === 'moderate' ? 'some' : 'rested';
  else if (lastNight !== undefined) band = 'rested';

  const need = s.settings.sleepNeed || 8;
  const clocked = bodyClock(logs, need, s.settings.wakeGoal).basis >= 3;
  return {
    band,
    debt: debtKnown ? debt.hours : undefined,
    lastNight,
    phase: clocked ? phase?.id : undefined,
    phaseLabel: clocked ? phase?.label : undefined,
    energy: clocked ? energyOn(sched, ts) : undefined,
  };
}

export interface EdgeBucket<K extends string = string> {
  id: K;
  label: string;
  n: number;
  winRate: number; // 0-1
  avgR: number;
  sdR: number; // spread of R per trade (sample standard deviation, 0 under 2 trades)
}

export const REST_LABEL: Record<RestBand, string> = {
  rested: 'Rested',
  some: 'Some sleep debt',
  short: 'Short night',
  heavy: 'Heavy sleep debt',
};
const REST_ORDER: RestBand[] = ['rested', 'some', 'short', 'heavy'];
const PHASE_ORDER: PhaseId[] = ['groggy', 'peak1', 'dip', 'peak2', 'winddown', 'melatonin', 'sleep'];

export interface SleepEdge {
  closed: number; // closed trades
  matched: number; // closed trades with a rest band
  avgR: number; // across all closed trades
  byRest: EdgeBucket<RestBand>[]; // fixed order, only bands you've traded in
  byPhase: EdgeBucket<PhaseId>[]; // order of the day
}

const r2 = (x: number) => Math.round(x * 100) / 100;

function bucket<K extends string>(id: K, label: string, ts: Trade[]): EdgeBucket<K> {
  const n = ts.length;
  const rs = ts.map((t) => t.r ?? 0);
  const mean = n ? rs.reduce((a, b) => a + b, 0) / n : 0;
  const sd = n > 1 ? Math.sqrt(rs.reduce((a, r) => a + (r - mean) ** 2, 0) / (n - 1)) : 0;
  return {
    id,
    label,
    n,
    winRate: n ? ts.filter((t) => t.result === 'win').length / n : 0,
    avgR: r2(mean),
    sdR: r2(sd),
  };
}

/** Results by how rested you were and by energy phase. Closed, taken trades only. */
export function sleepEdge(s: State): SleepEdge {
  const closed = s.trades.filter((t) => t.taken && t.result);
  const rest = new Map(closed.map((t) => [t.id, restAt(s, t.ts)]));
  const byRest = REST_ORDER.map((b) => bucket(b, REST_LABEL[b], closed.filter((t) => rest.get(t.id)?.band === b))).filter(
    (b) => b.n > 0,
  );
  const byPhase = PHASE_ORDER.map((p) => {
    const ts = closed.filter((t) => rest.get(t.id)?.phase === p);
    // Name it the way you last saw it on the Energy card.
    const newest = [...ts].sort((a, b) => b.ts - a.ts)[0];
    return bucket(p, (newest && rest.get(newest.id)?.phaseLabel) || p, ts);
  }).filter((b) => b.n > 0);
  return {
    closed: closed.length,
    matched: closed.filter((t) => rest.get(t.id)?.band).length,
    avgR: bucket('all', 'All', closed).avgR,
    byRest,
    byPhase,
  };
}

/** Trades a group needs before the app says anything about it. */
export const EDGE_MIN = 5;
/** Pull toward your overall average, worth this many trades. 5 trades of evidence = half your own, half the average. */
const SHRINK = 5;

/** A group's average pulled toward the overall one, so 5 lucky trades don't read as an edge. */
export const shrunk = (b: EdgeBucket, overall: number) => (b.n * b.avgR + SHRINK * overall) / (b.n + SHRINK);

/** True when the gap between two groups is bigger than its own noise (one standard error). */
export function clearGap(a: EdgeBucket, b: EdgeBucket): boolean {
  const se = Math.sqrt(a.sdR ** 2 / a.n + b.sdR ** 2 / b.n);
  return Math.abs(a.avgR - b.avgR) > se;
}

/** One line comparing rested trading with your worst tired band, or null if the data can't back it yet. */
export function restLine(e: SleepEdge): { rested: EdgeBucket<RestBand>; tired: EdgeBucket<RestBand> } | null {
  const rested = e.byRest.find((b) => b.id === 'rested' && b.n >= EDGE_MIN);
  const tired = e.byRest.filter((b) => b.id !== 'rested' && b.n >= EDGE_MIN).sort((a, b) => a.avgR - b.avgR)[0];
  if (!rested || !tired || rested.avgR === tired.avgR || !clearGap(rested, tired)) return null;
  return { rested, tired };
}

/**
 * When to trade today. Learned once 2+ daytime phases have 5+ trades: the better half of
 * them by shrunk average, if that's above zero. Until then, your two energy peaks.
 * Grogginess and night phases never count.
 */
export function goodPhases(e: SleepEdge): { ids: PhaseId[]; learned: boolean } {
  const never: PhaseId[] = ['groggy', 'melatonin', 'sleep'];
  const solid = e.byPhase.filter((b) => b.n >= EDGE_MIN && !never.includes(b.id));
  if (solid.length >= 2) {
    const ranked = solid.map((b) => ({ id: b.id, v: shrunk(b, e.avgR) })).sort((a, b) => b.v - a.v);
    const best = ranked.slice(0, Math.ceil(ranked.length / 2)).filter((x) => x.v > 0);
    if (best.length) return { ids: PHASE_ORDER.filter((p) => best.some((x) => x.id === p)), learned: true };
  }
  return { ids: ['peak1', 'peak2'], learned: false };
}

export interface TradeWindow {
  phase: PhaseId;
  label: string;
  start: number;
  end: number;
  open: boolean; // you're in it now
  stat?: EdgeBucket<PhaseId>;
}

/** Today's windows in good phases that haven't ended yet, the open one first. */
export function tradeWindows(sched: Schedule, e: SleepEdge, now: number): { windows: TradeWindow[]; learned: boolean } {
  const { ids, learned } = goodPhases(e);
  const windows = sched.phases
    .filter((p) => ids.includes(p.id) && p.end > now)
    .map((p) => ({
      phase: p.id,
      label: p.label,
      start: p.start,
      end: p.end,
      open: now >= p.start,
      stat: e.byPhase.find((b) => b.id === p.id),
    }));
  return { windows, learned };
}
