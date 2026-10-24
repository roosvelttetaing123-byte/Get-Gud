/**
 * On-device store. One JSON blob in expo-sqlite's key-value store,
 * exposed to React through useSyncExternalStore. No network, no account.
 */
import { kv } from './kv';
import { useSyncExternalStore } from 'react';

export type Verdict = 'clear' | 'wait' | 'stop';
export type Result = 'win' | 'loss' | 'be';

export interface Trade {
  id: string;
  ts: number; // gate submitted
  emotions: string[]; // how you felt before
  verdict: Verdict;
  reasons: string[]; // why the gate said what it said
  taken: boolean; // false = you walked away (a discipline win)
  overridden: boolean; // took it despite a stop
  plan?: string; // one-line setup description
  // filled in after the trade closes
  result?: Result;
  r?: number; // R multiple, e.g. 2, -1, 0
  followedRules?: boolean;
  emotionsAfter?: string[];
  note?: string;
  closedTs?: number;
  // v3 gate: State-of-Mind style check
  valence?: number; // 1-7, very unpleasant → very pleasant
  associations?: string[]; // e.g. "After a loss", "News"
}

export interface CheckIn {
  at: number;
  valence?: number; // 1-7 State of Mind
  energy?: number; // 1-5
  sleepHours?: number;
  intention?: string; // one line for today
}

export interface DayClose {
  at: number;
  rating?: number; // 1-5 how the day went
  win?: string; // one good thing
  lesson?: string;
}

export interface DayLog {
  promises: Record<string, boolean>; // promise text -> kept
  checkin?: CheckIn; // morning ritual
  close?: DayClose; // evening ritual
  frozen?: boolean; // a streak freeze protected this day
  // v2 fields, still read for older data
  mood?: number; // 1-5
  energy?: number; // 1-5
  sleptWell?: boolean;
  note?: string;
}

export type UrgeOutcome = 'resisted' | 'gave_in';

export interface Urge {
  id: string;
  ts: number;
  kind: string;
  before: number; // intensity 1-10
  after?: number;
  outcome: UrgeOutcome;
  seconds: number; // how long you sat with it
}

export interface SleepLog {
  id: string;
  bed: number; // ms, lights out (or "Good night" tap)
  wake: number; // ms, woke up
  latencyMin?: number; // minutes to fall asleep after `bed`
  awakeMin?: number; // minutes awake during the night
  quality?: number; // 1-5 how rested you feel
  nap?: boolean; // forced nap/main; undefined = auto
  source: 'mode' | 'manual' | 'health';
  /** Minutes per stage, when the source has them (Apple Health / Garmin). */
  stages?: { core?: number; deep?: number; rem?: number; awake?: number };
}

export interface Settings {
  name: string;
  why: string; // the reason you're doing this — shown on Today
  rules: string[]; // pre-trade checklist; every one must be ticked
  promises: string[]; // daily life promises
  maxTrades: number; // per day
  maxLossStreak: number; // stop after N losses in a row today
  cooldownMin: number; // minutes to wait after a loss
  urgeMinutes: number; // default urge timer length
  freezes: number; // streak freezes in the bank (max 3)
  restDays: number[]; // weekdays (0=Sun) that never break the streak
  sleepNeed: number; // hours a night
  wakeGoal: string; // "HH:MM", used until there are logged nights
  healthImport: boolean; // imported from Apple Health at least once
  healthGist: string; // secret gist id the Shortcut writes to ('' = off)
  onboarded: boolean;
}

export interface State {
  version: 1;
  settings: Settings;
  trades: Trade[]; // newest first
  days: Record<string, DayLog>; // key = dayKey()
  urges: Urge[]; // newest first
  sleeps: SleepLog[]; // newest first (by wake)
  sleepSession?: { bed: number }; // sleep mode is running
  sleepHabits?: Record<string, string[]>; // dayKey -> habit ids done
  healthSync?: { at: number; ok: boolean; message: string; dataAt?: number }; // last automatic pull
  awards: Record<string, number>; // award id -> earned timestamp
  seenAwards: string[]; // award ids already celebrated
  lastReconciled?: string; // dayKey when streak freezes were last applied
  freezeMark?: number; // 7-day blocks already credited with a freeze
}

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  why: '',
  rules: [
    'Setup is in my plan — supply/demand zone marked on the higher timeframe',
    'Liquidity swept and reclaimed; not the first break',
    'Stop loss placed before entry',
    'Risk is 1% or less',
    'No high-impact news in the next 30 minutes',
  ],
  promises: ['Gym or a 30-minute walk', 'At work on time', 'Study 1 hour', 'Phone away, in bed by 23:30'],
  maxTrades: 3,
  maxLossStreak: 2,
  cooldownMin: 30,
  urgeMinutes: 3,
  freezes: 2,
  restDays: [],
  sleepNeed: 8,
  wakeGoal: '07:00',
  healthImport: false,
  healthGist: '',
  onboarded: false,
};

const KEY = 'getgud:v1';

function fresh(): State {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    trades: [],
    days: {},
    urges: [],
    sleeps: [],
    awards: {},
    seenAwards: [],
  };
}

function load(): State {
  try {
    const raw = kv.get(KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as Partial<State>;
    const settings = { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) };
    // Data from before onboarding existed: don't send an existing user through setup again.
    if (parsed.settings && parsed.settings.onboarded === undefined) {
      settings.onboarded = !!(
        parsed.settings.name ||
        parsed.trades?.length ||
        Object.keys(parsed.days ?? {}).length
      );
    }
    return { ...fresh(), ...parsed, settings };
  } catch {
    return fresh();
  }
}

let state: State = load();
const listeners = new Set<() => void>();

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function commit(next: State) {
  state = next;
  try {
    kv.set(KEY, JSON.stringify(state));
  } catch {
    // storage failure must never crash the UI; state stays in memory
  }
  listeners.forEach((l) => l());
}

/** Read the whole state. Derive what you need in the component (or with useMemo). */
export function useStore(): State {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function getState(): State {
  return state;
}

/* ---------- helpers ---------- */

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Local calendar day, YYYY-MM-DD. */
export function dayKey(d: Date | number = new Date()): string {
  const x = typeof d === 'number' ? new Date(d) : d;
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${x.getFullYear()}-${m}-${day}`;
}

export function isToday(ts: number) {
  return dayKey(ts) === dayKey();
}

/* ---------- actions ---------- */

export const actions = {
  updateSettings(patch: Partial<Settings>) {
    commit({ ...state, settings: { ...state.settings, ...patch } });
  },

  updateDay(key: string, patch: Partial<DayLog>) {
    const prev = state.days[key] ?? { promises: {} };
    commit({ ...state, days: { ...state.days, [key]: { ...prev, ...patch } } });
  },

  togglePromise(key: string, promise: string) {
    const prev = state.days[key] ?? { promises: {} };
    const promises = { ...prev.promises, [promise]: !prev.promises[promise] };
    commit({ ...state, days: { ...state.days, [key]: { ...prev, promises } } });
  },

  addTrade(t: Omit<Trade, 'id' | 'ts'>): Trade {
    const trade: Trade = { ...t, id: uid(), ts: Date.now() };
    commit({ ...state, trades: [trade, ...state.trades] });
    return trade;
  },

  updateTrade(id: string, patch: Partial<Trade>) {
    commit({ ...state, trades: state.trades.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  },

  /** Record a result. Keeps the original close time when editing, so streaks and cool-downs stay true. */
  closeTrade(id: string, patch: Omit<Partial<Trade>, 'closedTs'>) {
    commit({
      ...state,
      trades: state.trades.map((t) => (t.id === id ? { ...t, ...patch, closedTs: t.closedTs ?? Date.now() } : t)),
    });
  },

  deleteTrade(id: string) {
    commit({ ...state, trades: state.trades.filter((t) => t.id !== id) });
  },

  addUrge(u: Omit<Urge, 'id' | 'ts'>): Urge {
    const urge: Urge = { ...u, id: uid(), ts: Date.now() };
    commit({ ...state, urges: [urge, ...state.urges] });
    return urge;
  },

  /* ---------- sleep ---------- */

  startSleep(bed = Date.now()) {
    commit({ ...state, sleepSession: { bed } });
  },

  cancelSleep() {
    commit({ ...state, sleepSession: undefined });
  },

  /** Save a night (or nap). Replaces a log with the same id; ends sleep mode. */
  saveSleep(log: Omit<SleepLog, 'id'> & { id?: string }): SleepLog {
    const full: SleepLog = { ...log, id: log.id ?? uid() };
    const rest = (state.sleeps ?? []).filter((l) => l.id !== full.id);
    const sleeps = [full, ...rest].sort((a, b) => b.wake - a.wake);
    commit({ ...state, sleeps, sleepSession: undefined });
    return full;
  },

  /**
   * Bring in nights from Apple Health. Each one replaces any log it overlaps
   * (the watch knows better than a tap or a guess). Returns how many were new or changed.
   */
  importSleeps(logs: SleepLog[]): number {
    let sleeps = state.sleeps ?? [];
    let changed = 0;
    for (const l of logs) {
      const same = sleeps.find((x) => x.id === l.id);
      if (same && same.bed === l.bed && same.wake === l.wake && same.awakeMin === l.awakeMin) continue;
      sleeps = sleeps.filter((x) => x.id !== l.id && (x.wake <= l.bed || x.bed >= l.wake));
      sleeps.push(l);
      changed++;
    }
    if (changed) commit({ ...state, sleeps: sleeps.sort((a, b) => b.wake - a.wake) });
    return changed;
  },

  setHealthSync(info: State['healthSync']) {
    commit({ ...state, healthSync: info });
  },

  deleteSleep(id: string) {
    commit({ ...state, sleeps: (state.sleeps ?? []).filter((l) => l.id !== id) });
  },

  toggleSleepHabit(key: string, id: string) {
    const all = state.sleepHabits ?? {};
    const done = new Set(all[key] ?? []);
    if (done.has(id)) done.delete(id);
    else done.add(id);
    commit({ ...state, sleepHabits: { ...all, [key]: [...done] } });
  },

  /** Morning ritual. Merges into today's check-in. */
  checkIn(key: string, data: Omit<CheckIn, 'at'>) {
    const prev = state.days[key] ?? { promises: {} };
    const checkin: CheckIn = { ...(prev.checkin ?? {}), ...data, at: prev.checkin?.at ?? Date.now() };
    commit({ ...state, days: { ...state.days, [key]: { ...prev, checkin } } });
  },

  /** Evening ritual. */
  closeDay(key: string, data: Omit<DayClose, 'at'>) {
    const prev = state.days[key] ?? { promises: {} };
    const close: DayClose = { ...(prev.close ?? {}), ...data, at: prev.close?.at ?? Date.now() };
    commit({ ...state, days: { ...state.days, [key]: { ...prev, close } } });
  },

  /** Record newly earned awards (ids not already earned are stamped now). */
  grantAwards(ids: string[]) {
    const fresh = ids.filter((id) => !state.awards[id]);
    if (!fresh.length) return;
    const awards = { ...state.awards };
    fresh.forEach((id) => (awards[id] = Date.now()));
    commit({ ...state, awards });
  },

  markAwardsSeen(ids: string[]) {
    const seen = new Set(state.seenAwards);
    ids.forEach((id) => seen.add(id));
    commit({ ...state, seenAwards: [...seen] });
  },

  /** Escape hatch for engagement logic (streak freezes etc.). The function must return a new object. */
  mutate(fn: (s: State) => State) {
    const next = fn(state);
    if (next !== state) commit(next);
  },

  /** Replace everything with an imported backup (already validated by the caller). */
  importState(next: State) {
    commit({ ...fresh(), ...next, settings: { ...DEFAULT_SETTINGS, ...next.settings } });
  },

  resetAll() {
    commit(fresh());
  },
};
