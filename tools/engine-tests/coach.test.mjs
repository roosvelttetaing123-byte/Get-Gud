/**
 * Coach tests: the rough-night plan and learned insights. Run with `npm run test:engine`.
 * The bar: no claim without enough data, never blame, at most three moves on a rough day.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, test } from 'node:test';

const require = createRequire(import.meta.url);
const dir = process.env.ENGINE_DIR;
if (!dir) throw new Error('Set ENGINE_DIR to the compiled engine (see scripts/test-engine.sh).');
const C = require(`${dir}/coach.js`);

const H = 3_600_000;
// A Wednesday in June, away from daylight-saving changes in every test zone.
const Y = 2026;
const MO = 5;
const D = 17;
const at = (daysAgo, h, m = 0) => new Date(Y, MO, D - daysAgo, h, m).getTime();
const key = (daysAgo) => {
  const d = new Date(Y, MO, D - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const MORNING = at(0, 9);
const range = (n) => Array.from({ length: n }, (_, i) => i);

const settings = (over = {}) => ({
  name: 'RV',
  why: '',
  rules: [],
  promises: ['Gym', 'Study 1 hour', 'In bed by 23:30'],
  maxTrades: 3,
  maxLossStreak: 2,
  cooldownMin: 30,
  urgeMinutes: 3,
  freezes: 2,
  restDays: [0, 6],
  sleepNeed: 8,
  wakeGoal: '07:00',
  healthImport: false,
  healthGist: '',
  onboarded: true,
  ...over,
});
const state = (over = {}) => ({
  version: 1,
  trades: [],
  days: {},
  urges: [],
  sleeps: [],
  awards: {},
  seenAwards: [],
  ...over,
  settings: settings(over.settings),
});
/** Main nights of `hours` ending 07:00, for the last `n` mornings (0 = this morning). */
const nights = (n, hours, from = 0) =>
  range(n).map((i) => ({ id: `n${i + from}`, bed: at(i + from, 7) - hours * H, wake: at(i + from, 7), source: 'manual' }));
const trade = (id, daysAgo, h, r, extra = {}) => ({
  id,
  ts: at(daysAgo, h),
  emotions: ['Calm'],
  verdict: 'clear',
  reasons: [],
  taken: true,
  overridden: false,
  result: r > 0.1 ? 'win' : r < -0.1 ? 'loss' : 'be',
  r,
  followedRules: true,
  closedTs: at(daysAgo, h) + H,
  ...extra,
});

const BLAME = /\b(fail|failed|bad|lazy|weak|should have|wrong)\b/i;

describe('rough-night plan', () => {
  test('a short night gives a calm plan with at most three moves', () => {
    const s = state({ sleeps: [...nights(1, 4.5), ...nights(9, 7.5, 1)] });
    const p = C.roughPlan(s, MORNING);
    assert.ok(p, 'expected a plan');
    assert.match(p.title, /Rough night/);
    assert.match(p.because, /4 h 30 m/);
    assert.ok(p.tips.length >= 2 && p.tips.length <= 3);
    assert.ok(p.tips.some((t) => t.icon === 'bed'), 'always ends with tonight');
    for (const line of [p.title, p.lead, ...p.tips.map((t) => t.text)]) assert.doesNotMatch(line, BLAME);
  });

  test('a normal night and a fine morning give no plan', () => {
    const s = state({ sleeps: nights(10, 8), days: { [key(0)]: { promises: {}, checkin: { at: MORNING, energy: 4 } } } });
    assert.equal(C.roughPlan(s, MORNING), null);
  });

  test('a drained morning counts even after enough sleep', () => {
    const s = state({ sleeps: nights(10, 8), days: { [key(0)]: { promises: {}, checkin: { at: MORNING, energy: 2 } } } });
    assert.match(C.roughPlan(s, MORNING).title, /Low battery/);
  });

  test('no trading tip on a rest day', () => {
    const sat = new Date(2026, 5, 20, 9).getTime(); // Saturday
    const logs = range(10).map((i) => ({ id: `s${i}`, bed: sat - i * 24 * H - 2 * H - 4.5 * H, wake: sat - i * 24 * H - 2 * H, source: 'manual' }));
    const p = C.roughPlan(state({ sleeps: logs }), sat);
    assert.ok(p);
    assert.ok(!p.tips.some((t) => t.icon === 'shield'));
  });

  test('a closed day shows no plan', () => {
    const s = state({ sleeps: nights(1, 4.5), days: { [key(0)]: { promises: {}, close: { at: at(0, 21) } } } });
    assert.equal(C.roughPlan(s, at(0, 22)), null);
  });
});

describe('learned insights', () => {
  test('a feeling needs enough trades before it is named', () => {
    const few = state({
      trades: [
        ...range(4).map((i) => trade(`f${i}`, i + 1, 15, -1, { emotions: ['Frustrated'] })),
        ...range(12).map((i) => trade(`c${i}`, i + 1, 20, 1)),
      ],
    });
    assert.ok(!C.learned(few, MORNING).some((i) => i.id === 'feeling-cost'));

    const many = state({
      trades: [
        ...range(8).map((i) => trade(`f${i}`, i + 1, 15, i % 4 === 0 ? 0.5 : -1, { emotions: ['Frustrated'] })),
        ...range(12).map((i) => trade(`c${i}`, i + 1, 20, i % 3 === 0 ? -0.5 : 1)),
      ],
    });
    const f = C.learned(many, MORNING).find((i) => i.id === 'feeling-cost');
    assert.ok(f, 'expected a feeling insight');
    assert.match(f.title, /Frustrated costs you/);
    assert.match(f.evidence, /8 trades/);
  });

  test('urges: finds the busy 3-hour window', () => {
    const urges = [
      ...range(7).map((i) => ({ id: `u${i}`, ts: at(i, 21 + (i % 3)), kind: 'Revenge trade', before: 7, outcome: 'resisted', seconds: 180 })),
      { id: 'x1', ts: at(2, 10), kind: 'Doomscroll', before: 5, outcome: 'gave_in', seconds: 60 },
      { id: 'x2', ts: at(4, 14), kind: 'Doomscroll', before: 5, outcome: 'resisted', seconds: 60 },
    ];
    const u = C.learned(state({ urges }), MORNING).find((i) => i.id === 'urge-time');
    assert.ok(u);
    assert.match(u.body, /7 of your 9 urges came between 21:00 and 00:00/);
    assert.equal(C.urgeWindow(state({ urges })), 21);
  });

  test('hardest promise: only counts days you used the app', () => {
    const days = {};
    range(14).forEach((i) => {
      days[key(i + 1)] = { promises: { Gym: true, 'In bed by 23:30': i % 2 === 0, 'Study 1 hour': i < 3 } };
    });
    const p = C.learned(state({ days }), MORNING).find((i) => i.id === 'hardest-promise');
    assert.ok(p);
    assert.match(p.body, /Study 1 hour.*kept 3 of 14 days/);
  });

  test('no promise insight for someone who checks in but never uses promises', () => {
    const days = {};
    range(20).forEach((i) => {
      days[key(i + 1)] = { promises: {}, checkin: { at: at(i + 1, 8), valence: 5 } };
    });
    const ids = C.learned(state({ days }), MORNING).map((i) => i.id);
    assert.ok(!ids.includes('hardest-promise') && !ids.includes('hardest-weekday'));
  });

  test('sleep and mood: says it is the sleep, with numbers', () => {
    const sleeps = [];
    const days = {};
    range(12).forEach((i) => {
      const short = i % 2 === 0;
      sleeps.push({ id: `m${i}`, bed: at(i, 7) - (short ? 5 : 8) * H, wake: at(i, 7), source: 'manual' });
      days[key(i)] = { promises: {}, checkin: { at: at(i, 8), valence: short ? 3 : 5 } };
    });
    const m = C.learned(state({ sleeps, days }), at(0, 12)).find((i) => i.id === 'sleep-mood');
    assert.ok(m);
    assert.match(m.body, /3\.0 of 7.*5\.0/);
  });
});

describe('today card', () => {
  test('no data: a learning note, not an empty claim', () => {
    const c = C.coach(state(), MORNING);
    assert.equal(c.card.kind, 'learning');
    assert.equal(c.learned.length, 0);
  });

  test('rough plan wins over insights; hiding it clears the card for today', () => {
    const base = { sleeps: [...nights(1, 4.5), ...nights(9, 7.5, 1)] };
    assert.equal(C.coach(state(base), MORNING).card.kind, 'rough');
    const hidden = state({ ...base, days: { [key(0)]: { promises: {}, coachHidden: true } } });
    assert.equal(C.coach(hidden, MORNING).card, null);
  });
});
