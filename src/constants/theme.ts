/**
 * Get Gud design tokens.
 *
 * Rule: colour carries meaning, never decoration.
 *   jade      = clear / kept / resisted
 *   tangerine = wait / caution
 *   coral     = stop / broken / gave in
 *   gold      = earned (streaks, milestones) — never used for plain buttons
 * Primary actions are mist-filled with ink text.
 */
import { Platform } from 'react-native';

export const C = {
  ink: '#121933', // app background — night before the London open
  surface: '#1B2445', // grouped content
  raised: '#26315A', // controls, chips, inputs
  line: '#2F3B68', // hairline separators
  mist: '#E9ECF5', // primary text + primary button fill
  haze: '#8E97B5', // secondary text
  faint: '#5E6894', // tertiary text, placeholders
  jade: '#5ED6A4',
  tangerine: '#FF9F43',
  coral: '#FF5E6C',
  gold: '#E8B94A',
} as const;

/** Soft tints for backgrounds behind meaning colours. */
export const Tint = {
  jade: 'rgba(94,214,164,0.14)',
  tangerine: 'rgba(255,159,67,0.14)',
  coral: 'rgba(255,94,108,0.14)',
  gold: 'rgba(232,185,74,0.14)',
} as const;

export type Tone = 'jade' | 'tangerine' | 'coral' | 'gold' | 'neutral';

export const toneColor = (t: Tone) => (t === 'neutral' ? C.haze : C[t]);

/** Display face: Big Shoulders Display (condensed). Body: native system font. */
export const F = {
  display: 'BigShouldersDisplay_800ExtraBold',
  displayBold: 'BigShouldersDisplay_700Bold',
  displaySemi: 'BigShouldersDisplay_600SemiBold',
  body: Platform.select({ ios: 'System', default: undefined }),
} as const;

/** Type scale (pt). Display sizes are for the condensed face only. */
export const T = {
  verdict: 128, // full-screen gate verdict
  hero: 56, // screen headline
  title: 34, // section numbers / big stats
  stat: 28,
  h2: 22, // section titles (display face)
  body: 17,
  sub: 15,
  small: 13,
} as const;

export const S = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 36,
  gutter: 20, // screen side padding
} as const;

/** Radii by hierarchy, not one radius for everything. */
export const R = {
  surface: 22,
  control: 14,
  pill: 999,
} as const;
