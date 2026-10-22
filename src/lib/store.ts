/**
 * On-device store. One JSON blob in expo-sqlite's key-value store,
 * exposed to React through useSyncExternalStore. No network, no account.
 */
import Storage from 'expo-sqlite/kv-store';
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
}

export interface DayLog {
  promises: Record<string, boolean>; // promise text -> kept
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

export interface Settings {
  name: string;
  why: string; // the reason you're doing this — shown on Today
  rules: string[]; // pre-trade checklist; every one must be ticked
  promises: string[]; // daily life promises
  maxTrades: number; // per day
  maxLossStreak: number; // stop after N losses in a row today
  cooldownMin: number; // minutes to wait after a loss
  urgeMinutes: number; // default urge timer length
}

export interface State {
  version: 1;
  settings: Settings;
  trades: Trade[]; // newest first
  days: Record<string, DayLog>; // key = dayKey()
  urges: Urge[]; // newest first
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
  urgeMinutes: 10,
};

const KEY = 'getgud:v1';

function fresh(): State {
  return { version: 1, settings: { ...DEFAULT_SETTINGS }, trades: [], days: {}, urges: [] };
}

function load(): State {
  try {
    const raw = Storage.getItemSync(KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      ...fresh(),
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
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
    Storage.setItemSync(KEY, JSON.stringify(state));
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

  resetAll() {
    commit(fresh());
  },
};
