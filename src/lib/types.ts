/**
 * The app's data shapes. Types only, no runtime code, so pure modules (the sleep
 * engine and its tests) can use them without pulling in storage or React.
 * Re-exported from ./store, so `import { type Trade } from '@/lib/store'` keeps working.
 */
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
