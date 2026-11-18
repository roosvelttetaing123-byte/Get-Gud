/**
 * Account tests: prop-firm limits from logged R. Run with `npm run test:engine`.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, test } from 'node:test';

const require = createRequire(import.meta.url);
const dir = process.env.ENGINE_DIR;
if (!dir) throw new Error('Set ENGINE_DIR to the compiled engine (see scripts/test-engine.sh).');
const A = require(`${dir}/account.js`);

const at = (daysAgo, h = 10) => new Date(2026, 5, 17 - daysAgo, h).getTime();
const NOW = at(0, 15);
let n = 0;
const trade = (daysAgo, r, extra = {}) => ({
  id: `t${n++}`,
  ts: at(daysAgo),
  emotions: ['Calm'],
  verdict: 'clear',
  reasons: [],
  taken: true,
  overridden: false,
  result: r > 0 ? 'win' : r < 0 ? 'loss' : 'be',
  r,
  closedTs: at(daysAgo, 11),
  ...extra,
});
const state = (trades, over = {}) => ({
  settings: { accountSize: 100000, riskPct: 1, dailyLossPct: 5, maxLossPct: 10, targetPct: 10, minDays: 4, accountStart: '', ...over },
  trades,
});

describe('accountStatus', () => {
  test('counts % from R and risk, half size counts half', () => {
    const s = state([trade(2, 2), trade(1, -1), trade(0, -1, { size: 0.5 }), trade(0, 2, { plan: 'Half size' })]);
    const a = A.accountStatus(s, NOW);
    assert.equal(a.totalPct, 1.5);
    assert.equal(a.todayPct, 0.5);
    assert.equal(a.dailyRoom, 5.5);
    assert.equal(a.maxRoom, 11.5);
    assert.equal(a.tradingDays, 3);
    assert.equal(a.lossesLeft, 5);
    assert.equal(a.blocked, null);
  });

  test('blocks when one more loss would break the daily limit', () => {
    const a = A.accountStatus(state([trade(0, -1), trade(0, -1), trade(0, -1), trade(0, -1), trade(0, -0.5)]), NOW);
    assert.equal(a.dailyRoom, 0.5);
    assert.equal(a.lossesLeft, 0);
    assert.match(a.blocked, /daily loss limit/);
  });

  test('max loss reached ends the account', () => {
    const ts = Array.from({ length: 10 }, (_, i) => trade(i + 1, -1));
    const a = A.accountStatus(state(ts), NOW);
    assert.equal(a.maxRoom, 0);
    assert.match(a.blocked, /Max loss/);
    assert.equal(a.objectives.find((o) => o.key === 'max').done, true);
  });

  test('accountStart ignores older trades; walked-away and open trades cost nothing', () => {
    const start = new Date(at(1));
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const s = state([trade(5, -3), trade(1, 1), trade(0, 0, { taken: false, result: undefined }), trade(0, 0, { result: undefined })], { accountStart: key });
    const a = A.accountStatus(s, NOW);
    assert.equal(a.totalPct, 1);
    assert.equal(a.tradingDays, 2);
  });

  test('a limit set to 0 is off', () => {
    const a = A.accountStatus(state([trade(0, -1)], { dailyLossPct: 0, maxLossPct: 0 }), NOW);
    assert.equal(a.dailyRoom, Infinity);
    assert.equal(a.lossesLeft, Infinity);
    assert.equal(a.blocked, null);
    assert.deepEqual(a.objectives.map((o) => o.key), ['target', 'days']);
  });
});

describe('performance', () => {
  test('profit factor, expectancy and drawdown in R', () => {
    const p = A.performance([trade(4, 2), trade(3, -1), trade(2, -1), trade(1, 3)]);
    assert.equal(p.closed, 4);
    assert.equal(p.winRate, 0.5);
    assert.equal(p.avgWin, 2.5);
    assert.equal(p.avgLoss, -1);
    assert.equal(p.profitFactor, 2.5);
    assert.equal(p.expectancy, 0.75);
    assert.equal(p.maxDrawdown, -2);
    assert.deepEqual(p.curve.map((c) => c.r), [0, 2, 1, 0, 3]);
  });
});

describe('format', () => {
  test('percent and money', () => {
    assert.equal(A.fmtPct(4.25), '+4.3%');
    assert.equal(A.fmtPct(-1), '−1%');
    assert.equal(A.fmtPct(5, false), '5%');
    assert.equal(A.fmtMoney(100000, 1.25), '$1,250');
    assert.equal(A.fmtMoney(100000, -2, true), '−$2,000');
  });
});
