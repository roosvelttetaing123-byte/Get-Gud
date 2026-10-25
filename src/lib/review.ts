/**
 * Week in review: which week, what happened in it, and the slides that tell it.
 * Pure functions, no React or storage, so they run in the engine tests
 * (tools/engine-tests/review.test.mjs) in three time zones.
 *
 * "The week" is Monday 00:00 to the next Monday 00:00, local time. Days are stepped with the
 * calendar, never by adding 24 h, so a daylight-saving week is still seven calendar days.
 * The latest review opens on Sunday at 18:00 (the week you're finishing) and stays the latest
 * until the next Sunday evening. The card that announces it shows from Sunday 18:00 through Tuesday.
 *
 * Copy rewards process, never P&L: rituals, promises, trades by the rules, walk-aways and urges
 * ridden out lead; R is stated plainly. A light or rough week is framed kindly and honestly.
 */
import { learned, type CoachArea, type CoachIcon } from './coach';
import { asleepHours, DEFAULT_NEED, isNap, keyOf, sleepDebt } from './sleep';
import type { State, Trade } from './types';

/** The review for the week you're finishing opens on Sunday at this hour. */
export const READY_HOUR = 18;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ---------------------------------------------------------------------------
 * Which week
 * ------------------------------------------------------------------------- */

export interface Week {
  /** Monday's day key (YYYY-MM-DD). Names the week, e.g. for "seen" state. */
  key: string;
  /** Monday 00:00 local, ms. */
  start: number;
  /** The next Monday 00:00 local, ms (exclusive). 7 × 24 h ± 1 h across daylight saving. */
  end: number;
  /** Seven day keys, Monday first. */
  days: string[];
  /** "19–25 Oct", or "28 Sep – 4 Oct" across months. */
  label: string;
}

/** Local midnight `n` calendar days after the day of `ts`. */
function midnight(ts: number, n = 0): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime();
}

/** Noon `n` calendar days after the day of `ts` (noon is never skipped by daylight saving). */
function noon(ts: number, n = 0): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12).getTime();
}

/** Monday 00:00 (local) of the week that contains `ts`. */
export function mondayOf(ts: number): number {
  const d = new Date(ts);
  return midnight(ts, -((d.getDay() + 6) % 7));
}

function label(start: number): string {
  const a = new Date(noon(start));
  const b = new Date(noon(start, 6));
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}`;
  return `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]}`;
}

/** The Monday-to-Sunday week that contains `ts`. */
export function weekOf(ts: number): Week {
  const start = mondayOf(ts);
  return {
    key: keyOf(noon(start)),
    start,
    end: midnight(start, 7),
    days: Array.from({ length: 7 }, (_, i) => keyOf(noon(start, i))),
    label: label(start),
  };
}

/** True from Sunday 18:00: the week you're finishing can be reviewed. */
const ready = (now: number) => {
  const d = new Date(now);
  return d.getDay() === 0 && d.getHours() >= READY_HOUR;
};

/** The week to review now: this week from Sunday 18:00, otherwise last week. */
export function latestWeek(now: number): Week {
  return weekOf(ready(now) ? now : midnight(mondayOf(now), -7));
}

/** Whether the "Your week" card should announce the latest review: Sunday 18:00 through Tuesday. */
export function reviewDue(now: number): boolean {
  const day = new Date(now).getDay();
  return ready(now) || day === 1 || day === 2;
}

/* ---------------------------------------------------------------------------
 * What happened
 * ------------------------------------------------------------------------- */

export interface WeekReview {
  week: Week;
  rituals: {
    done: number; // check-ins + closes
    checkins: number;
    closes: number;
    byDay: number[]; // 0..1 per day: none, one or both rituals
  };
  promises: {
    /** Days you used the app (checked in, closed or ticked a promise). Silence isn't failure. */
    days: number;
    kept: number;
    possible: number; // promises × tracked days
    rate: number | null; // kept / possible
    best?: string; // the promise you kept most
    byDay: (number | null)[]; // share kept, null on untracked days
  };
  trading: {
    taken: number;
    closed: number;
    wins: number;
    netR: number;
    byRules: number; // taken trades that kept every rule and no stop was overridden
    rate: number | null; // byRules / taken
    walkedAway: number;
    byDay: (number | null)[]; // share by the rules, null on days without a taken trade
  };
  urges: {
    logged: number;
    riddenOut: number;
    byDay: (number | null)[]; // ridden out, relative to the busiest day; null on quiet days
  };
  sleep: {
    nights: number;
    avg: number | null; // hours asleep per logged night
    need: number;
    /** Sleep debt before the week's first night and after its last, when 3+ nights back it. */
    debtBefore: number | null;
    debtAfter: number | null;
    change: number | null; // after - before
    byDay: (number | null)[]; // hours / need, capped at 1
  };
  /** Nothing at all was logged this week. */
  empty: boolean;
}

const round2 = (x: number) => Math.round(x * 100) / 100;
const honoured = (t: Trade) => !t.overridden && t.followedRules !== false;

function showedUp(s: State, key: string): boolean {
  const d = s.days[key];
  return !!d && !!(d.checkin || d.close || Object.values(d.promises ?? {}).some(Boolean));
}

/** Sleep debt at `at`, from the nights logged by then, or null while under 3 nights back it. */
function debtAt(s: State, need: number, at: number): number | null {
  const d = sleepDebt((s.sleeps ?? []).filter((l) => l.wake <= at), need, at);
  return d.known >= 3 ? d.hours : null;
}

export function weekReview(s: State, week: Week, now: number = week.end): WeekReview {
  const inWeek = (ts: number) => ts >= week.start && ts < week.end;
  const dayOf = (ts: number) => week.days.indexOf(keyOf(ts));

  // Rituals
  const ritualDays = week.days.map((k) => (s.days[k]?.checkin ? 1 : 0) + (s.days[k]?.close ? 1 : 0));
  const checkins = week.days.filter((k) => s.days[k]?.checkin).length;
  const closes = week.days.filter((k) => s.days[k]?.close).length;

  // Promises: only days you used the app count.
  const ps = s.settings.promises;
  const tracked = week.days.filter((k) => showedUp(s, k));
  const keptOn = (k: string) => ps.filter((p) => s.days[k]?.promises?.[p]).length;
  const kept = tracked.reduce((a, k) => a + keptOn(k), 0);
  const possible = ps.length * tracked.length;
  const tally = ps.map((p) => ({ p, n: tracked.filter((k) => s.days[k]?.promises?.[p]).length }));
  const top = tally.reduce<{ p: string; n: number } | undefined>((a, b) => (!a || b.n > a.n ? b : a), undefined);

  // Trading: entries count on the day you hit the gate.
  const entries = s.trades.filter((t) => inWeek(t.ts));
  const taken = entries.filter((t) => t.taken);
  const closed = taken.filter((t) => t.result);
  const good = taken.filter(honoured);
  const tradeDays = week.days.map((_, i) => {
    const on = taken.filter((t) => dayOf(t.ts) === i);
    return on.length ? on.filter(honoured).length / on.length : null;
  });

  // Urges
  const urges = s.urges.filter((u) => inWeek(u.ts));
  const riddenOut = urges.filter((u) => u.outcome === 'resisted');
  const urgeCounts = week.days.map((_, i) => riddenOut.filter((u) => dayOf(u.ts) === i).length);
  const busiest = Math.max(1, ...urgeCounts);

  // Sleep: main sleep per wake-up day (naps aside); split nights add up.
  const need = s.settings.sleepNeed || DEFAULT_NEED;
  const hours = week.days.map((k) => {
    const main = (s.sleeps ?? []).filter((l) => !isNap(l) && keyOf(l.wake) === k && l.wake <= now);
    return main.length ? main.reduce((a, l) => a + asleepHours(l), 0) : null;
  });
  const logged = hours.filter((h): h is number => h !== null);
  const before = debtAt(s, need, Math.min(now, noon(week.start, -1)));
  const after = debtAt(s, need, Math.min(now, noon(week.start, 6)));

  const review: WeekReview = {
    week,
    rituals: { done: checkins + closes, checkins, closes, byDay: ritualDays.map((n) => n / 2) },
    promises: {
      days: tracked.length,
      kept,
      possible,
      rate: possible ? kept / possible : null,
      best: top && top.n > 0 ? top.p : undefined,
      byDay: week.days.map((k) => (tracked.includes(k) && ps.length ? keptOn(k) / ps.length : null)),
    },
    trading: {
      taken: taken.length,
      closed: closed.length,
      wins: closed.filter((t) => t.result === 'win').length,
      netR: round2(closed.reduce((a, t) => a + (t.r ?? 0), 0)),
      byRules: good.length,
      rate: taken.length ? good.length / taken.length : null,
      walkedAway: entries.length - taken.length,
      byDay: tradeDays,
    },
    urges: {
      logged: urges.length,
      riddenOut: riddenOut.length,
      byDay: urgeCounts.map((n) => (n ? n / busiest : null)),
    },
    sleep: {
      nights: logged.length,
      avg: logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : null,
      need,
      debtBefore: before,
      debtAfter: after,
      change: before !== null && after !== null ? after - before : null,
      byDay: hours.map((h) => (h === null ? null : Math.min(1, h / need))),
    },
    empty: false,
  };
  review.empty =
    review.rituals.done === 0 &&
    tracked.length === 0 &&
    entries.length === 0 &&
    urges.length === 0 &&
    logged.length === 0;
  return review;
}

/* ---------------------------------------------------------------------------
 * One focus for next week
 * ------------------------------------------------------------------------- */

export interface Focus {
  title: string;
  body: string;
  icon: CoachIcon;
  area: CoachArea;
  /** 'coach' when it's the strongest pattern learned from your data, 'week' when it comes from this week alone. */
  from: 'coach' | 'week';
}

/** The coach's strongest learned pattern; until there is one, the gentlest useful nudge from this week. */
export function weekFocus(s: State, r: WeekReview, now: number): Focus {
  const top = learned(s, now)[0];
  if (top) return { title: top.title, body: top.body, icon: top.icon, area: top.area, from: 'coach' };
  if (r.rituals.checkins < 5) {
    return { title: 'Check in every morning', body: 'Thirty seconds that set up the whole day.', icon: 'sun', area: 'habits', from: 'week' };
  }
  if (r.promises.rate !== null && r.promises.rate < 0.5) {
    return {
      title: 'One promise at a time',
      body: r.promises.best
        ? `Keep “${r.promises.best}” every day, then add the next one.`
        : 'Pick the easiest promise and keep it every day.',
      icon: 'check',
      area: 'habits',
      from: 'week',
    };
  }
  if (r.sleep.avg !== null && r.sleep.avg < r.sleep.need - 1) {
    return {
      title: 'Protect your sleep',
      body: 'In bed 30 minutes earlier. Your trading feels it first.',
      icon: 'bed',
      area: 'sleep',
      from: 'week',
    };
  }
  return { title: 'Keep it boring', body: 'Same rituals, same rules. It’s working.', icon: 'check', area: 'habits', from: 'week' };
}

/* ---------------------------------------------------------------------------
 * The slides
 * ------------------------------------------------------------------------- */

export type SlideId = 'rituals' | 'promises' | 'trading' | 'urges' | 'sleep' | 'focus';

export interface Slide {
  id: SlideId;
  /** Small label at the top, e.g. "Rituals". */
  kicker: string;
  /** The giant number. Absent on the focus slide. */
  value?: number;
  /** How to show `value`: a plain count, a percentage, or hours and minutes. */
  unit?: 'count' | 'pct' | 'hm';
  /** Right under the number ("of promises kept"), or the focus itself. */
  caption: string;
  /** One plain sentence. */
  line: string;
  /** 0..1 per day, Monday first, for the strip at the bottom; null on days with nothing. */
  byDay?: (number | null)[];
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
/** "+3.4R", "−1.2R", "0R" with a true minus sign. */
export const fmtR = (r: number) => {
  const v = round2(r);
  return v === 0 ? '0R' : `${v > 0 ? '+' : '−'}${Math.abs(v)}R`;
};
/** "2.5 h", "12 h". */
const fmtH = (h: number) => `${h < 10 ? Math.round(h * 10) / 10 : Math.round(h)} h`;

function ritualsSlide(r: WeekReview): Slide {
  const { done, checkins, closes } = r.rituals;
  const both = [checkins ? plural(checkins, 'check-in') : '', closes ? plural(closes, 'close') : ''].filter(Boolean).join(' and ');
  const line =
    done === 0
      ? 'A fresh week starts with one check-in.'
      : done >= 12
        ? 'Morning and night, nearly every day.'
        : done >= 7
          ? `${both}. Showing up is the habit.`
          : `${both}. Every one counts.`;
  return {
    id: 'rituals',
    kicker: 'Rituals',
    value: done,
    unit: 'count',
    caption: done === 0 ? 'rituals this week' : 'of 14 rituals done',
    line,
    byDay: r.rituals.byDay.map((v) => (v ? v : null)),
  };
}

/** Only shown when at least one promise was kept, so it always has one to name. */
function promisesSlide(r: WeekReview): Slide {
  const { rate, best } = r.promises;
  const line = (rate ?? 0) >= 0.5 ? `“${best}” was your steady one.` : `“${best}” held up best. Build from there.`;
  return {
    id: 'promises',
    kicker: 'Promises',
    value: Math.round((rate ?? 0) * 100),
    unit: 'pct',
    caption: 'of promises kept',
    line,
    byDay: r.promises.byDay,
  };
}

function tradingSlide(r: WeekReview): Slide {
  const t = r.trading;
  if (!t.taken) {
    return {
      id: 'trading',
      kicker: 'Trading',
      value: t.walkedAway,
      unit: 'count',
      caption: t.walkedAway === 1 ? 'time you walked away' : 'times you walked away',
      line: 'No trades taken. Every stop honoured.',
      byDay: t.byDay,
    };
  }
  const result = t.closed ? `${fmtR(t.netR)} from ${plural(t.closed, 'trade')}` : `${plural(t.taken, 'trade')}, results still to log`;
  const walked = t.walkedAway ? `, and you walked away ${times(t.walkedAway)}` : '';
  const nudge = (t.rate ?? 1) < 0.6 ? ' Rules first next week.' : '';
  return {
    id: 'trading',
    kicker: 'Trading',
    value: Math.round((t.rate ?? 0) * 100),
    unit: 'pct',
    caption: 'of trades by your rules',
    line: `${result}${walked}.${nudge}`,
    byDay: t.byDay,
  };
}

function urgesSlide(r: WeekReview): Slide {
  const { logged, riddenOut } = r.urges;
  const line =
    riddenOut === logged
      ? logged === 1
        ? 'You sat with it until it passed.'
        : 'You didn’t give in once.'
      : riddenOut === 0
        ? 'Naming them is the first step. Next time, start the timer.'
        : 'Each one you ride out makes the next one weaker.';
  return {
    id: 'urges',
    kicker: 'Urges',
    value: riddenOut,
    unit: 'count',
    caption: riddenOut === logged ? (logged === 1 ? 'urge ridden out' : 'urges ridden out') : `of ${logged} urges ridden out`,
    line,
    byDay: r.urges.byDay,
  };
}

function sleepSlide(r: WeekReview): Slide {
  const { change, nights } = r.sleep;
  const line =
    change === null
      ? `${plural(nights, 'night')} logged. A few more and your sleep debt shows here.`
      : change <= -0.5
        ? `Sleep debt down ${fmtH(-change)} over the week.`
        : change >= 0.5
          ? `Sleep debt up ${fmtH(change)}. Two early nights pay most of it back.`
          : 'Sleep debt held steady.';
  return {
    id: 'sleep',
    kicker: 'Sleep',
    value: r.sleep.avg ?? 0,
    unit: 'hm',
    caption: 'average night',
    line,
    byDay: r.sleep.byDay,
  };
}

/**
 * The story, in order: rituals, promises, trading, urges, sleep, then one focus.
 * A slide shows only when that part of your week has something in it (no giant zero for a
 * promise list you didn't touch); rituals and the focus always show.
 */
export function reviewSlides(s: State, r: WeekReview, focus: Focus): Slide[] {
  return slideIds(s, r).map((id) =>
    id === 'rituals'
      ? ritualsSlide(r)
      : id === 'promises'
        ? promisesSlide(r)
        : id === 'trading'
          ? tradingSlide(r)
          : id === 'urges'
            ? urgesSlide(r)
            : id === 'sleep'
              ? sleepSlide(r)
              : { id: 'focus', kicker: 'One focus for next week', caption: focus.title, line: focus.body },
  );
}

/** Which slides the week gets, in order. Cheap: no focus needed, so a card can show the count. */
export function slideIds(s: State, r: WeekReview): SlideId[] {
  const ids: SlideId[] = ['rituals'];
  if (s.settings.promises.length && r.promises.kept) ids.push('promises');
  if (r.trading.taken || r.trading.walkedAway) ids.push('trading');
  if (r.urges.logged) ids.push('urges');
  if (r.sleep.nights) ids.push('sleep');
  ids.push('focus');
  return ids;
}

/** "7 h 12 m" for the sleep number. */
export function fmtHM(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} m`;
  return m ? `${h} h ${m} m` : `${h} h`;
}

/** One line for the card that opens the story, e.g. "11 rituals · 64% of promises kept". */
export function teaser(r: WeekReview): string {
  const bits: string[] = [plural(r.rituals.done, 'ritual')];
  if (r.promises.rate !== null) bits.push(`${Math.round(r.promises.rate * 100)}% of promises`);
  else if (r.trading.rate !== null) bits.push(`${Math.round(r.trading.rate * 100)}% by your rules`);
  else if (r.urges.riddenOut) bits.push(plural(r.urges.riddenOut, 'urge') + ' ridden out');
  return bits.join(' · ');
}
