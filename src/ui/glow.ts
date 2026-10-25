/**
 * Living colour backgrounds: which colours glow behind each screen.
 * Pure, so Backdrop.tsx (native) and Backdrop.web.tsx share it.
 *
 * Today is a sky that follows the clock: indigo at night, peach and pink at dawn, blue by day,
 * gold in the late afternoon, pink and purple at dusk. A sun glow travels across the top from
 * left (sunrise) to right (sunset), and a soft moon does the same at night with a few stars.
 * When you've checked in, this morning's mood colour glows low behind the cards.
 * Every other screen glows in its own tab colour. Colours come from the theme only.
 */
import { BACKDROP, C, SYS, VALENCE } from '@/constants/theme';

export type BackdropTone = 'today' | 'journal' | 'urge' | 'sleep' | 'awards' | 'settings' | 'gate' | 'none';
export type BackgroundStyle = 'living' | 'midnight' | 'black';

export interface Light {
  /** Centre, in percent of the screen width / height. */
  x: number;
  y: number;
  /** Diameter in percent of the screen width. */
  size: number;
  color: string;
  alpha: number;
}

export interface Glow {
  /** Two sky glows (top left, top right) and a low middle glow. */
  colors: [string, string, string];
  alpha: [number, number, number];
  /** The sun or moon, Today only. */
  light?: Light;
  /** Twinkling stars (Sleep, and Today at night). */
  stars: boolean;
}

type Stop = { h: number; colors: [string, string]; alpha: [number, number] };

/** The sky by hour of the day. Phnom Penh: sunrise ~06:00, sunset ~18:00 all year. */
const SKY: Stop[] = [
  { h: 0, colors: [SYS.indigo, SYS.blue], alpha: [0.42, 0.26] },
  { h: 5, colors: [SYS.indigo, SYS.purple], alpha: [0.42, 0.26] },
  { h: 6.2, colors: [SYS.orange, SYS.pink], alpha: [0.56, 0.42] }, // dawn
  { h: 7.6, colors: [SYS.blue, SYS.orange], alpha: [0.44, 0.3] },
  { h: 9, colors: [SYS.blue, SYS.cyan], alpha: [0.5, 0.32] }, // day
  { h: 15.5, colors: [SYS.blue, SYS.cyan], alpha: [0.48, 0.3] },
  { h: 17, colors: [SYS.orange, C.tint], alpha: [0.56, 0.36] }, // golden hour
  { h: 18.3, colors: [SYS.pink, SYS.purple], alpha: [0.54, 0.46] }, // dusk
  { h: 20, colors: [SYS.purple, SYS.indigo], alpha: [0.48, 0.42] },
  { h: 22, colors: [SYS.indigo, SYS.blue], alpha: [0.42, 0.26] }, // night
  { h: 24, colors: [SYS.indigo, SYS.blue], alpha: [0.42, 0.26] },
];

const SUNRISE = 6;
const SUNSET = 18;

const STATIC: Record<Exclude<BackdropTone, 'today' | 'none'>, Glow> = {
  journal: { colors: [SYS.blue, SYS.indigo, SYS.cyan], alpha: [0.46, 0.36, 0.14], stars: false },
  urge: { colors: [SYS.cyan, SYS.teal, SYS.blue], alpha: [0.42, 0.34, 0.16], stars: false },
  sleep: { colors: [SYS.indigo, SYS.purple, SYS.blue], alpha: [0.46, 0.34, 0.16], stars: true },
  awards: { colors: [C.tint, SYS.orange, SYS.pink], alpha: [0.4, 0.34, 0.12], stars: false },
  settings: { colors: [SYS.indigo, SYS.gray, SYS.blue], alpha: [0.22, 0.16, 0.08], stars: false },
  gate: { colors: [SYS.green, SYS.mint, SYS.blue], alpha: [0.36, 0.3, 0.14], stars: false },
};

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const hex2 = (v: number) =>
  Math.round(Math.max(0, Math.min(255, v)))
    .toString(16)
    .padStart(2, '0');

/** Mix two hex colours in sRGB. */
export function mixHex(a: string, b: string, t: number): string {
  const A = rgb(a);
  const B = rgb(b);
  return `#${hex2(A[0] + (B[0] - A[0]) * t)}${hex2(A[1] + (B[1] - A[1]) * t)}${hex2(A[2] + (B[2] - A[2]) * t)}`;
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** The sky at a given time: a smooth blend between the two nearest stops. */
export function skyAt(at: Date): Pick<Stop, 'colors' | 'alpha'> {
  const h = at.getHours() + at.getMinutes() / 60;
  let i = 0;
  while (i < SKY.length - 2 && SKY[i + 1].h <= h) i++;
  const a = SKY[i];
  const b = SKY[i + 1];
  const e = smooth(clamp01((h - a.h) / (b.h - a.h)));
  return {
    colors: [mixHex(a.colors[0], b.colors[0], e), mixHex(a.colors[1], b.colors[1], e)],
    alpha: [a.alpha[0] + (b.alpha[0] - a.alpha[0]) * e, a.alpha[1] + (b.alpha[1] - a.alpha[1]) * e],
  };
}

/** The sun by day and the moon by night, travelling left to right across the top. */
export function lightAt(at: Date): Light {
  const h = at.getHours() + at.getMinutes() / 60;
  const day = h >= SUNRISE && h < SUNSET;
  const t = day ? (h - SUNRISE) / (SUNSET - SUNRISE) : ((h - SUNSET + 24) % 24) / (24 - (SUNSET - SUNRISE));
  const arc = Math.sin(Math.PI * clamp01(t));
  const x = 6 + 88 * clamp01(t);
  const y = 15 - 13 * arc; // high at noon / midnight, low near the horizon
  if (day) {
    // near the horizon the sun turns orange and grows
    const low = 1 - smooth(clamp01(arc / 0.45));
    return { x, y, size: 62 + 20 * low, color: mixHex(C.tint, SYS.orange, low), alpha: 0.62 + 0.08 * low };
  }
  return { x, y, size: 44, color: BACKDROP.moon, alpha: 0.26 };
}

/** What glows behind a screen. `valence` (1-7) adds this morning's mood to Today. */
export function glowFor(tone: BackdropTone, at: Date, valence?: number): Glow | null {
  if (tone === 'none') return null;
  if (tone !== 'today') return STATIC[tone];
  const sky = skyAt(at);
  const h = at.getHours();
  const mood = valence && valence >= 1 && valence <= 7 ? VALENCE[Math.round(valence) - 1].color : undefined;
  return {
    colors: [sky.colors[0], sky.colors[1], mood ?? sky.colors[0]],
    alpha: [sky.alpha[0], sky.alpha[1], mood ? 0.2 : sky.alpha[0] * 0.35],
    light: lightAt(at),
    stars: h >= 21 || h < 5,
  };
}

/** Midnight: one calm navy wash for every screen. */
export const MIDNIGHT = BACKDROP.midnight;
