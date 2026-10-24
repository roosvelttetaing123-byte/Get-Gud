/**
 * Model fit: how well the energy curve matches how you say you feel. Pure functions.
 *
 * Two honest checks, both from data you already give:
 *   1. Morning check-ins: the energy you rate (1-5) against the curve's energy at that
 *      moment, as a correlation over your days.
 *   2. The gate: the curve's energy when you named "Tired" against when you didn't.
 * It never tunes the curve to agree with you; it tells you how far to trust it.
 */
import { restAt } from './sleepEdge';
import type { State } from './types';

/** Check-ins with an energy rating before the fit means anything. */
export const FIT_MIN = 7;

export type FitLevel = 'learning' | 'good' | 'fair' | 'weak';

export interface ModelFit {
  days: number; // check-ins with energy where the curve had a value
  r?: number; // correlation, curve vs your rating, once FIT_MIN days
  level: FitLevel;
  tired?: { tired: number; other: number; n: number }; // mean curve energy at the gate
}

function pearson(xs: number[], ys: number[]): number | undefined {
  const n = xs.length;
  if (n < 2) return undefined;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  if (!sxx || !syy) return undefined;
  return sxy / Math.sqrt(sxx * syy);
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function modelFit(s: State): ModelFit {
  const curve: number[] = [];
  const felt: number[] = [];
  for (const day of Object.values(s.days)) {
    const c = day.checkin;
    if (!c || c.energy === undefined || !c.at) continue;
    const e = restAt(s, c.at).energy;
    if (e === undefined) continue;
    curve.push(e);
    felt.push(c.energy);
  }
  const days = curve.length;
  const r = days >= FIT_MIN ? pearson(curve, felt) : undefined;
  const level: FitLevel = r === undefined ? 'learning' : r >= 0.5 ? 'good' : r >= 0.25 ? 'fair' : 'weak';

  const gate = s.trades.map((t) => ({ tired: t.emotions.includes('Tired'), e: restAt(s, t.ts).energy }));
  const t = gate.filter((g) => g.tired && g.e !== undefined).map((g) => g.e!);
  const o = gate.filter((g) => !g.tired && g.e !== undefined).map((g) => g.e!);
  const tired = t.length >= 3 && o.length >= 3 ? { tired: Math.round(mean(t)), other: Math.round(mean(o)), n: t.length } : undefined;

  return { days, r: r === undefined ? undefined : Math.round(r * 100) / 100, level, tired };
}
