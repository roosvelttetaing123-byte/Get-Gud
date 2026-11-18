/**
 * The account, prop-firm style: profit target, daily loss limit, max loss and trading days,
 * worked out from the R you log (no broker connection). A loss of 1R costs `riskPct` of the
 * starting balance; a half-size trade counts half. Pure functions, no React or storage.
 */
import { keyOf } from './sleep';
import type { Settings, State, Trade } from './types';

const round2 = (x: number) => Math.round(x * 100) / 100;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Position size as a fraction of a normal trade. Older half-size trades only said so in the plan. */
export function sizeOf(t: Trade): number {
  if (t.size !== undefined) return t.size;
  return t.plan && /half size/i.test(t.plan) ? 0.5 : 1;
}

/** Account % a closed trade made or lost (0 while it's still open). */
export const pctOf = (t: Trade, riskPct: number) => (t.taken && t.result ? (t.r ?? 0) * sizeOf(t) * riskPct : 0);

/** Taken trades on this account (since accountStart), oldest first. */
export function accountTrades(s: State): Trade[] {
  const start = s.settings.accountStart;
  return s.trades.filter((t) => t.taken && (!start || keyOf(t.ts) >= start)).sort((a, b) => a.ts - b.ts);
}

export interface Objective {
  key: 'target' | 'daily' | 'max' | 'days';
  label: string;
  /** 0..1: how far along (target, days) or how much of the limit is used (daily, max). */
  used: number;
  /** "+4.2% of 10%", "3% left", "2 of 4 days". */
  detail: string;
  /** Target and days: reached. Limits: breached. */
  done: boolean;
}

export interface AccountStatus {
  /** False until an account size is set. */
  set: boolean;
  size: number;
  /** % since the start, closed trades only. */
  totalPct: number;
  todayPct: number;
  /** % you can still lose today, and in total, before a limit. Infinity when that limit is off. */
  dailyRoom: number;
  maxRoom: number;
  /** % open trades could still lose (their full risk). */
  openRisk: number;
  /** Full-size losses that still fit inside the tighter limit, after open risk (Infinity when both are off). */
  lossesLeft: number;
  tradingDays: number;
  objectives: Objective[];
  /** A limit is gone, or one more full loss would break it: the gate stops. */
  blocked: string | null;
}

export function accountStatus(s: State, now = Date.now()): AccountStatus {
  const st: Settings = s.settings;
  const risk = Math.max(0, st.riskPct || 0);
  const trades = accountTrades(s);
  // The firm's trading day: it starts at `dayResetHour` local time (00:00 CE(S)T is 05:00/06:00
  // in Phnom Penh), so a loss at 02:00 still counts against the day that began yesterday.
  const today = tradingDay(now, st.dayResetHour);
  const totalPct = round2(trades.reduce((a, t) => a + pctOf(t, risk), 0));
  const todayPct = round2(
    trades.filter((t) => tradingDay(closedOrTs(t), st.dayResetHour) === today).reduce((a, t) => a + pctOf(t, risk), 0),
  );
  // Daily room follows the day's result, like a limit set from the day's opening balance.
  const dailyRoom = st.dailyLossPct > 0 ? Math.max(0, round2(st.dailyLossPct + todayPct)) : Infinity;
  const maxRoom = st.maxLossPct > 0 ? Math.max(0, round2(st.maxLossPct + totalPct)) : Infinity;
  // A trade still open can still lose its full risk: it already uses up room.
  const openRisk = round2(trades.filter((t) => !t.result).reduce((a, t) => a + sizeOf(t) * risk, 0));
  const room = Math.max(0, round2(Math.min(dailyRoom, maxRoom) - openRisk));
  const lossesLeft = risk > 0 && Number.isFinite(room) ? Math.floor(room / risk + 1e-9) : Infinity;
  const tradingDays = new Set(trades.map((t) => keyOf(t.ts))).size;

  const objectives: Objective[] = [];
  if (st.targetPct > 0)
    objectives.push({
      key: 'target',
      label: 'Profit target',
      used: clamp01(totalPct / st.targetPct),
      detail: `${fmtPct(totalPct)} of ${fmtPct(st.targetPct, false)}`,
      done: totalPct >= st.targetPct,
    });
  if (st.dailyLossPct > 0)
    objectives.push({
      key: 'daily',
      label: `Daily loss ${fmtPct(st.dailyLossPct, false)}`,
      used: clamp01(1 - dailyRoom / st.dailyLossPct),
      detail: `${fmtPct(dailyRoom, false)} left`,
      done: dailyRoom <= 0,
    });
  if (st.maxLossPct > 0)
    objectives.push({
      key: 'max',
      label: `Max loss ${fmtPct(st.maxLossPct, false)}`,
      used: clamp01(1 - maxRoom / st.maxLossPct),
      detail: `${fmtPct(maxRoom, false)} above the floor`,
      done: maxRoom <= 0,
    });
  if (st.minDays > 0)
    objectives.push({
      key: 'days',
      label: 'Trading days',
      used: clamp01(tradingDays / st.minDays),
      detail: `${Math.min(tradingDays, st.minDays)} of ${st.minDays} days`,
      done: tradingDays >= st.minDays,
    });

  let blocked: string | null = null;
  if (maxRoom <= 0) blocked = 'Max loss reached. This account is done.';
  else if (dailyRoom <= 0) blocked = 'Daily loss limit reached. Done for today.';
  else if (risk > 0 && room < risk)
    blocked = openRisk
      ? `Your open ${openRisk === risk ? 'trade' : 'trades'} could still use the room left. Close first.`
      : `Only ${fmtPct(room, false)} left before your ${dailyRoom <= maxRoom ? 'daily' : 'max'} loss limit. One more loss breaks it.`;

  return { set: st.accountSize > 0, size: st.accountSize, totalPct, todayPct, dailyRoom, maxRoom, openRisk, lossesLeft, tradingDays, objectives, blocked };
}

const closedOrTs = (t: Trade) => t.closedTs ?? t.ts;

/** The dayKey of the firm's trading day `ts` falls in, when days start at `resetHour` local time. */
export function tradingDay(ts: number, resetHour = 0): string {
  const d = new Date(ts);
  if (d.getHours() < resetHour) d.setDate(d.getDate() - 1);
  return keyOf(d.getTime());
}

/* ---------- performance (prop-firm style statistics, in R) ----------
 * R as logged (the same R the Journal's chart and lenses use). The curve also carries `u`, the
 * running total weighted by position size, so a balance (u × risk %) matches the account. */

export interface Performance {
  closed: number;
  winRate: number;
  avgWin: number; // R
  avgLoss: number; // R, negative
  /** Gross wins / gross losses; Infinity with no losses, 0 with no wins. */
  profitFactor: number;
  expectancy: number; // R per trade
  /** After each closed trade, oldest first, from a 0 start: cumulative R, and size-weighted R. */
  curve: { ts: number; r: number; u: number }[];
  /** Largest fall from a high in the curve, in R (0 or negative). */
  maxDrawdown: number;
}

export function performance(trades: Trade[]): Performance {
  const closed = trades.filter((t) => t.taken && t.result).sort((a, b) => (a.closedTs ?? a.ts) - (b.closedTs ?? b.ts));
  const rs = closed.map((t) => t.r ?? 0);
  const wins = rs.filter((r) => r > 0);
  const losses = rs.filter((r) => r < 0);
  const gw = wins.reduce((a, r) => a + r, 0);
  const gl = -losses.reduce((a, r) => a + r, 0);
  const curve: { ts: number; r: number; u: number }[] = [{ ts: closed[0]?.ts ?? 0, r: 0, u: 0 }];
  let cum = 0;
  let units = 0;
  let peak = 0;
  let dd = 0;
  closed.forEach((t, i) => {
    cum += rs[i];
    units += rs[i] * sizeOf(t);
    peak = Math.max(peak, cum);
    dd = Math.min(dd, cum - peak);
    curve.push({ ts: t.closedTs ?? t.ts, r: round2(cum), u: round2(units) });
  });
  return {
    closed: closed.length,
    winRate: closed.length ? wins.length / closed.length : 0,
    avgWin: wins.length ? round2(gw / wins.length) : 0,
    avgLoss: losses.length ? round2(-gl / losses.length) : 0,
    profitFactor: gl > 0 ? round2(gw / gl) : gw > 0 ? Infinity : 0,
    expectancy: closed.length ? round2(rs.reduce((a, r) => a + r, 0) / closed.length) : 0,
    curve,
    maxDrawdown: round2(dd),
  };
}

/* ---------- format ---------- */

/** "+4.2%", "−1%", "0.75%"; `sign` false drops the plus. Two decimals at most, trailing zeros dropped. */
export function fmtPct(p: number, sign = true): string {
  const v = Math.round(p * 100) / 100;
  const abs = Math.abs(v);
  const body = String(Number(abs.toFixed(2)));
  return `${v < 0 ? '−' : sign && v > 0 ? '+' : ''}${body}%`;
}

/** Account money for a %, e.g. "$1,250". Whole dollars; the plus sign only when asked. */
export function fmtMoney(size: number, pct: number, sign = false): string {
  const v = Math.round((size * pct) / 100);
  const body = Math.abs(v).toLocaleString('en-US');
  return `${v < 0 ? '−' : sign && v > 0 ? '+' : ''}$${body}`;
}
