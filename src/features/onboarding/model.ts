/**
 * First-run setup: suggested promises, icon/colour picks for rows and chips,
 * and the two if-then ritual cues (stored in their own small kv key).
 */
import {
  BedDouble,
  BookOpen,
  Briefcase,
  Dumbbell,
  Hand,
  ListChecks,
  Map as MapIcon,
  Droplets,
  Newspaper,
  Percent,
  PhoneOff,
  ShieldCheck,
  Target,
  type LucideIcon,
} from 'lucide-react-native';

import { C, SYS } from '@/constants/theme';
import { kv } from '@/lib/kv';

export const MAX_PROMISES = 5;

export const SUGGESTED_PROMISES = [
  'Gym or a 30-minute walk',
  'At work on time',
  'Study 1 hour',
  'Phone away by 23:30',
  'Sleep 7 hours',
  'No trading after 2 losses',
  'Read 20 pages',
];

const firstWords = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(' ');

/** Current promises first, then suggestions that aren't near-duplicates of them. */
export function promiseOptions(current: string[]): string[] {
  const seen = new Set(current.map(firstWords));
  return [...current, ...SUGGESTED_PROMISES.filter((p) => !current.includes(p) && !seen.has(firstWords(p)))];
}

/** Icon and colour for a promise, from its words. */
export function promiseLook(text: string): { icon: LucideIcon; color: string } {
  const t = text.toLowerCase();
  if (/trad|loss/.test(t)) return { icon: Hand, color: SYS.orange };
  if (/gym|walk|run|lift|train/.test(t)) return { icon: Dumbbell, color: SYS.green };
  if (/work|office|on time/.test(t)) return { icon: Briefcase, color: SYS.blue };
  if (/read|page|book/.test(t)) return { icon: BookOpen, color: SYS.yellow };
  if (/study|learn|course/.test(t)) return { icon: BookOpen, color: SYS.indigo };
  if (/phone|scroll|screen/.test(t)) return { icon: PhoneOff, color: SYS.purple };
  if (/sleep|bed/.test(t)) return { icon: BedDouble, color: SYS.cyan };
  return { icon: Target, color: C.tint };
}

/** Icon and colour for a gate rule, from its words. */
export function ruleLook(text: string): { icon: LucideIcon; color: string } {
  const t = text.toLowerCase();
  if (/liquidity|sweep/.test(t)) return { icon: Droplets, color: SYS.cyan };
  if (/stop/.test(t)) return { icon: ShieldCheck, color: SYS.orange };
  if (/risk|%/.test(t)) return { icon: Percent, color: SYS.green };
  if (/news/.test(t)) return { icon: Newspaper, color: SYS.purple };
  if (/plan|zone|setup/.test(t)) return { icon: MapIcon, color: SYS.blue };
  return { icon: ListChecks, color: SYS.indigo };
}

/* ---------- ritual cues (implementation intentions) ---------- */

export interface Rituals {
  morning: string;
  evening: string;
}

const RITUALS_KEY = 'getgud:rituals';

export const DEFAULT_RITUALS: Rituals = {
  morning: 'After my morning coffee',
  evening: 'When I shut the laptop',
};

export function loadRituals(): Rituals {
  try {
    const raw = kv.get(RITUALS_KEY);
    if (!raw) return { ...DEFAULT_RITUALS };
    const r = JSON.parse(raw) as Partial<Rituals>;
    return { morning: r.morning || DEFAULT_RITUALS.morning, evening: r.evening || DEFAULT_RITUALS.evening };
  } catch {
    return { ...DEFAULT_RITUALS };
  }
}

export function saveRituals(r: Rituals) {
  try {
    kv.set(
      RITUALS_KEY,
      JSON.stringify({
        morning: r.morning.trim() || DEFAULT_RITUALS.morning,
        evening: r.evening.trim() || DEFAULT_RITUALS.evening,
      }),
    );
  } catch {
    // storage failure is not worth interrupting setup for
  }
}
