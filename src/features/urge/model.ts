/**
 * Urge tab: kinds, grounding copy and small pure helpers.
 * (Kept here rather than derive.ts because shared files are frozen for this change.)
 */
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

/** Quiet line above the countdown, e.g. "Urge to move my stop". */
export function urgeContext(kind: string): string {
  return kind === 'Other' ? 'Sitting with it' : `Urge to ${kind.toLowerCase()}`;
}

/* ---------- grounding lines ---------- */

export const LINE_MS = 20_000;

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
  'This feeling is a wave. It rises, peaks and passes.',
  "You don't have to act on a thought to let it exist.",
  'Name five things you can see.',
  'Your future self is watching this decision.',
  'Notice where you feel it in your body. Breathe into that spot.',
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

/** 582 -> "9:42", or "09:42" with padMinutes. */
export function clock(totalSec: number, padMinutes = false): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${padMinutes ? String(m).padStart(2, '0') : m}:${String(r).padStart(2, '0')}`;
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

/* ---------- record ---------- */

export interface UrgeRecord {
  total: number;
  resisted: number;
  rate: number; // 0-1
  recent: Urge[]; // newest first
}

export function urgeRecord(urges: Urge[], recent = 5): UrgeRecord {
  const resisted = urges.filter((u) => u.outcome === 'resisted').length;
  return {
    total: urges.length,
    resisted,
    rate: urges.length ? resisted / urges.length : 0,
    recent: urges.slice(0, recent),
  };
}
