/**
 * Week in review tests. Run with `npm run test:engine` (scripts/test-engine.sh), which compiles
 * src/lib's pure engine and runs this file in three time zones (no daylight saving, US rules, EU rules).
 * The bar: the week is always Monday 00:00 to Monday 00:00 local, nothing outside it counts,
 * and the copy rewards process and never blames.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, test } from 'node:test';

const require = createRequire(import.meta.url);
const dir = process.env.ENGINE_DIR;
if (!dir) throw new Error('Set ENGINE_DIR to the compiled engine (see scripts/test-engine.sh).');
const R = require(`${dir}/review.js`);
const C = require(`${dir}/coach.js`);

const H = 3_600_000;
// Monday 15 June 2026 to Sunday 21 June: no daylight-saving change near it in any test zone.
const Y = 2026;
const MO = 5;
const MON = 15;
const at = (day, h = 12, m = 0) => new Date(Y, MO, MON + day, h, m).getTime(); // day 0 = Monday
const key = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const range = (n) => Array.from({ length: n }, (_, i) => i);
const WEEK = R.weekOf(at(2));

const settings = (over = {}) => ({
  name: 'RV',
  why: '',
  rules: [],
  promises: ['Gym', 'Study 1 hour'],
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
  background: 'living',
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
const trade = (id, ts, r, extra = {}) => ({
  id,
  ts,
  emotions: ['Calm'],
  verdict: 'clear',
  reasons: [],
  taken: true,
  overridden: false,
  result: r > 0.1 ? 'win' : r < -0.1 ? 'loss' : 'be',
  r,
  followedRules: true,
  closedTs: ts + H,
  ...extra,
});
const urge = (id, ts, outcome = 'resisted') => ({ id, ts, kind: 'Doomscroll', before: 7, outcome, seconds: 180 });
/** A main night of `hours` ending at 07:00 on the morning of `ts`. */
const night = (id, ts, hours) => {
  const d = new Date(ts);
  const wake = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 7).getTime();
  return { id, bed: wake - hours * H, wake, source: 'manual' };
};

const BLAME = /\b(fail|failed|failure|bad|lazy|weak|should have|wrong|poor|terrible|worst)\b/i;

describe('which week', () => {
  test('Sunday 18:00 opens the week you are finishing; until then it is last week', () => {
    assert.equal(R.latestWeek(at(6, 17, 59)).key, '2026-06-08');
    assert.equal(R.latestWeek(at(6, 18, 0)).key, '2026-06-15');
    assert.equal(R.latestWeek(at(7, 9)).key, '2026-06-15', 'Monday after');
    assert.equal(R.latestWeek(at(8, 23, 59)).key, '2026-06-15', 'Tuesday after');
    assert.equal(R.latestWeek(at(2, 12)).key, '2026-06-08', 'mid-week');
  });

  test('the card shows from Sunday 18:00 through Tuesday', () => {
    assert.equal(R.reviewDue(at(6, 17, 59)), false);
    assert.equal(R.reviewDue(at(6, 18, 0)), true);
    assert.equal(R.reviewDue(at(7, 0, 0)), true);
    assert.equal(R.reviewDue(at(8, 23, 59)), true);
    assert.equal(R.reviewDue(at(9, 0, 0)), false, 'Wednesday');
    assert.equal(R.reviewDue(at(5, 20)), false, 'Saturday evening');
  });

  test('a week is seven calendar days, midnight to midnight, even across daylight saving', () => {
    for (const [mo, d] of [
      [9, 25], // EU fall back (Sunday 25 Oct 2026)
      [10, 1], // US fall back (Sunday 1 Nov 2026)
      [2, 8], // US spring forward (Sunday 8 Mar 2026)
      [2, 29], // EU spring forward (Sunday 29 Mar 2026)
    ]) {
      const sunday = new Date(Y, mo, d, 20).getTime();
      const w = R.weekOf(sunday);
      const start = new Date(w.start);
      const end = new Date(w.end);
      assert.equal(start.getDay(), 1, 'starts on a Monday');
      assert.equal(start.getHours() + start.getMinutes(), 0, 'at midnight');
      assert.equal(end.getDay(), 1, 'ends on the next Monday');
      assert.equal(end.getHours() + end.getMinutes(), 0, 'at midnight');
      assert.ok([167, 168, 169].includes((w.end - w.start) / H), `${(w.end - w.start) / H} h`);
      assert.deepEqual(
        w.days,
        range(7).map((i) => key(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12).getTime())),
      );
      assert.equal(w.days[6], key(sunday));
      assert.equal(R.latestWeek(sunday).key, w.key, 'Sunday evening reviews this week');

      // Sunday 23:30 is in; next Monday 00:30 is not.
      const s = state({
        trades: [
          trade('in', new Date(Y, mo, d, 23, 30).getTime(), 1),
          trade('out', new Date(Y, mo, d + 1, 0, 30).getTime(), 1),
        ],
      });
      assert.equal(R.weekReview(s, w).trading.taken, 1);
    }
  });

  test('labels', () => {
    assert.equal(WEEK.label, '15–21 Jun');
    assert.equal(R.weekOf(new Date(2026, 9, 1, 12).getTime()).label, '28 Sep – 4 Oct');
    assert.equal(WEEK.key, '2026-06-15');
  });
});

describe('what happened', () => {
  test('rituals by day; promises only on days you used the app', () => {
    const s = state({
      days: {
        [key(at(-1))]: { promises: { Gym: true }, checkin: { at: at(-1, 8) } }, // Sunday before: not this week
        [key(at(0))]: { promises: { Gym: true, 'Study 1 hour': false }, checkin: { at: at(0, 8) }, close: { at: at(0, 22) } },
        [key(at(1))]: { promises: { Gym: true, 'Study 1 hour': true }, checkin: { at: at(1, 8) } },
        [key(at(3))]: { promises: {}, close: { at: at(3, 22) } },
      },
    });
    const r = R.weekReview(s, WEEK);
    assert.equal(r.rituals.done, 4);
    assert.equal(r.rituals.checkins, 2);
    assert.equal(r.rituals.closes, 2);
    assert.deepEqual(r.rituals.byDay, [1, 0.5, 0, 0.5, 0, 0, 0]);
    assert.equal(r.promises.days, 3, 'Wednesday and the weekend were silent, not failed');
    assert.equal(r.promises.possible, 6);
    assert.equal(r.promises.kept, 3);
    assert.equal(r.promises.rate, 0.5);
    assert.equal(r.promises.best, 'Gym');
    assert.deepEqual(r.promises.byDay, [0.5, 1, null, 0, null, null, null]);
    assert.equal(r.empty, false);
  });

  test('trading: share by the rules, R and walk-aways, by the day you hit the gate', () => {
    const s = state({
      trades: [
        trade('win', at(0, 15), 2),
        trade('broke', at(0, 20), -1, { followedRules: false }),
        trade('override', at(1, 15), -1, { overridden: true }),
        trade('open', at(2, 15), 0, { result: undefined, r: undefined, followedRules: undefined, closedTs: undefined }),
        { ...trade('walk', at(2, 21), 0), taken: false, result: undefined, r: undefined, verdict: 'stop' },
        trade('sunday-late', at(6, 23, 59), 1),
        trade('before', at(-1, 23, 59), 5),
        trade('after', at(7, 0, 0), 5),
      ],
    });
    const t = R.weekReview(s, WEEK).trading;
    assert.equal(t.taken, 5);
    assert.equal(t.closed, 4);
    assert.equal(t.wins, 2);
    assert.equal(t.netR, 1);
    assert.equal(t.byRules, 3, 'the win, the open trade and Sunday’s');
    assert.equal(t.rate, 0.6);
    assert.equal(t.walkedAway, 1);
    assert.deepEqual(t.byDay, [0.5, 0, 1, null, null, null, 1]);
  });

  test('urges: ridden out against logged', () => {
    const s = state({
      urges: [urge('a', at(0, 21)), urge('b', at(0, 22)), urge('c', at(3, 23), 'gave_in'), urge('d', at(-1, 21))],
    });
    const u = R.weekReview(s, WEEK).urges;
    assert.equal(u.logged, 3);
    assert.equal(u.riddenOut, 2);
    assert.deepEqual(u.byDay, [1, null, null, null, null, null, null]);
  });

  test('sleep: the average main night, naps aside, and which way the debt went', () => {
    const rested = range(21).map((i) => night(`r${i}`, at(-1 - i), 8));
    const short = range(7).map((i) => night(`s${i}`, at(i), 6));
    const nap = { id: 'nap', bed: at(2, 13), wake: at(2, 13, 30), source: 'manual' };
    const up = R.weekReview(state({ sleeps: [nap, ...short, ...rested] }), WEEK).sleep;
    assert.equal(up.nights, 7);
    assert.ok(Math.abs(up.avg - 6) < 1e-9, `avg ${up.avg}`);
    assert.equal(up.debtBefore, 0);
    assert.ok(up.change > 10, `debt up ${up.change}`);
    assert.deepEqual(up.byDay, range(7).map(() => 0.75));

    // A rested week after a short one pays it back.
    const shortBefore = range(14).map((i) => night(`b${i}`, at(-1 - i), 6));
    const restedWeek = range(7).map((i) => night(`w${i}`, at(i), 9));
    const down = R.weekReview(state({ sleeps: [...restedWeek, ...shortBefore] }), WEEK).sleep;
    assert.ok(down.change < -5, `debt down ${down.change}`);
    assert.match(R.reviewSlides(state(), { ...R.weekReview(state(), WEEK), sleep: down }, focus()).find((x) => x.id === 'sleep').line, /down/);

    // Under 3 nights, no claim about debt.
    const few = R.weekReview(state({ sleeps: [night('x', at(1), 7)] }), WEEK).sleep;
    assert.equal(few.change, null);
  });

  test('a week with nothing in it is empty', () => {
    assert.equal(R.weekReview(state(), WEEK).empty, true);
    const r = R.weekReview(state({ urges: [urge('a', at(4, 21))] }), WEEK);
    assert.equal(r.empty, false);
  });
});

const focus = () => ({ title: 'Keep it boring', body: 'Same rituals, same rules.', icon: 'check', area: 'habits', from: 'week' });

describe('slides', () => {
  /** A full, good week. */
  function goodWeek() {
    const days = {};
    range(7).forEach((i) => {
      days[key(at(i))] = { promises: { Gym: true, 'Study 1 hour': i % 2 === 0 }, checkin: { at: at(i, 8) }, close: { at: at(i, 22) } };
    });
    return state({
      days,
      trades: [trade('a', at(0, 15), 2), trade('b', at(1, 15), -1), trade('c', at(2, 15), 1.5), { ...trade('w', at(3, 21), 0), taken: false }],
      urges: [urge('u1', at(1, 22)), urge('u2', at(4, 21))],
      sleeps: range(7).map((i) => night(`n${i}`, at(i), 7.5)),
    });
  }

  /** A rough week: little logged, rules broken, urges given in to, short nights. */
  function roughWeek() {
    return state({
      days: { [key(at(2))]: { promises: { Gym: true }, checkin: { at: at(2, 9) } } },
      trades: range(5).map((i) => trade(`t${i}`, at(i, 21), -1, { followedRules: i === 0 })),
      urges: [urge('u1', at(1, 23), 'gave_in'), urge('u2', at(2, 23), 'gave_in')],
      sleeps: [...range(7).map((i) => night(`n${i}`, at(i), 5)), ...range(14).map((i) => night(`p${i}`, at(-1 - i), 8))],
    });
  }

  test('rituals first, focus last, and only the parts of the week that had something', () => {
    const s = goodWeek();
    const ids = R.reviewSlides(s, R.weekReview(s, WEEK), focus()).map((x) => x.id);
    assert.deepEqual(ids, ['rituals', 'promises', 'trading', 'urges', 'sleep', 'focus']);

    const light = state({ days: { [key(at(1))]: { promises: {}, checkin: { at: at(1, 8) } } } });
    assert.deepEqual(
      R.reviewSlides(light, R.weekReview(light, WEEK), focus()).map((x) => x.id),
      ['rituals', 'focus'],
      'no promises kept, no trades, urges or nights: no slide that says zero',
    );
  });

  test('the numbers on a good week', () => {
    const s = goodWeek();
    const slides = R.reviewSlides(s, R.weekReview(s, WEEK), focus());
    const by = Object.fromEntries(slides.map((x) => [x.id, x]));
    assert.equal(by.rituals.value, 14);
    assert.equal(by.rituals.line, 'Morning and night, nearly every day.');
    assert.equal(by.promises.value, 79); // 11 of 14
    assert.match(by.promises.line, /“Gym” was your steady one/);
    assert.equal(by.trading.value, 100);
    assert.equal(by.trading.caption, 'of trades by your rules');
    assert.equal(by.trading.line, '+2.5R from 3 trades, and you walked away once.');
    assert.equal(by.urges.value, 2);
    assert.equal(by.urges.line, 'You didn’t give in once.');
    assert.equal(by.sleep.unit, 'hm');
    assert.equal(R.fmtHM(by.sleep.value), '7 h 30 m');
  });

  test('copy is kind on any week: no blame, no exclamation marks, no arrows', () => {
    for (const s of [goodWeek(), roughWeek(), state({ days: { [key(at(0))]: { promises: {}, close: { at: at(0, 22) } } } })]) {
      const r = R.weekReview(s, WEEK);
      const slides = R.reviewSlides(s, r, R.weekFocus(s, r, at(7, 9)));
      for (const x of slides) {
        for (const text of [x.kicker, x.caption, x.line]) {
          assert.doesNotMatch(text, BLAME, text);
          assert.doesNotMatch(text, /[!→]/, text);
        }
        assert.match(x.line, /[.]$/, `"${x.line}" is a sentence`);
        assert.match(x.kicker, /^[A-Z]/, 'sentence case');
      }
    }
    const rough = roughWeek();
    const t = R.reviewSlides(rough, R.weekReview(rough, WEEK), focus()).find((x) => x.id === 'trading');
    assert.equal(t.value, 20);
    assert.equal(t.line, '−5R from 5 trades. Rules first next week.');
  });

  test('walk-aways alone still make a trading slide, about the walk-aways', () => {
    const s = state({ trades: [{ ...trade('w', at(2, 21), 0), taken: false }, { ...trade('w2', at(3, 21), 0), taken: false }] });
    const t = R.reviewSlides(s, R.weekReview(s, WEEK), focus()).find((x) => x.id === 'trading');
    assert.equal(t.value, 2);
    assert.equal(t.caption, 'times you walked away');
  });

  test('focus: the coach’s strongest pattern, otherwise a gentle nudge from the week', () => {
    const trades = [
      ...range(8).map((i) => trade(`f${i}`, at(-1 - i, 15), i % 4 === 0 ? 0.5 : -1, { emotions: ['Frustrated'] })),
      ...range(12).map((i) => trade(`c${i}`, at(-1 - i, 20), i % 3 === 0 ? -0.5 : 1)),
    ];
    const s = state({ trades });
    const now = at(7, 9);
    const f = R.weekFocus(s, R.weekReview(s, WEEK), now);
    assert.equal(f.from, 'coach');
    assert.equal(f.title, C.learned(s, now)[0].title);

    const light = state({ days: { [key(at(1))]: { promises: {}, checkin: { at: at(1, 8) } } } });
    const g = R.weekFocus(light, R.weekReview(light, WEEK), now);
    assert.equal(g.from, 'week');
    assert.equal(g.title, 'Check in every morning');
  });

  test('teaser line for the card', () => {
    const s = goodWeek();
    assert.equal(R.teaser(R.weekReview(s, WEEK)), '14 rituals · 79% of promises');
  });
});
