/**
 * Urge tab: kinds, the intensity ramp, grounding copy and small pure helpers.
 * (Kept here rather than derive.ts because shared files are frozen for this change.)
 */
import { C } from '@/constants/theme';
import type { Urge } from '@/lib/store';

export const URGE_KINDS = [
  'Revenge trade',
  'Overtrade',
  'Move my stop',
  'Take profit early',
  'Doomscroll',
  'Skip the gym',
  'Stay up late',
  'Other',
] as const;

const TRADING_KINDS = new Set<string>(['Revenge trade', 'Overtrade', 'Move my stop', 'Take profit early']);
const LIFE_KINDS = new Set<string>(['Doomscroll', 'Skip the gym', 'Stay up late']);

/** Map a route param (any case) to a known kind, or undefined. */
export function matchKind(param: unknown): string | undefined {
  if (typeof param !== 'string') return undefined;
  const p = param.trim().toLowerCase();
  return URGE_KINDS.find((k) => k.toLowerCase() === p);
}

/** One active surf: what he named, how strong, and the absolute timer window. */
export interface Session {
  kind: string;
  before: number;
  startAt: number;
  endAt: number;
  seed: number; // picks where the grounding lines start
}

/** Quiet line above the bloom, e.g. "Urge to move my stop". */
export function urgeContext(kind: string): string {
  return kind === 'Other' ? 'Sitting with it' : `Urge to ${kind.toLowerCase()}`;
}

/* ---------- intensity 1-10 ---------- */

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 10;

/** One word per band, Faint to Overwhelming. */
export function intensityWord(n: number): string {
  if (n <= 2) return 'Faint';
  if (n <= 4) return 'Mild';
  if (n <= 6) return 'Strong';
  if (n <= 8) return 'Intense';
  return 'Overwhelming';
}

/** The ramp: green at the bottom, through yellow and orange, to red at the top. t is 0..1. */
const RAMP: { at: number; hex: string }[] = [
  { at: 0, hex: C.green },
  { at: 0.5, hex: C.yellow },
  { at: 0.75, hex: C.orange },
  { at: 1, hex: C.red },
];

const rgb = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export function rampColor(t: number, alpha = 1): string {
  const x = Math.min(1, Math.max(0, t));
  let i = 0;
  while (i < RAMP.length - 2 && x > RAMP[i + 1].at) i++;
  const a = RAMP[i];
  const b = RAMP[i + 1];
  const k = (x - a.at) / (b.at - a.at);
  const A = rgb(a.hex);
  const B = rgb(b.hex);
  const c = A.map((v, j) => Math.round(v + (B[j] - v) * k));
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

/** Colour of a level 1-10 on the ramp. */
export const intensityColor = (n: number, alpha = 1) => rampColor((n - MIN_LEVEL) / (MAX_LEVEL - MIN_LEVEL), alpha);

/**
 * Gradient stops for a vertical track that fills from the bottom, top first.
 * Level 1 fills the bottom tenth, so the ramp starts there and the colour at the
 * top edge of the fill always matches intensityColor(level).
 */
export const TRACK_GRADIENT = (() => {
  const toY = (t: number) => 1 - (0.1 + 0.9 * t); // ramp t -> distance from the top
  const stops = [...RAMP].reverse().map((s) => ({ color: s.hex, y: Math.round(toY(s.at) * 1000) / 1000 }));
  const colors: [string, string, ...string[]] = [stops[0].color, stops[1].color, ...stops.slice(2).map((s) => s.color), C.green];
  const locations: [number, number, ...number[]] = [stops[0].y, stops[1].y, ...stops.slice(2).map((s) => s.y), 1];
  return { colors, locations };
})();

/** One line under the before/after comparison. */
export function changeLine(before: number, after: number): string {
  const d = before - after;
  if (d >= 3) return `Down ${d}. That's the wave passing.`;
  if (d > 0) return `Down ${d}. It's already easing.`;
  if (d === 0) return 'Same as before. You still sat with it.';
  return `Up ${-d}. Urges can spike before they fade.`;
}

/* ---------- grounding lines ---------- */

/** A new line every two breaths, so it changes as an inhale begins. */
export const LINE_MS = 24_000;

const OPENERS: Record<string, string> = {
  'Revenge trade': 'The last trade is closed. This one would only be about the last one.',
  Overtrade: 'Boredom is not a setup. Wait for the one you planned.',
  'Move my stop': 'You set that stop with a clear head. Trust that version of you.',
  'Take profit early': 'You picked that target with a clear head. Let the plan do its job.',
  Doomscroll: 'Put the phone face down. Nothing in there needs you right now.',
  'Skip the gym': "You don't have to want to go. You just have to start.",
  'Stay up late': "Tomorrow's session starts with tonight's sleep.",
};

const SHARED = [
  'Notice where you feel it. It will peak and pass.',
  'This feeling is a wave. It rises, peaks and passes.',
  "You don't have to act on a thought to let it exist.",
  'Name five things you can see.',
  'Your future self is watching this decision.',
  'Unclench your jaw. Drop your shoulders.',
  'An urge is a request, not an order.',
  'Every urge you sit through gets a little weaker.',
];

const TRADING = [
  'The market will be there tomorrow. Your account might not be.',
  'What would you tell a trader you were coaching right now?',
  'Losses are part of the plan. Revenge is not.',
  'Doing nothing is a position too.',
  'Protecting the account is the job. The next setup can wait.',
];

const LIFE = [
  'Shoes on is enough for now. Start small.',
  'The scroll never ends. You get to.',
  'Tired you makes worse trades tomorrow.',
  'What would the person you are rebuilding do next?',
];

function interleave(a: string[], b: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

/** Lines for one session: a kind-specific opener, then a rotation that fits the kind. */
export function groundingLines(kind: string, seed: number): string[] {
  const domain = TRADING_KINDS.has(kind) ? TRADING : LIFE_KINDS.has(kind) ? LIFE : [];
  const pool = interleave(domain, SHARED);
  const start = Math.abs(Math.floor(seed)) % pool.length;
  const rotated = [...pool.slice(start), ...pool.slice(0, start)];
  const opener = OPENERS[kind];
  return opener ? [opener, ...rotated] : rotated;
}

/* ---------- time ---------- */

/** 582 -> "9:42". */
export function clock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/** 582 -> "9 minutes 42 seconds", for screen readers. */
export function spokenDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  const mins = m ? `${m} ${m === 1 ? 'minute' : 'minutes'}` : '';
  const secs = r || !m ? `${r} ${r === 1 ? 'second' : 'seconds'}` : '';
  return [mins, secs].filter(Boolean).join(' ');
}

/** Duration chips: 1, 3 and 5 minutes, plus his saved default if it's something else. */
export function durationOptions(saved: number): number[] {
  const base = [1, 3, 5];
  const s = Math.max(1, Math.round(saved || 3));
  return base.includes(s) ? base : [...base, s].sort((a, b) => a - b);
}

/* ---------- record ---------- */

export interface UrgeRecord {
  total: number;
  resisted: number;
  rate: number; // 0-1
  recent: Urge[]; // newest first
}

export function urgeRecord(urges: Urge[], recent = 3): UrgeRecord {
  const resisted = urges.filter((u) => u.outcome === 'resisted').length;
  return {
    total: urges.length,
    resisted,
    rate: urges.length ? resisted / urges.length : 0,
    recent: urges.slice(0, recent),
  };
}

/** Ridden-out count at which the Urge surfer medal is earned. */
export const SURFER_AT = 5;
