/**
 * Body-clock dial maths. Pure, no React.
 *
 * 24 hours around a circle, midnight at the top and clockwise, like the sleep dial in iOS
 * Clock: 06 sits at 3 o'clock, noon at the bottom, 18 at 9 o'clock. Angles are degrees and
 * follow the wall clock, so a daylight-saving day never shifts a label.
 */
import { addDays, clockLabel, energyOn, fmtDur, type Phase, type PhaseId, type Schedule } from '@/lib/sleep';
import type { TradeWindow } from '@/lib/sleepEdge';

const DAY = 86_400_000;

/** Wall-clock minutes from the local midnight that starts `day`'s date to `ts`. */
function wallMinutes(ts: number, day: number): number {
  const a = new Date(day);
  const b = new Date(ts);
  const days = Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / DAY,
  );
  return days * 1440 + b.getHours() * 60 + b.getMinutes() + b.getSeconds() / 60;
}

/** Dial angle of `ts`, unwrapped from the midnight before `day` (01:00 the next day is 375°). */
export const angleFrom = (ts: number, day: number) => wallMinutes(ts, day) / 4;

/** Dial angle of `ts`, 0 to 360. */
export const angleOf = (ts: number) => angleFrom(ts, ts);

/** `a` plus whole turns, as close as possible to `ref`. Keeps a dragged hand from spinning the long way. */
export const nearest = (a: number, ref: number) => a + 360 * Math.round((ref - a) / 360);

/** Finger position to a dial angle, 0 to 360. `c` is the dial's centre in the same units. */
export function pointerAngle(x: number, y: number, c: number): number {
  const deg = (Math.atan2(x - c, c - y) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** Point on a circle of radius `r` around (c, c) at dial angle `deg`. */
export function polar(c: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [c + r * Math.sin(a), c - r * Math.cos(a)];
}

/** SVG arc from `a0` to `a1` (degrees, a1 > a0) on a circle of radius `r`. */
export function arc(c: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = polar(c, r, a0);
  const [x1, y1] = polar(c, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
}

/**
 * The moment in [from, from + 1 day) that sits at `deg` on the dial, to the nearest `step`
 * minutes. Snapping keeps the readout calm while the hand itself follows the finger exactly.
 */
export function timeAt(deg: number, from: number, step = 5): number {
  const min = (Math.round((((deg % 360) + 360) % 360) * 4 / step) * step) % 1440;
  const d = new Date(from);
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, min).getTime();
  return t < from ? addDays(t, 1) : t;
}

/** What each phase is good for, short enough to sit inside the dial. */
export const GOOD_FOR: Record<PhaseId, string> = {
  groggy: 'Daylight, no big calls',
  peak1: 'Hard work, decisions',
  dip: 'Easy tasks, short nap',
  peak2: 'Focus or training',
  winddown: 'Dim lights, no trades',
  melatonin: 'Fall asleep fast',
  sleep: 'Sleep through',
};

export interface Reading {
  t: number;
  id: PhaseId;
  name: string;
  /** "Energy 78%", or when you're up for the sleep arc. */
  level: string;
  /** "Now", "In 3 h 50 m", "2 h ago". */
  rel: string;
  window?: TradeWindow;
}

/** The phase at `t`. Before this morning's wake you're still in last night's sleep. */
export function phaseIdAt(sched: Schedule, t: number): PhaseId {
  return phaseOn(sched, t)?.id ?? 'sleep';
}

function phaseOn(sched: Schedule, t: number): Phase | undefined {
  const ps = sched.phases;
  if (!ps.length || t < ps[0].start) return undefined;
  return ps.find((p) => t >= p.start && t < p.end) ?? ps[ps.length - 1];
}

function relLabel(t: number, now: number): string {
  const min = Math.round((t - now) / 60_000);
  if (Math.abs(min) < 5) return 'Now';
  const span = fmtDur(Math.abs(min) / 60);
  return min > 0 ? `In ${span}` : `${span} ago`;
}

/** Everything the dial's centre says about `t`. */
export function readAt(sched: Schedule, windows: TradeWindow[], t: number, now: number, live: boolean): Reading {
  const phase = phaseOn(sched, t);
  const id = phase?.id ?? 'sleep';
  const e = energyOn(sched, t);
  const sleepEnd = sched.phases.find((p) => p.id === 'sleep')?.end;
  const up = phase ? sleepEnd : sched.wakeAt;
  return {
    t,
    id,
    name: phase?.label ?? 'Sleep',
    level: e !== undefined && id !== 'sleep' ? `Energy ${e}%` : up ? `Up at ${clockLabel(up)}` : '',
    rel: live ? 'Now' : relLabel(t, now),
    window: windows.find((w) => t >= w.start && t < w.end),
  };
}
