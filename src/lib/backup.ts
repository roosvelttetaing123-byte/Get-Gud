/**
 * Backup and restore of the on-device store as a JSON file.
 *
 *   exportBackup()       call straight from a tap handler (the share sheet needs the tap)
 *   pickBackupFile()     web: open the file picker; also call straight from a tap handler
 *   importBackup(input)  validate a file or JSON string and return the State to apply
 *
 * importBackup never writes to the store; the caller applies the result.
 * Validation is structural and follows the live State: unknown keys are kept, missing
 * list/map keys are filled empty, settings are merged over DEFAULT_SETTINGS.
 */
import { Platform, Share } from 'react-native';

import { DEFAULT_SETTINGS, getState, type State } from '@/lib/store';

export const BACKUP_APP = 'get-gud';
export const BACKUP_FORMAT = 1;
const MAX_BYTES = 20 * 1024 * 1024;

/** The file on disk: the State plus a small header. */
export interface BackupFile {
  app: typeof BACKUP_APP;
  format: typeof BACKUP_FORMAT;
  exportedAt: string; // ISO time
  state: State;
}

export type ExportMethod = 'shared' | 'downloaded' | 'cancelled';

export interface ExportResult {
  json: string;
  fileName: string;
  method: ExportMethod;
}

/** Thrown by importBackup with a message that can be shown to the user as is. */
export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

/** get-gud-backup-YYYY-MM-DD.json (local date). */
export function backupFileName(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `get-gud-backup-${d.getFullYear()}-${m}-${day}.json`;
}

/** The backup JSON for the current store state (no side effects). */
export function backupJson(state: State = getState()): string {
  const file: BackupFile = { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: new Date().toISOString(), state };
  return JSON.stringify(file, null, 2);
}

/**
 * Export the store. Web: share sheet with the .json file (iOS "Save to Files"), falling back
 * to a download. Native: the system share sheet with the JSON text.
 * Must be called synchronously from a tap handler, before any await.
 */
export async function exportBackup(): Promise<ExportResult> {
  const json = backupJson();
  const fileName = backupFileName();
  const method = Platform.OS === 'web' ? await deliverWeb(json, fileName) : await deliverNative(json, fileName);
  return { json, fileName, method };
}

async function deliverNative(json: string, fileName: string): Promise<ExportMethod> {
  const res = await Share.share({ message: json, title: fileName });
  return res.action === Share.dismissedAction ? 'cancelled' : 'shared';
}

async function deliverWeb(json: string, fileName: string): Promise<ExportMethod> {
  const file = new File([json], fileName, { type: 'application/json' });
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Get Gud backup' });
      return 'shared';
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'cancelled';
      // NotAllowedError etc.: fall back to a download
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return 'downloaded';
}

/**
 * Web: open the system file picker for a backup file. Resolves null if cancelled.
 * Native: resolves null (no document picker installed). Call from a tap handler.
 */
export function pickBackupFile(): Promise<File | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json,text/plain';
    input.style.display = 'none';
    const done = (file: File | null) => {
      input.remove();
      resolve(file);
    };
    input.addEventListener('change', () => done(input.files?.[0] ?? null), { once: true });
    input.addEventListener('cancel', () => done(null), { once: true });
    document.body.appendChild(input);
    input.click();
  });
}

/* ---------- import ---------- */

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const kind = (v: unknown) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse and validate a backup. Accepts a File/Blob or a JSON string, either the wrapped
 * BackupFile or a bare State. Returns the State for the caller to apply; throws BackupError.
 */
export async function importBackup(input: string | Blob): Promise<State> {
  let text: string;
  if (typeof input === 'string') text = input;
  else {
    if (input.size > MAX_BYTES) throw new BackupError('That file is too big to be a Get Gud backup.');
    text = await input.text();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    throw new BackupError("That file isn't a Get Gud backup (it isn't valid JSON).");
  }

  let raw: unknown = parsed;
  if (isObj(parsed) && 'state' in parsed) {
    if (parsed.app !== undefined && parsed.app !== BACKUP_APP) throw new BackupError("That backup isn't from Get Gud.");
    if (typeof parsed.format === 'number' && parsed.format > BACKUP_FORMAT) {
      throw new BackupError('That backup was made by a newer version of Get Gud. Update the app first.');
    }
    raw = parsed.state;
  }
  return validateState(raw);
}

/** Structural check of a State. Exported for tests. */
export function validateState(raw: unknown): State {
  const bad = (what: string): never => {
    throw new BackupError(`That backup is damaged: ${what}.`);
  };
  if (!isObj(raw)) bad('no app data found');
  const s = raw as Json;
  const template = getState() as unknown as Json;

  if (s.version !== template.version) {
    if (typeof s.version === 'number' && typeof template.version === 'number' && s.version > template.version) {
      throw new BackupError('That backup was made by a newer version of Get Gud. Update the app first.');
    }
    bad('unknown data version');
  }

  // Top-level keys: same kind as the live state; missing lists and maps start empty.
  const out: Json = { ...s };
  for (const [key, ref] of Object.entries(template)) {
    const v = s[key];
    if (v === undefined) {
      if (Array.isArray(ref)) out[key] = [];
      else if (isObj(ref) && key !== 'settings') out[key] = {};
      continue;
    }
    if (ref !== undefined && kind(v) !== kind(ref)) bad(`"${key}" should be ${kind(ref) === 'array' ? 'a list' : `a ${kind(ref)}`}`);
  }

  // Settings: merge over defaults; known fields keep their type.
  if (s.settings !== undefined && !isObj(s.settings)) bad('settings are missing');
  const settings: Json = { ...(DEFAULT_SETTINGS as unknown as Json), ...((s.settings as Json) ?? {}) };
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    if (kind(settings[key]) !== kind(def)) bad(`setting "${key}" has the wrong type`);
    if (Array.isArray(def) && (settings[key] as unknown[]).some((x) => typeof x !== 'string')) {
      bad(`setting "${key}" should be a list of text`);
    }
  }
  out.settings = settings;

  // Records: trades and urges are lists of { id, ts, ... }.
  for (const key of ['trades', 'urges'] as const) {
    const list = out[key];
    if (!Array.isArray(list)) bad(`"${key}" should be a list`);
    (list as unknown[]).forEach((item, i) => {
      if (!isObj(item) || typeof item.id !== 'string' || !Number.isFinite(item.ts)) bad(`${key} entry ${i + 1} is invalid`);
    });
  }

  // Days: map of YYYY-MM-DD -> object.
  if (!isObj(out.days)) bad('"days" should be a map');
  for (const [key, day] of Object.entries(out.days as Json)) {
    if (!DAY_KEY.test(key) || !isObj(day)) bad(`day "${key}" is invalid`);
  }

  return out as unknown as State;
}
