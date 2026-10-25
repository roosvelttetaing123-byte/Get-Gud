/** Which live model each award uses, and how dates are engraved. Tiny: lives in the main bundle. */

const MEDAL_IDS = new Set(['streak-3', 'streak-7', 'streak-21', 'streak-66', 'streak-100', 'walked-away', 'perfect-day', 'urge-surfer']);

/** render3d asset name for an award, or null when it has no live model (it stays a still image). */
export function specFor(id: string, locked?: boolean): string | null {
  if (locked) return 'medal-locked';
  if (id === 'ring-trophy') return 'ring-trophy';
  return MEDAL_IDS.has(id) ? `medal-${id}` : null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "21 Oct 2026": engraved dates always carry the year. */
export function engraveDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
