/**
 * Sleep engine tests. Run with `npm run test:engine` (scripts/test-engine.sh), which compiles
 * src/lib's pure engine and runs this file in three time zones.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, test } from 'node:test';

const require = createRequire(import.meta.url);
const dir = process.env.ENGINE_DIR;
if (!dir) throw new Error('Set ENGINE_DIR to the compiled engine (see scripts/test-engine.sh).');
const S = require(`${dir}/sleep.js`);
const E = require(`${dir}/sleepEdge.js`);
const N = require(`${dir}/sleepNeed.js`);
const F = require(`${dir}/modelFit.js`);

const H = 3_600_000;
// A Wednesday in June: no daylight-saving change within 60 days in any test zone.
const Y = 2026;
const MO = 5;
const D = 17;
const midnight = (daysAgo) => new Date(Y, MO, D - daysAgo).getTime();
const at = (daysAgo, h, m = 0) => new Date(Y, MO, D - daysAgo, h, m).getTime();
const NOW = at(0, 12);

/** A main night ending `daysAgo` mornings ago. bed/wake in hours from that morning's midnight (-1 = 23:00 the night before). */
const night = (daysAgo, bed, wake, extra = {}) => ({
  id: `n${daysAgo}`,
  bed: midnight(daysAgo) + bed * H,
  wake: midnight(daysAgo) + wake * H,
  source: 'manual',
  ...extra,
});
const range = (n) => Array.from({ length: n }, (_, i) => i);
const nightsOf = (n, bed, wake) => range(n).map((i) => night(i, bed, wake));

const settings = (over = {}) => ({
  name: '',
  why: '',
  rules: [],
  promises: [],
  maxTrades: 3,
  maxLossStreak: 2,
  cooldownMin: 30,
  urgeMinutes: 3,
  freezes: 2,
  restDays: [],
  sleepNeed: 8,
  wakeGoal: '07:00',
  healthImport: false,
  healthGist: '',
  onboarded: true,
  ...over,
});
const state = (over = {}) => ({
  version: 1,
  settings: settings(over.settings),
  trades: [],
  days: {},
  urges: [],
  sleeps: [],
  awards: {},
  seenAwards: [],
  ...over,
  ...(over.settings ? { settings: settings(over.settings) } : {}),
});

const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} expected ${b} ±${tol}, got ${a}`);
const energyAtClock = (sched, h, m = 0) => S.energyOn(sched, at(0, h, m));

describe('sleep debt', () => {
  test('a steady hour short every night is about 14 h', () => {
    const d = S.sleepDebt(nightsOf(14, 0, 7), 8, NOW);
    near(d.hours, 14, 0.01);
    assert.equal(d.zone, 'high');
    near(d.coverage, 1, 1e-9);
  });

  test('one night 2 h short is about 4 h', () => {
    const logs = [night(0, 1, 7), ...range(13).map((i) => night(i + 1, -1, 7))];
    near(S.sleepDebt(logs, 8, NOW).hours, 14 * 0.15 * 2, 0.01);
  });

  test('extra sleep pays back at most 1.5 h a night', () => {
    const logs = [night(0, -5, 7), ...range(13).map((i) => night(i + 1, 0, 7))]; // 12 h last night after 13 short nights
    const all = S.sleepDebt(logs, 8, NOW).hours;
    const shortOnly = 14 * (1 - S.DEBT_WEIGHTS[0]) * 1;
    near(all, shortOnly - 14 * S.DEBT_WEIGHTS[0] * 1.5, 0.01);
  });

  test('nights you did not log count as your typical night, not a perfect one', () => {
    const logs = range(14)
      .filter((i) => i % 2 === 0)
      .map((i) => night(i, 0, 7)); // 7 h, every other night
    const d = S.sleepDebt(logs, 8, NOW);
    assert.equal(d.known, 7);
    near(d.coverage, sum(S.DEBT_WEIGHTS.filter((_, i) => i % 2 === 0)), 1e-9);
    const loggedPart = 14 * d.coverage;
    const missingPart = 14 * (1 - d.coverage) * (7 / 10); // shrunk: 7 logs / (7 + 3)
    near(d.hours, loggedPart + missingPart, 0.01);
    assert.ok(d.hours > 11 && d.hours < 14);
  });

  test('with under 3 logged nights, missing nights stay neutral', () => {
    const logs = [night(0, 1, 7), night(1, 1, 7)]; // 6 h, 6 h
    near(S.sleepDebt(logs, 8, NOW).hours, 14 * (S.DEBT_WEIGHTS[0] + S.DEBT_WEIGHTS[1]) * 2, 0.01);
  });

  test('a day with only a nap counts as a missing night plus the nap', () => {
    const nap = { id: 'nap', bed: at(1, 14), wake: at(1, 14, 30), source: 'manual' };
    const logs = [nap, ...range(14).filter((i) => i !== 1).map((i) => night(i, 0, 7))];
    const d = S.sleepDebt(logs, 8, NOW);
    // Typical shortfall 1 h shrunk by 13/16, minus the half-hour nap, on night 1.
    const expected = 14 * (1 - S.DEBT_WEIGHTS[1]) * 1 + 14 * S.DEBT_WEIGHTS[1] * ((1 * 13) / 16 - 0.5);
    near(d.hours, expected, 0.01);
  });
});

describe('body clock', () => {
  test('bedtimes either side of midnight average to midnight', () => {
    const logs = range(6).map((i) => (i % 2 ? night(i, -1 / 6, 7.833) : night(i, 1 / 6, 8.167)));
    const c = S.bodyClock(logs, 8);
    const off = Math.min(c.onset, 1440 - c.onset);
    assert.ok(off <= 10, `onset ${c.onset}`);
  });

  test('falls back to the wake goal with no logs', () => {
    const c = S.bodyClock([], 8, '06:30');
    assert.equal(c.wake, 390);
    assert.equal(c.basis, 0);
  });
});

describe('energy schedule', () => {
  const rested = nightsOf(14, -1, 7);
  const sched = (logs, need = 8, now = NOW) => S.schedule(logs, need, S.sleepDebt(logs, need, now).hours, now);

  test('a rested day has the Rise shape: groggy, morning peak, dip, evening peak, wind-down', () => {
    const s = sched(rested);
    const ids = s.phases.map((p) => p.id);
    assert.deepEqual(ids, ['groggy', 'peak1', 'dip', 'peak2', 'winddown', 'melatonin', 'sleep']);
    for (let i = 1; i < s.phases.length; i++) assert.equal(s.phases[i].start, s.phases[i - 1].end, 'phases touch');
    const top = (p) => Math.max(...s.curve.filter((q) => q.t >= p.start && q.t < p.end).map((q) => q.e));
    const low = (p) => Math.min(...s.curve.filter((q) => q.t >= p.start && q.t < p.end).map((q) => q.e));
    const [, p1, dip, p2] = s.phases;
    assert.ok(top(p1) > low(dip) + 10 && top(p2) > low(dip) + 5, 'peaks stand above the dip');
    const peakAt = s.curve.filter((q) => q.t >= p1.start && q.t < p1.end).reduce((a, b) => (b.e > a.e ? b : a)).t;
    const afterWake = (peakAt - s.wakeAt) / H;
    assert.ok(afterWake >= 2 && afterWake <= 5, `morning peak ${afterWake} h after waking`);
    assert.equal(S.clockLabel(s.melatonin.start), '22:45');
  });

  test('a 4 h night lowers energy all day', () => {
    const short = [night(0, 3, 7), ...range(13).map((i) => night(i + 1, -1, 7))];
    const a = sched(rested);
    const b = sched(short);
    for (const h of [8, 10, 13, 15, 18, 20]) assert.ok(energyAtClock(b, h) < energyAtClock(a, h) - 5, `at ${h}:00`);
  });

  test('a nap leaves the hours before it alone and lifts the rest of the day', () => {
    const base = [night(0, 3, 7), ...range(13).map((i) => night(i + 1, -1, 7))];
    const nap = { id: 'nap', bed: at(0, 13), wake: at(0, 13, 30), source: 'manual' };
    const now = at(0, 15);
    const without = sched(base, 8, now);
    const withNap = sched([nap, ...base], 8, now);
    for (const h of [8, 10, 12]) assert.equal(energyAtClock(withNap, h), energyAtClock(without, h), `before the nap, ${h}:00`);
    for (const h of [15, 18, 20]) assert.ok(energyAtClock(withNap, h) > energyAtClock(without, h), `after the nap, ${h}:00`);
    assert.deepEqual(
      withNap.phases.map((p) => [p.id, p.start]),
      without.phases.map((p) => [p.id, p.start]),
      'a nap never moves the phases',
    );
  });

  test('a long nap leaves you groggy right after, then lifts you', () => {
    const base = nightsOf(14, -1, 7);
    const nap = { id: 'nap', bed: at(0, 13), wake: at(0, 14, 30), source: 'manual' };
    const now = at(0, 16);
    const without = sched(base, 8, now);
    const withNap = sched([nap, ...base], 8, now);
    assert.ok(energyAtClock(withNap, 14, 30) < energyAtClock(without, 14, 30), 'groggy at 14:30');
    assert.ok(energyAtClock(withNap, 16) > energyAtClock(without, 16), 'lifted by 16:00');
  });

  test('daylight-saving days keep wall-clock times', () => {
    for (const [mo, d] of [
      [10, 1], // US fall back 2026-11-01, EU 2026-10-25 is covered by the London run
      [2, 8], // US spring forward 2026-03-08
      [9, 25], // EU fall back
      [2, 29], // EU spring forward
    ]) {
      const logs = range(10).map((i) => ({
        id: `d${i}`,
        bed: new Date(Y, mo, d - i - 1, 23).getTime(),
        wake: new Date(Y, mo, d - i, 7).getTime(),
        source: 'manual',
      })).slice(1); // nothing logged on the changeover morning itself
      const now = new Date(Y, mo, d, 12).getTime();
      const s = S.schedule(logs, 8, 0, now);
      assert.equal(S.clockLabel(s.wakeAt), '07:00', `wake on ${mo + 1}/${d}`);
      assert.equal(S.clockLabel(s.melatonin.start), '22:45', `melatonin on ${mo + 1}/${d}`);
    }
  });
});

describe('learned sleep need', () => {
  /**
   * A person who needs `need` h: 7 h on workdays, and on Sat/Sun sleeps need + 0.1 h per
   * hour of debt they carry in (rebound), give or take a little.
   */
  function person(need, weeks, wobble = [0.2, -0.15, 0.1, -0.2, 0.05, 0.15, -0.1, 0]) {
    const logs = [];
    for (let i = 7 * weeks; i >= 1; i--) {
      const wake = new Date(Y, MO, D - i, 7);
      const free = wake.getDay() === 0 || wake.getDay() === 6;
      if (!free) {
        logs.push({ id: `p${i}`, bed: wake.getTime() - 7 * H, wake: wake.getTime(), source: 'manual' });
        continue;
      }
      const prev = new Date(wake);
      prev.setDate(prev.getDate() - 1);
      prev.setHours(12);
      const debt = S.sleepDebt(logs, need, prev.getTime()).hours;
      const hours = need + 0.1 * debt + wobble[i % wobble.length];
      const late = new Date(Y, MO, D - i, 7 + Math.max(0, hours - 8)).getTime();
      logs.push({ id: `p${i}`, bed: late - hours * H, wake: late, source: 'manual' });
    }
    return logs.sort((a, b) => b.wake - a.wake);
  }

  test('finds a need of 8.5 h from weekends, corrected for weekday debt', () => {
    const est = N.learnNeed(person(8.5, 10), { restDays: [] }, NOW);
    assert.ok(est.learned);
    near(est.need, 8.5, 0.35, 'need');
    assert.equal(N.needSuggestion(est, 8), 8.5);
    assert.equal(N.needSuggestion(est, 8.5), undefined, 'no nagging once it matches');
  });

  test('raw weekend sleep would overstate it; the rebound term pulls it back', () => {
    const logs = person(8.5, 10);
    const free = N.freeNights(logs, { restDays: [] }, NOW);
    const raw = sum(free.map((f) => f.hours)) / free.length;
    const est = N.learnNeed(logs, { restDays: [] }, NOW);
    assert.ok(raw > est.need + 0.5, `raw ${raw} vs learned ${est.need}`);
  });

  test('suggests nothing until there are 5 free nights', () => {
    const est = N.learnNeed(person(9, 1), { restDays: [] }, NOW);
    assert.equal(est.nights, 2);
    assert.equal(est.learned, false);
    assert.ok(est.need > 8 && est.need < 9, 'two nights move it part of the way, not all of it');
    assert.equal(N.needSuggestion(est, 8), undefined);
  });

  test('recovers short and long sleepers', () => {
    for (const need of [7.5, 8, 9]) {
      const est = N.learnNeed(person(need, 8), { restDays: [] }, NOW);
      near(est.need, need, 0.35, `need ${need}`);
    }
  });

  test('with no free nights it is the 8 h prior', () => {
    const est = N.learnNeed(nightsOf(14, -1, 7).filter((l) => ![0, 6].includes(new Date(l.wake).getDay())), { restDays: [] }, NOW);
    assert.equal(est.nights, 0);
    assert.equal(est.need, 8);
  });

  test('free nights come from the calendar, never from how long you slept', () => {
    const longWeekday = [night(0, -3, 7)]; // a 10 h Wednesday
    assert.equal(N.freeNights(longWeekday, { restDays: [] }, NOW).length, 0);
    assert.equal(N.freeNights(longWeekday, { restDays: [3] }, NOW).length, 1, 'unless Wednesday is your rest day');
  });
});

describe('sleep edge', () => {
  /** 40 days of sleep: every 4th night short (5 h). Trades at 10:00 and 20:00 each day. */
  function trader(rWhenRested, rWhenShort, noise = [0.4, -0.3, 0.2, -0.1, 0.3, -0.4, 0.1, -0.2]) {
    const sleeps = range(40).map((i) => (i % 4 === 1 ? night(i, 2, 7) : night(i, -1, 7)));
    const trades = [];
    let k = 0;
    for (let i = 39; i >= 1; i--) {
      for (const h of [10, 20]) {
        const short = i % 4 === 1;
        const r = (short ? rWhenShort : rWhenRested) + noise[k % noise.length];
        trades.push({
          id: `t${k}`,
          ts: at(i, h),
          emotions: ['Calm'],
          verdict: 'clear',
          reasons: [],
          taken: true,
          overridden: false,
          result: r > 0 ? 'win' : 'loss',
          r,
          closedTs: at(i, h) + H,
        });
        k++;
      }
    }
    return state({ sleeps: sleeps.sort((a, b) => b.wake - a.wake), trades });
  }

  test('only uses sleep you had logged by the time of the trade', () => {
    const s = trader(1, -1);
    const t = s.trades[0];
    const r = E.restAt(s, t.ts);
    const later = E.restAt({ ...s, sleeps: [...s.sleeps, night(0, 5, 7)] }, t.ts);
    assert.deepEqual(r, later);
  });

  test('says what tiredness costs when the gap is clear', () => {
    const e = E.sleepEdge(trader(1, -1));
    const line = E.restLine(e);
    assert.ok(line, 'expected a sentence');
    assert.equal(line.rested.id, 'rested');
    assert.ok(line.tired.avgR < 0 && line.rested.avgR > 0.5);
  });

  test('stays quiet when the gap is inside the noise', () => {
    const e = E.sleepEdge(trader(0.3, 0.1, [2, -2, 1.5, -1.5, 2.5, -2.5, 1, -1]));
    assert.equal(E.restLine(e), null);
  });

  test('a phase needs 5 trades before it can be a learned window', () => {
    const e = {
      closed: 12,
      matched: 12,
      avgR: 0.5,
      byRest: [],
      byPhase: [
        { id: 'peak1', label: 'Morning peak', n: 4, winRate: 1, avgR: 3, sdR: 0.5 },
        { id: 'peak2', label: 'Evening peak', n: 8, winRate: 0.6, avgR: 0.4, sdR: 1 },
      ],
    };
    assert.deepEqual(E.goodPhases(e), { ids: ['peak1', 'peak2'], learned: false });
  });

  test('learned windows are the better half, after pulling small groups toward your average', () => {
    const e = {
      closed: 40,
      matched: 40,
      avgR: 0.3,
      byRest: [],
      byPhase: [
        { id: 'peak1', label: 'Morning peak', n: 6, winRate: 0.8, avgR: 1.2, sdR: 1 },
        { id: 'dip', label: 'Afternoon dip', n: 14, winRate: 0.3, avgR: -0.6, sdR: 1 },
        { id: 'peak2', label: 'Evening peak', n: 20, winRate: 0.55, avgR: 0.5, sdR: 1 },
      ],
    };
    const g = E.goodPhases(e);
    assert.equal(g.learned, true);
    assert.deepEqual(g.ids, ['peak1', 'peak2']);
  });
});

describe('model fit', () => {
  /** 14 days, a short night every third day, a check-in at 08:30 rated by `rate(curveEnergy)`. */
  function checkins(rate) {
    const sleeps = range(20).map((i) => (i % 3 === 0 ? night(i, 2.5, 7) : night(i, -1, 7)));
    const base = state({ sleeps: sleeps.sort((a, b) => b.wake - a.wake) });
    const days = {};
    for (let i = 13; i >= 1; i--) {
      const ts = at(i, 8, 30);
      const e = E.restAt(base, ts).energy;
      days[S.keyOf(ts)] = { promises: {}, checkin: { at: ts, energy: rate(e) } };
    }
    return { ...base, days };
  }

  test('good when your ratings follow the curve', () => {
    const f = F.modelFit(checkins((e) => Math.max(1, Math.min(5, Math.round(e / 15)))));
    assert.ok(f.days >= 7);
    assert.equal(f.level, 'good');
  });

  test('weak when they run against it', () => {
    const f = F.modelFit(checkins((e) => Math.max(1, Math.min(5, 6 - Math.round(e / 15)))));
    assert.equal(f.level, 'weak');
  });

  test('learning until 7 check-ins', () => {
    const s = checkins(() => 3);
    const few = Object.fromEntries(Object.entries(s.days).slice(0, 5));
    assert.equal(F.modelFit({ ...s, days: few }).level, 'learning');
  });
});
