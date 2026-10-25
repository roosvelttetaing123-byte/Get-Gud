/** Sleep tab wording for days and nights. Pure. */
import { clockLabel, fmtDur, keyOf, type Night } from '@/lib/sleep';
import type { SleepLog } from '@/lib/store';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Sat 24 Oct", the same shape the Journal uses. */
export function dayName(ts: number): string {
  const d = new Date(ts);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** A night by the morning you woke: "Last night" for this morning, else "Sat 24 Oct". */
export function nightName(key: string, now: number): string {
  return key === keyOf(now) ? 'Last night' : dayName(new Date(`${key}T12:00:00`).getTime());
}

/** No spaces inside a duration, for tight rows: "7h20m". */
export const compactDur = (h: number) => fmtDur(h).replace(/ /g, '');

/** "8 h 50 m · 00:44–09:46" for one bar of the chart. */
export function nightFacts(n: Night): string {
  if (!n.main && !n.naps) return 'Not logged';
  if (!n.main) return `${fmtDur(n.naps)} of naps`;
  const span = `${clockLabel(n.main.bed)}–${clockLabel(n.main.wake)}`;
  return `${fmtDur(n.hours)} · ${span}`;
}

/** "23:05–06:40", plus stages when the watch recorded them. */
export function nightLine(l: SleepLog): string {
  const span = `${clockLabel(l.bed)}–${clockLabel(l.wake)}`;
  const st = l.stages;
  if (!st || !(st.deep || st.rem)) return l.source === 'health' ? `${span}  ·  Health` : span;
  const m = (x = 0) => fmtDur(x / 60).replace(/ /g, '');
  return `${span}  ·  Deep ${m(st.deep)}  ·  REM ${m(st.rem)}`;
}

/** Mean hours over the nights that have any sleep logged. */
export function averageHours(ns: Night[]): number | undefined {
  const known = ns.filter((n) => n.hours > 0);
  return known.length ? known.reduce((a, n) => a + n.hours, 0) / known.length : undefined;
}

