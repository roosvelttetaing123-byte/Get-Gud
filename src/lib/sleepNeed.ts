/**
 * Learned sleep need. Pure functions, no React, no storage.
 *
 * On free days (your rest days, or Saturday and Sunday if you haven't set any) you sleep
 * until you're done, so free-day sleep shows your need. But after a short week you also
 * sleep extra to pay back debt (rebound), so free-day sleep alone overstates it.
 * We fit both at once, the way the chronotype research corrects free-day sleep:
 *
 *   free-day sleep = need + rebound x debt going into that night + noise
 *
 * as a small Bayesian regression. Priors: need ~ 8 h +/- 0.75 (population median, Rise's
 * 1.95M users; lab estimates 8.2-8.4 h), rebound ~ 0.10 h per hour of debt +/- 0.05
 * (extended-sleep studies, Kitamura 2016), night-to-night noise 0.8 h. The prior holds the
 * answer back while free nights are few, and the app suggests nothing before 5 of them.
 * Rest days are picked by the calendar, never by how long you slept, so long nights
 * can't select themselves and inflate the answer.
 */
import { DEFAULT_NEED, debtOver, isNap, nights, type Night } from './sleep';
import type { Settings, SleepLog } from './types';

const H = 3_600_000;

const PRIOR_NEED = { mean: 8, sd: 0.75 };
const PRIOR_REBOUND = { mean: 0.1, sd: 0.05 };
const NOISE = 0.8; // h
const LOOKBACK_DAYS = 180;
/** Free nights before the app suggests a learned need. */
export const NEED_MIN_NIGHTS = 5;
const NEED_RANGE: [number, number] = [6, 10]; // matches the Sleep need stepper

export interface FreeNight {
  key: string; // wake day
  wake: number; // ms
  hours: number; // sleep that wake-day, naps included
}

export interface NeedEstimate {
  need: number; // hours, posterior mean, within the stepper's range
  sd: number; // hours, posterior standard deviation
  rebound: number; // extra hours slept per hour of debt
  nights: number; // free nights used
  learned: boolean; // enough free nights to suggest it
}

/** Weekdays (0 = Sun) that count as free. */
export const freeDays = (s: Pick<Settings, 'restDays'>) => (s.restDays?.length ? s.restDays : [0, 6]);

/** Main sleeps that ended on a free day in the last 180 days, one per day, 4-14 h. */
export function freeNights(logs: SleepLog[], settings: Pick<Settings, 'restDays'>, now = Date.now()): FreeNight[] {
  const days = freeDays(settings);
  const seen = new Set<string>();
  const out: FreeNight[] = [];
  for (const l of logs) {
    if (isNap(l) || l.wake > now || now - l.wake > LOOKBACK_DAYS * 24 * H) continue;
    if (!days.includes(new Date(l.wake).getDay())) continue;
    const night = nights(logs, l.wake, 1)[0];
    if (seen.has(night.key)) continue;
    seen.add(night.key);
    if (night.hours < 4 || night.hours > 14) continue;
    out.push({ key: night.key, wake: l.wake, hours: night.hours });
  }
  return out;
}

/** The 14 nights before the one that ended at `wake` (index 0 = the night before). */
function windowBefore(logs: SleepLog[], wake: number): Night[] {
  const prev = new Date(wake);
  prev.setDate(prev.getDate() - 1);
  prev.setHours(12, 0, 0, 0);
  const cut = prev.getTime();
  return nights(
    logs.filter((l) => l.wake <= cut),
    cut,
  ).reverse();
}

const GRID_STEP = 0.05; // h

/**
 * Your sleep need from free-day sleep, corrected for rebound. Falls back to the 8 h prior.
 * Debt itself depends on need (a 1 h higher need adds about 14 h of debt), so need and
 * rebound are fitted together: every need from 6 to 10 h is tried with the debts it implies
 * and rebound at its best value for that need, and the posterior is read off that grid.
 */
export function learnNeed(logs: SleepLog[], settings: Pick<Settings, 'restDays'>, now = Date.now()): NeedEstimate {
  const free = freeNights(logs, settings, now);
  if (!free.length) {
    return { need: PRIOR_NEED.mean, sd: PRIOR_NEED.sd, rebound: PRIOR_REBOUND.mean, nights: 0, learned: false };
  }
  const windows = free.map((f) => windowBefore(logs, f.wake));
  const pn = 1 / PRIOR_NEED.sd ** 2;
  const pr = 1 / PRIOR_REBOUND.sd ** 2;
  const w = 1 / NOISE ** 2;
  const grid: { need: number; lp: number; rebound: number }[] = [];
  for (let need = NEED_RANGE[0]; need <= NEED_RANGE[1] + 1e-9; need += GRID_STEP) {
    const debts = windows.map((ns) => debtOver(ns, need).hours);
    let dd = 0;
    let dy = 0;
    free.forEach((f, i) => {
      dd += debts[i] ** 2;
      dy += debts[i] * (f.hours - need);
    });
    const rebound = (pr * PRIOR_REBOUND.mean + w * dy) / (pr + w * dd);
    let rss = 0;
    free.forEach((f, i) => {
      rss += (f.hours - need - rebound * debts[i]) ** 2;
    });
    const lp = -0.5 * (pn * (need - PRIOR_NEED.mean) ** 2 + pr * (rebound - PRIOR_REBOUND.mean) ** 2 + w * rss);
    grid.push({ need, lp, rebound });
  }
  const top = Math.max(...grid.map((g) => g.lp));
  const ps = grid.map((g) => Math.exp(g.lp - top));
  const z = ps.reduce((a, b) => a + b, 0);
  const mean = grid.reduce((a, g, i) => a + g.need * ps[i], 0) / z;
  const sd = Math.sqrt(grid.reduce((a, g, i) => a + (g.need - mean) ** 2 * ps[i], 0) / z);
  const nearest = grid.reduce((a, g) => (Math.abs(g.need - mean) < Math.abs(a.need - mean) ? g : a));
  return { need: mean, sd, rebound: nearest.rebound, nights: free.length, learned: free.length >= NEED_MIN_NIGHTS };
}

/** A new need worth offering (rounded to the stepper's 15 min), or undefined. */
export function needSuggestion(est: NeedEstimate, current: number = DEFAULT_NEED): number | undefined {
  if (!est.learned || est.sd > 0.5) return undefined;
  const r = Math.round(est.need * 4) / 4;
  return Math.abs(r - current) >= 0.25 ? r : undefined;
}
