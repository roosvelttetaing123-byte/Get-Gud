/**
 * Automatic Health sync through a secret GitHub Gist.
 *   iPhone Shortcut (automation after you wake): Health sleep samples -> PATCH the gist.
 *   Get Gud, on launch and every return to the app: GET the gist -> import.
 * The write token lives only in the Shortcut. The app reads with no token.
 */
import { importHealthText } from './healthImport';
import { actions, getState } from './store';

export const GIST_FILE = 'getgud-sleep.txt';
const MIN_GAP = 10 * 60_000; // GitHub allows 60 unauthenticated reads an hour

/** Accepts a gist URL or bare id. */
export function gistId(input: string): string | undefined {
  const m = /([0-9a-f]{20,40})(?:[/#?].*)?$/i.exec(input.trim());
  return m ? m[1].toLowerCase() : undefined;
}

interface GistFile {
  content?: string;
  truncated?: boolean;
  raw_url?: string;
}

let running: Promise<void> | null = null;

/** Pull and import. Skips if pulled in the last 10 min unless forced. Never throws. */
export function syncHealth(force = false): Promise<void> {
  const s = getState();
  const id = gistId(s.settings.healthGist);
  if (!id) return Promise.resolve();
  if (!force && s.healthSync && Date.now() - s.healthSync.at < MIN_GAP) return Promise.resolve();
  if (running) return running;
  running = pull(id).finally(() => {
    running = null;
  });
  return running;
}

async function pull(id: string) {
  const at = Date.now();
  try {
    const res = await fetch(`https://api.github.com/gists/${id}`, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
    });
    if (res.status === 404) throw new Error('Gist not found. Check the link.');
    if (res.status === 403 || res.status === 429) throw new Error('GitHub is rate limiting. Tries again later.');
    if (!res.ok) throw new Error(`GitHub error ${res.status}.`);
    const gist = (await res.json()) as { files?: Record<string, GistFile>; updated_at?: string };
    const file = gist.files?.[GIST_FILE] ?? Object.values(gist.files ?? {})[0];
    if (!file) throw new Error(`No ${GIST_FILE} in the gist.`);
    let text = file.content ?? '';
    if (file.truncated && file.raw_url) text = await (await fetch(file.raw_url, { cache: 'no-store' })).text();
    const logs = importHealthText(text);
    const dataAt = gist.updated_at ? Date.parse(gist.updated_at) : undefined;
    if (!logs.length) {
      actions.setHealthSync({ at, ok: true, dataAt, message: 'Connected. Waiting for the Shortcut to send sleep.' });
      return;
    }
    const changed = actions.importSleeps(logs);
    if (!getState().settings.healthImport) actions.updateSettings({ healthImport: true });
    actions.setHealthSync({
      at,
      ok: true,
      dataAt,
      message: changed ? `Imported ${changed} ${changed === 1 ? 'sleep' : 'sleeps'}.` : 'Up to date.',
    });
  } catch (e) {
    const message = e instanceof Error && !/fetch|network/i.test(e.message) ? e.message : 'Offline. Tries again when you open the app.';
    actions.setHealthSync({ at, ok: false, message });
  }
}
