/**
 * Medals screen model: which medals are earned, when, how close the locked ones are,
 * and which one to put in the hero. Pure functions of the store state.
 */
import { C, SYS } from '@/constants/theme';
import { engraveDate } from '@/features/medal3d/specs';
import type { MedalBack } from '@/features/medal3d/types';
import { AWARDS, streak, type Award } from '@/lib/engage';
import type { State } from '@/lib/store';

export interface MedalView {
  award: Award;
  earned: boolean;
  /** When it was stamped (ms). Missing for a medal met this instant but not stamped yet. */
  at?: number;
  /** 0..1 for locked medals that track progress. */
  progress?: number;
}

export const SECTIONS: { title: string; ids: string[] }[] = [
  { title: 'Discipline', ids: ['walked-away', 'ring-trophy', 'perfect-day', 'urge-surfer'] },
  { title: 'Streaks', ids: ['streak-3', 'streak-7', 'streak-21', 'streak-66', 'streak-100'] },
];

const STREAK_IDS = SECTIONS[1].ids;

export function medalViews(s: State): MedalView[] {
  return AWARDS.map((a) => {
    const at = s.awards[a.id];
    const earned = !!at || a.earned(s);
    return { award: a, earned, at, progress: earned ? 1 : a.progress?.(s) };
  });
}

/** The most recently earned medal. */
export function latestEarned(views: MedalView[]): MedalView | undefined {
  const earned = views.filter((v) => v.earned);
  if (!earned.length) return undefined;
  return earned.reduce((best, v) => ((v.at ?? Infinity) > (best.at ?? Infinity) ? v : best), earned[0]);
}

/** The locked medal he's closest to. With no progress anywhere, the first streak medal. */
export function nextUp(views: MedalView[]): MedalView | undefined {
  const locked = views.filter((v) => !v.earned);
  if (!locked.length) return undefined;
  const best = locked.reduce((b, v) => ((v.progress ?? 0) > (b.progress ?? 0) ? v : b), locked[0]);
  if ((best.progress ?? 0) > 0) return best;
  return locked.find((v) => STREAK_IDS.includes(v.award.id)) ?? best;
}

export interface StreakInfo {
  days: number;
  freezes: number;
  /** The next streak medal to earn, if any are left. */
  next?: { view: MedalView; target: number; left: number; progress: number };
}

export function streakInfo(s: State, views: MedalView[], now: Date): StreakInfo {
  const days = streak(s, now);
  const nextView = views.find((v) => STREAK_IDS.includes(v.award.id) && !v.earned);
  const target = nextView ? Number(nextView.award.id.replace('streak-', '')) : 0;
  return {
    days,
    freezes: s.settings.freezes,
    next: nextView
      ? { view: nextView, target, left: Math.max(1, target - days), progress: Math.min(1, days / target) }
      : undefined,
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "24 Oct", or "24 Oct 2025" outside the current year. */
export function shortDate(ts: number, now: Date): string {
  const d = new Date(ts);
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export const earnedLine = (v: MedalView, now: Date) => (v.at ? `Earned ${shortDate(v.at, now)}` : 'Earned today');

export const pct = (p: number) => `${Math.floor(Math.max(0, Math.min(1, p)) * 100)}%`;

/** Progress words for a locked medal. "0% there" reads as failure, so invite the first step instead. */
export function lockedLine(v: MedalView): string {
  const p = v.progress;
  if (p === undefined) return 'Not earned yet';
  if (p > 0) return `${pct(p)} there`;
  return v.award.id.startsWith('streak-') ? 'Starts today' : 'Not started yet';
}

/** What the back of the 3D medal says: title and the date earned, or the progress of a locked one. */
export function backOf(v: MedalView, now: Date): MedalBack {
  if (v.earned) return { title: v.award.title, line: engraveDate(v.at ?? now.getTime()) };
  return { title: v.award.title, line: lockedLine(v), progress: v.progress };
}

/** Each medal's dominant colour, so its light matches it. */
const GLOW: Record<string, string> = {
  'streak-3': SYS.orange,
  'streak-7': SYS.blue,
  'streak-21': SYS.green,
  'streak-66': SYS.purple,
  'streak-100': SYS.cyan,
  'walked-away': SYS.mint,
  'perfect-day': C.tint,
  'urge-surfer': SYS.indigo,
  'ring-trophy': SYS.green,
};

export const glowOf = (id: string) => GLOW[id] ?? C.tint;
