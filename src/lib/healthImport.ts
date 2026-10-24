/**
 * Apple Health sleep import, via an iOS Shortcut (a web app can't read HealthKit).
 * Garmin, Apple Watch, Oura etc. all write sleep into Health, so this covers them.
 *
 * The Shortcut copies one line per Sleep Analysis sample:
 *   2026-10-24T23:05:00+07:00|2026-10-25T00:12:00+07:00|Asleep Core
 * Separators can be | , or tab. Dates must be ISO 8601 (the Shortcut's "ISO 8601" date format).
 *
 * Samples are grouped into sleeps (a gap over 90 min starts a new one). Asleep time is
 * the union of asleep samples, so overlapping sources (phone + watch) aren't double counted.
 */
import type { SleepLog } from './store';

const M = 60_000;
const GAP = 90 * M;

type Kind = 'inbed' | 'awake' | 'core' | 'deep' | 'rem' | 'asleep';

export interface Sample {
  start: number;
  end: number;
  kind: Kind;
}

function kindOf(v: string): Kind | undefined {
  const t = v.toLowerCase();
  if (/in ?bed|inbed/.test(t)) return 'inbed';
  if (/awake/.test(t)) return 'awake';
  if (/deep/.test(t)) return 'deep';
  if (/rem/.test(t)) return 'rem';
  if (/core|light/.test(t)) return 'core';
  if (/asleep|sleep|unspecified/.test(t)) return 'asleep';
  // Raw HealthKit values: 0 in bed, 1 asleep, 2 awake, 3 core, 4 deep, 5 REM.
  const n = Number(t);
  if (Number.isInteger(n)) return (['inbed', 'asleep', 'awake', 'core', 'deep', 'rem'] as Kind[])[n];
  return undefined;
}

const ISO = /\d{4}-\d{2}-\d{2}[T ]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?: ?(?:Z|[+-]\d{2}:?\d{2}))?/g;

function parseDate(s: string): number {
  // Shortcuts may write "2026-10-24 23:05:00 +0700"; normalise to ISO.
  const iso = s.replace(/^(\S+) /, '$1T').replace(/ (?=[Z+-])/, '').replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  return Date.parse(iso);
}

/** Pull samples out of whatever the Shortcut produced. Unparseable lines are skipped. */
export function parseSamples(text: string): Sample[] {
  const out: Sample[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const dates = line.match(ISO);
    if (!dates || dates.length < 2) continue;
    const start = parseDate(dates[0]);
    const end = parseDate(dates[1]);
    const rest = line.replace(ISO, ' ').replace(/[|,\t]/g, ' ').trim();
    const kind = kindOf(rest || 'asleep');
    if (!kind || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    if (end - start > 16 * 60 * M) continue;
    out.push({ start, end, kind });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Total length of the union of intervals, in ms. */
function unionMs(iv: [number, number][]): number {
  const s = [...iv].sort((a, b) => a[0] - b[0]);
  let total = 0;
  let cur: [number, number] | undefined;
  for (const [a, b] of s) {
    if (!cur || a > cur[1]) {
      if (cur) total += cur[1] - cur[0];
      cur = [a, b];
    } else cur[1] = Math.max(cur[1], b);
  }
  if (cur) total += cur[1] - cur[0];
  return total;
}

/** Turn samples into sleep logs. Sleeps with under 20 min asleep are dropped. */
export function toLogs(samples: Sample[]): SleepLog[] {
  const groups: Sample[][] = [];
  let end = -Infinity;
  for (const s of samples) {
    if (!groups.length || s.start - end > GAP) groups.push([]);
    groups[groups.length - 1].push(s);
    end = Math.max(end, s.end);
  }
  const logs: SleepLog[] = [];
  for (const g of groups) {
    const asleep = g.filter((s) => s.kind !== 'inbed' && s.kind !== 'awake');
    if (!asleep.length) continue;
    const asleepMs = unionMs(asleep.map((s) => [s.start, s.end]));
    if (asleepMs < 20 * M) continue;
    const bed = Math.min(...g.map((s) => s.start));
    const wake = Math.max(...g.map((s) => s.end));
    const firstAsleep = Math.min(...asleep.map((s) => s.start));
    const latencyMin = Math.round((firstAsleep - bed) / M);
    const awakeMin = Math.max(0, Math.round((wake - bed - asleepMs) / M) - latencyMin);
    const mins = (k: Kind) => Math.round(unionMs(g.filter((s) => s.kind === k).map((s) => [s.start, s.end])) / M);
    const staged = mins('core') + mins('deep') + mins('rem') > 0;
    logs.push({
      id: `h-${Math.round(bed / M)}`,
      bed,
      wake,
      latencyMin,
      awakeMin,
      source: 'health',
      stages: staged ? { core: mins('core'), deep: mins('deep'), rem: mins('rem'), awake: mins('awake') } : undefined,
    });
  }
  return logs;
}

export function importHealthText(text: string): SleepLog[] {
  return toLogs(parseSamples(text));
}
