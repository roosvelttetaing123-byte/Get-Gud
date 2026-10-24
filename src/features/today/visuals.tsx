/**
 * Small shared visuals for Today (and Settings): promise icons and colours, colour maths,
 * and the mood shape images.
 */
import type { ImageSource } from 'expo-image';
import {
  BedDouble,
  BookOpen,
  Briefcase,
  Droplets,
  Dumbbell,
  Footprints,
  Moon,
  PhoneOff,
  Salad,
  Sun,
  Target,
  type LucideIcon,
} from 'lucide-react-native';

import { SYS } from '@/constants/theme';

/** Pick an icon for a promise from its words. */
export function promiseIcon(text: string): LucideIcon {
  const t = text.toLowerCase();
  if (/gym|lift|train|workout|push|squat/.test(t)) return Dumbbell;
  if (/walk|run|steps|cardio/.test(t)) return Footprints;
  if (/work|office|job|on time/.test(t)) return Briefcase;
  if (/study|read|learn|course|msc|book/.test(t)) return BookOpen;
  if (/bed|sleep|lights/.test(t)) return BedDouble;
  if (/phone|scroll|screen/.test(t)) return PhoneOff;
  if (/water|drink|hydrat/.test(t)) return Droplets;
  if (/eat|meal|food|protein|breakfast/.test(t)) return Salad;
  if (/wake|morning|sun/.test(t)) return Sun;
  if (/night|evening/.test(t)) return Moon;
  return Target;
}

/** iOS Settings style: each row gets its own colour square. */
const PROMISE_COLORS = [SYS.orange, SYS.green, SYS.blue, SYS.indigo, SYS.pink, SYS.teal, SYS.purple, SYS.yellow] as const;
export const promiseColor = (i: number): string => PROMISE_COLORS[i % PROMISE_COLORS.length];


/* ---------- colour maths (derived from theme colours, never new hex values) ---------- */

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mix two hex colours; returns rgba() so it can carry an alpha. */
export function mix(a: string, b: string, t: number, alpha = 1): string {
  const A = rgb(a);
  const B = rgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

/** Colour at position t (0..1) along a list of hex stops. */
export function along(stops: readonly string[], t: number, alpha = 1): string {
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  return mix(stops[i], stops[i + 1], x - i, alpha);
}

/* ---------- mood shapes (Health State of Mind) ---------- */

export const MOOD_IMAGES: ImageSource[] = [
  require('@/assets/3d/mood-1.webp'),
  require('@/assets/3d/mood-2.webp'),
  require('@/assets/3d/mood-3.webp'),
  require('@/assets/3d/mood-4.webp'),
  require('@/assets/3d/mood-5.webp'),
  require('@/assets/3d/mood-6.webp'),
  require('@/assets/3d/mood-7.webp'),
];

export const moodImage = (valence: number): ImageSource => MOOD_IMAGES[Math.max(1, Math.min(7, Math.round(valence))) - 1];
