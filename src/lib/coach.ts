/**
 * Coach: what Get Gud has learned about you, and one thing worth knowing today.
 * Pure functions, no React, so it runs in the engine tests.
 *
 * Two jobs:
 * 1. A rough-night plan. After a short night, a drained morning or heavy sleep debt, the day
 *    gets simpler, not scarier: three small moves (trade smaller, a nap or caffeine cut-off,
 *    tonight's bedtime), built from your own energy curve and results. Never red, never blame.
 * 2. Learned patterns. Each insight is about you, from your own data, and held to the same
 *    bar as the sleep edge: enough samples per group, small groups pulled toward your
 *    average, and a gap bigger than its own noise before anything is claimed.
 *
 * Today shows ONE card: the rough-night plan when it applies, otherwise the most relevant
 * insight for this time of day (rotating day to day), otherwise a "still learning" note.
 */
import { clockLabel, fmtDur, habits, keyOf, sleepDebt, sleepSummary, type Phase } from './sleep';
import { EDGE_MIN, clearGap, restLine, shrunk, sleepEdge, type EdgeBucket } from './sleepEdge';
import { learnNeed, needSuggestion } from './sleepNeed';
import type { State, Trade } from './types';

export type CoachIcon =
  | 'moon'
  | 'battery'
  | 'coffee'
  | 'bed'
  | 'shield'
  | 'sun'
  | 'wind'
  | 'heart'
  | 'trend'
  | 'check'
  | 'calendar'
  | 'door'
  | 'sparkles';

export type CoachArea = 'sleep' | 'trading' | 'mood' | 'urges' | 'habits';
export type CoachRoute = '/gate' | '/urge' | '/sleep' | '/journal' | '/settings';

export interface CoachTip {
  icon: CoachIcon;
  text: string;
}

export interface RoughPlan {
  kind: 'rough';
  title: string;
  lead: string;
  because: string; // the fact that triggered it, e.g. "Last night: 4 h 50 m"
  tips: CoachTip[]; // at most 3
}

export interface Insight {
  kind: 'insight';
  id: string;
  area: CoachArea;
  icon: CoachIcon;
  title: string;
  body: string;
  evidence: string; // "From 31 trades"
  score: number; // how strong / useful, before time-of-day relevance
  route?: CoachRoute;
}

export interface Learning {
  kind: 'learning';
  body: string;
  progress: number; // 0..1 toward the first insight
}

export interface Coach {
  card: RoughPlan | Insight | Learning | null;
  learned: Insight[]; // strongest first
}

const H = 3_600_000;
const DAY = 24 * H;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const r2 = (x: number) => Math.round(x * 100) / 100;
/** "+0.66R" / "−0.65R" with a true minus sign. */
export const fmtR = (r: number) => `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r2(r))}R`;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/* ---------------------------------------------------------------------------
 * Rough-night plan
 * ------------------------------------------------------------------------- */

/** Hours that count as a short night: under 6, or 2+ hours under your need. */
const isShort = (hours: number, need: number) => hours < 6 || hours <= need - 2;

export function roughPlan(s: State, now = Date.now()): RoughPlan | null {
  const key = keyOf(now);
  const day = s.days[key];
  if (day?.close) return null; // the day is closed; tonight's bedtime lives on the Sleep tab
  const sum = sleepSummary(s, now);
  const need = sum.need;
  const last = sum.debt.lastNight ?? day?.checkin?.sleepHours;
  const short = last !== undefined && isShort(last, need);
  const drained = day?.checkin?.energy !== undefined && day.checkin.energy <= 2;
  const heavy = sum.debt.known >= 3 && sum.debt.zone === 'high';
  if (!short && !drained && !heavy) return null;

  const title = short ? 'Rough night. Easy plan.' : heavy ? 'Running on low. Easy plan.' : 'Low battery. Easy plan.';
  const lead = short
    ? 'One short night is very manageable. Keep today simple and it won’t cost you much.'
    : heavy
      ? 'Your sleep debt is high, not a crisis. A couple of solid nights pays most of it back.'
      : 'Low-energy days happen. Do less, do it well, and protect tonight.';
  const because =
    short && last !== undefined
      ? `Last night: ${fmtDur(last)}`
      : heavy
        ? `Sleep debt: ${Math.round(sum.debt.hours)} h`
        : 'You rated your energy low this morning';

  const tips: CoachTip[] = [];

  // 1. Trading: smaller and stricter, with your own number when the data backs it.
  const restDay = (s.settings.restDays ?? []).includes(new Date(now).getDay());
  if (!restDay) {
    const line = restLine(sleepEdge(s));
    tips.push({
      icon: 'shield',
      text: line
        ? `Tired, you average ${fmtR(line.tired.avgR)} a trade. Half size, A+ setups only.`
        : 'Half size, A+ setups only. Stop after one loss.',
    });
  }

  // 2. Energy: a nap early in the dip, else a caffeine cut-off, else daylight.
  const phases: Phase[] = sum.sched.phases;
  const dip = phases.find((p) => p.id === 'dip');
  const caffeine = habits(sum.sched).find((h) => h.id === 'caffeine');
  if (dip && now < dip.start + 90 * 60_000) {
    tips.push({
      icon: 'moon',
      text:
        now < dip.start
          ? `A 20 min nap around ${clockLabel(dip.start)} lifts the afternoon. Set an alarm.`
          : 'A 20 min nap now lifts the rest of the day. Set an alarm.',
    });
  } else if (caffeine && now < caffeine.at) {
    tips.push({ icon: 'coffee', text: `Coffee is fine. Last one by ${clockLabel(caffeine.at)}, so tonight still works.` });
  } else {
    tips.push({ icon: 'sun', text: 'Easy tasks only from here. Big decisions can wait for tomorrow.' });
  }

  // 3. Tonight: the actual fix.
  tips.push({ icon: 'bed', text: `In bed by ${clockLabel(sum.sched.bedtimeForNeed)} tonight. That’s the real fix.` });

  return { kind: 'rough', title, lead, because, tips: tips.slice(0, 3) };
}

/* ---------------------------------------------------------------------------
 * Learned patterns
 * ------------------------------------------------------------------------- */

function bucket(id: string, ts: Trade[]): EdgeBucket {
  const n = ts.length;
  const rs = ts.map((t) => t.r ?? 0);
  const mean = n ? rs.reduce((a, b) => a + b, 0) / n : 0;
  const sd = n > 1 ? Math.sqrt(rs.reduce((a, r) => a + (r - mean) ** 2, 0) / (n - 1)) : 0;
  return { id, label: id, n, winRate: n ? ts.filter((t) => t.result === 'win').length / n : 0, avgR: r2(mean), sdR: r2(sd) };
}

const closedTrades = (s: State) => s.trades.filter((t) => t.taken && t.result);

/** Sleep moves your results (from the sleep edge, which already holds itself to the bar). */
function sleepTrading(s: State): Insight | null {
  const line = restLine(sleepEdge(s));
  if (!line) return null;
  const gap = line.rested.avgR - line.tired.avgR;
  return {
    kind: 'insight',
    id: 'sleep-trading',
    area: 'sleep',
    icon: 'battery',
    title: 'Sleep moves your results',
    body: `Rested, you average ${fmtR(line.rested.avgR)} a trade. ${line.tired.label}: ${fmtR(line.tired.avgR)}.`,
    evidence: `From ${line.rested.n + line.tired.n} trades`,
    score: 0.8 + Math.min(0.2, gap / 5),
    route: '/sleep',
  };
}

/** The feeling that costs you most, against your other trades. */
function feelingCost(s: State): Insight | null {
  const closed = closedTrades(s);
  if (closed.length < EDGE_MIN * 2) return null;
  const all = bucket('all', closed);
  const feelings = [...new Set(closed.flatMap((t) => t.emotions))];
  const candidates = feelings
    .map((f) => {
      const inF = closed.filter((t) => t.emotions.includes(f));
      return { f, b: bucket(f, inF), rest: bucket('rest', closed.filter((t) => !t.emotions.includes(f))) };
    })
    .filter((c) => c.b.n >= EDGE_MIN && c.rest.n >= EDGE_MIN && c.b.avgR < c.rest.avgR && clearGap(c.b, c.rest))
    .sort((a, b) => shrunk(a.b, all.avgR) - shrunk(b.b, all.avgR));
  const worst = candidates[0];
  if (!worst || worst.b.avgR >= 0.1) return null;
  return {
    kind: 'insight',
    id: 'feeling-cost',
    area: 'trading',
    icon: 'heart',
    title: `${worst.f} costs you`,
    body: `Trades taken feeling ${worst.f === 'FOMO' ? 'FOMO' : worst.f.toLowerCase()} average ${fmtR(worst.b.avgR)} (${pct(worst.b.winRate)} won). The rest: ${fmtR(worst.rest.avgR)}.`,
    evidence: `From ${plural(worst.b.n, 'trade')}`,
    score: 0.75 + Math.min(0.25, (worst.rest.avgR - worst.b.avgR) / 4),
    route: '/gate',
  };
}

/** Breaking a rule, in R per trade. */
function rulesCost(s: State): Insight | null {
  const closed = closedTrades(s).filter((t) => t.followedRules !== undefined);
  const kept = bucket('kept', closed.filter((t) => t.followedRules));
  const broke = bucket('broke', closed.filter((t) => t.followedRules === false));
  if (kept.n < EDGE_MIN || broke.n < EDGE_MIN || broke.avgR >= kept.avgR || !clearGap(kept, broke)) return null;
  return {
    kind: 'insight',
    id: 'rules-cost',
    area: 'trading',
    icon: 'shield',
    title: 'Your rules pay you',
    body: `By the rules you average ${fmtR(kept.avgR)} a trade. Breaking one: ${fmtR(broke.avgR)}.`,
    evidence: `From ${kept.n + broke.n} trades`,
    score: 0.7,
    route: '/journal',
  };
}

/** Mood after short nights vs good ones: "it's the sleep talking". */
function sleepMood(s: State): Insight | null {
  const need = s.settings.sleepNeed || 8;
  const shortV: number[] = [];
  const goodV: number[] = [];
  for (const [key, d] of Object.entries(s.days)) {
    const v = d.checkin?.valence;
    if (v === undefined) continue;
    const noon = new Date(`${key}T12:00:00`).getTime();
    // Only the debt maths (cheap); no need to build that day's energy curve.
    const last = sleepDebt((s.sleeps ?? []).filter((l) => l.wake <= noon), need, noon).lastNight ?? d.checkin?.sleepHours;
    if (last === undefined) continue;
    if (isShort(last, need)) shortV.push(v);
    else if (last >= Math.min(7, need - 0.5)) goodV.push(v);
  }
  if (shortV.length < 4 || goodV.length < 4) return null;
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const a = avg(shortV);
  const b = avg(goodV);
  if (b - a < 0.8) return null;
  return {
    kind: 'insight',
    id: 'sleep-mood',
    area: 'mood',
    icon: 'moon',
    title: 'Heavy mornings are the sleep talking',
    body: `After short nights your morning mood averages ${a.toFixed(1)} of 7. After a good night: ${b.toFixed(1)}. It passes with one good night.`,
    evidence: `From ${shortV.length + goodV.length} check-ins`,
    score: 0.7 + Math.min(0.2, (b - a) / 10),
    route: '/sleep',
  };
}

/** When urges hit: the busiest 3-hour window of the day. */
function urgeTime(s: State): Insight | null {
  const urges = s.urges;
  if (urges.length < 6) return null;
  const hours = urges.map((u) => new Date(u.ts).getHours());
  let best = { start: 0, n: 0 };
  for (let h = 0; h < 24; h++) {
    const n = hours.filter((x) => (x - h + 24) % 24 < 3).length;
    if (n > best.n) best = { start: h, n };
  }
  if (best.n < 4 || best.n / urges.length < 0.4) return null;
  const hh = (h: number) => `${String(h % 24).padStart(2, '0')}:00`;
  return {
    kind: 'insight',
    id: 'urge-time',
    area: 'urges',
    icon: 'wind',
    title: 'When urges hit you',
    body: `${best.n} of your ${urges.length} urges came between ${hh(best.start)} and ${hh(best.start + 3)}. Plan something for then.`,
    evidence: `From ${plural(urges.length, 'urge')}`,
    score: 0.65 + Math.min(0.25, best.n / urges.length / 3),
    route: '/urge',
  };
}

/** The urge window as [startHour, startHour+3), if learned. */
export function urgeWindow(s: State): number | undefined {
  const i = urgeTime(s);
  if (!i) return undefined;
  const m = i.body.match(/between (\d\d):00/);
  return m ? Number(m[1]) : undefined;
}

/**
 * Promise days in the last 4 weeks that you used the app (so silence isn't counted as failure).
 * Empty unless you actually use promises (5+ days with one ticked): someone who only checks in
 * shouldn't be told they "kept 0 of 25".
 */
function trackedDays(s: State, now: number): string[] {
  const out: string[] = [];
  let ticked = 0;
  for (let i = 1; i <= 28; i++) {
    const k = keyOf(now - i * DAY);
    const d = s.days[k];
    const any = Object.values(d?.promises ?? {}).some(Boolean);
    if (any) ticked++;
    if (d && (d.checkin || d.close || any)) out.push(k);
  }
  return ticked >= 5 ? out : [];
}

/** Your hardest promise. */
function hardestPromise(s: State, now: number): Insight | null {
  const days = trackedDays(s, now);
  if (days.length < 10 || !s.settings.promises.length) return null;
  const rows = s.settings.promises.map((p) => ({ p, kept: days.filter((k) => s.days[k]?.promises?.[p]).length }));
  const worst = rows.sort((a, b) => a.kept - b.kept)[0];
  const rate = worst.kept / days.length;
  if (rate >= 0.5) return null;
  return {
    kind: 'insight',
    id: 'hardest-promise',
    area: 'habits',
    icon: 'check',
    title: 'Your hardest promise',
    body: `“${worst.p}”: kept ${worst.kept} of ${days.length} days. Make it smaller for a week, then build back up.`,
    evidence: `Last 4 weeks`,
    score: 0.6 + (0.5 - rate) / 2,
    route: '/settings',
  };
}

/** The weekday your promises slip. */
function hardestWeekday(s: State, now: number): Insight | null {
  const days = trackedDays(s, now);
  const ps = s.settings.promises;
  if (days.length < 14 || !ps.length) return null;
  const ratio = (k: string) => ps.filter((p) => s.days[k]?.promises?.[p]).length / ps.length;
  const byDow = new Map<number, number[]>();
  days.forEach((k) => {
    const dow = new Date(`${k}T12:00:00`).getDay();
    byDow.set(dow, [...(byDow.get(dow) ?? []), ratio(k)]);
  });
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const overall = avg(days.map(ratio));
  const ranked = [...byDow.entries()].filter(([, xs]) => xs.length >= 3).map(([dow, xs]) => ({ dow, v: avg(xs), n: xs.length }));
  if (ranked.length < 3) return null;
  const worst = ranked.sort((a, b) => a.v - b.v)[0];
  if (overall - worst.v < 0.25) return null;
  const name = WEEKDAYS[worst.dow];
  return {
    kind: 'insight',
    id: 'hardest-weekday',
    area: 'habits',
    icon: 'calendar',
    title: `${name}s are your hardest day`,
    body: `You keep ${pct(worst.v)} of promises on ${name}s, ${pct(overall)} overall. Set ${name} up the night before.`,
    evidence: `From ${plural(worst.n, name)}`,
    score: 0.6 + Math.min(0.2, overall - worst.v),
    route: '/settings',
  };
}

/** Your body's sleep need, when it differs from the setting. */
function learnedNeed(s: State, now: number): Insight | null {
  const est = learnNeed(s.sleeps ?? [], s.settings, now);
  const sug = needSuggestion(est, s.settings.sleepNeed);
  if (sug === undefined) return null;
  return {
    kind: 'insight',
    id: 'learned-need',
    area: 'sleep',
    icon: 'sparkles',
    title: `Your body seems to need ${fmtDur(sug)}`,
    body: `From ${est.nights} rest-day nights. Setting it right keeps your sleep debt honest.`,
    evidence: `From ${est.nights} nights`,
    score: 0.55,
    route: '/sleep',
  };
}

/** Positive: honoured stops. */
function walkAways(s: State): Insight | null {
  const n = s.trades.filter((t) => !t.taken).length;
  if (n < 3) return null;
  return {
    kind: 'insight',
    id: 'walk-aways',
    area: 'trading',
    icon: 'door',
    title: 'You can walk away',
    body: `You’ve honoured ${n} stops. That’s the skill most traders never build.`,
    evidence: `${plural(n, 'walk-away')}`,
    score: 0.5,
    route: '/journal',
  };
}

/** Everything the app has learned about you, strongest first. */
export function learned(s: State, now = Date.now()): Insight[] {
  return [
    sleepTrading(s),
    feelingCost(s),
    rulesCost(s),
    sleepMood(s),
    urgeTime(s),
    hardestPromise(s, now),
    hardestWeekday(s, now),
    learnedNeed(s, now),
    walkAways(s),
  ]
    .filter((x): x is Insight => !!x)
    .sort((a, b) => b.score - a.score);
}

/* ---------------------------------------------------------------------------
 * Today's one card
 * ------------------------------------------------------------------------- */

/** How useful an insight is right now (time of day, weekday, trading day). */
function relevance(s: State, i: Insight, now: number): number {
  const d = new Date(now);
  const h = d.getHours();
  const restDay = (s.settings.restDays?.length ? s.settings.restDays : [0, 6]).includes(d.getDay());
  if (i.area === 'trading' || i.id === 'sleep-trading') return !restDay && h >= 10 && h < 23 ? 0.25 : -0.2;
  if (i.id === 'urge-time') {
    const w = urgeWindow(s);
    if (w === undefined) return 0;
    const until = (w - h + 24) % 24; // hours until the window opens
    return until <= 3 || (h - w + 24) % 24 < 3 ? 0.35 : 0;
  }
  if (i.id === 'hardest-weekday') return i.title.startsWith(WEEKDAYS[d.getDay()]) || i.title.startsWith(WEEKDAYS[(d.getDay() + 1) % 7]) ? 0.3 : -0.1;
  if (i.area === 'habits') return h < 12 ? 0.15 : 0;
  if (i.area === 'mood') {
    const v = s.days[keyOf(now)]?.checkin?.valence;
    return v !== undefined && v <= 3 ? 0.35 : 0;
  }
  return 0;
}

/** Progress toward the first insight, for the "still learning" card. */
function learningProgress(s: State): number {
  const trades = closedTrades(s).length / (EDGE_MIN * 2);
  const checkins = Object.values(s.days).filter((d) => d.checkin).length / 8;
  const urges = s.urges.length / 6;
  return Math.max(0, Math.min(1, Math.max(trades, checkins, urges)));
}

export function coach(s: State, now = Date.now()): Coach {
  const all = learned(s, now);
  const day = s.days[keyOf(now)];
  if (day?.coachHidden) return { card: null, learned: all };

  const rough = roughPlan(s, now);
  if (rough) return { card: rough, learned: all };

  if (all.length) {
    const ranked = all.map((i) => ({ i, v: i.score + relevance(s, i, now) })).sort((a, b) => b.v - a.v);
    // Rotate among the near-best so the card stays fresh day to day.
    const top = ranked.filter((x) => x.v >= ranked[0].v - 0.1);
    const dayIndex = Math.floor(new Date(`${keyOf(now)}T12:00:00`).getTime() / DAY);
    return { card: top[dayIndex % top.length].i, learned: all };
  }

  const progress = learningProgress(s);
  return {
    card: {
      kind: 'learning',
      body: 'I’m learning how sleep, feelings and habits shape your days. Your first insight shows up after about 10 trades or a week of check-ins.',
      progress,
    },
    learned: all,
  };
}
