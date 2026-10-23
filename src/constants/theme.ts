/**
 * Get Gud design tokens (v2).
 *
 * Look: deep night-navy app, bordered cards, soft gradient artwork,
 * pastel tiles with dark text for things you tap, white primary buttons.
 *
 * Colour still carries meaning:
 *   jade      = clear / kept / resisted / win
 *   tangerine = wait / caution
 *   coral     = stop / broken / gave in / loss
 *   gold      = earned (streaks, milestones)
 *   accent    = navigation + selection, never a verdict
 */
import { Platform } from 'react-native';

export const C = {
  ink: '#0A1020', // app background
  surface: '#131B30', // cards
  raised: '#1C2742', // controls, chips, inputs, nested cards
  line: 'rgba(255,255,255,0.08)', // hairlines + card borders
  mist: '#F2F5FB', // primary text + primary button fill
  haze: '#98A2BD', // secondary text
  faint: '#626C8A', // tertiary text, placeholders
  accent: '#6AA8FF', // active tab, selection, links
  jade: '#4FD69C',
  tangerine: '#FFB347',
  coral: '#FF6B78',
  gold: '#F4C553',
  onLight: '#0D1424', // text on pastel tiles and bright verdict screens
} as const;

/** Soft tints for backgrounds behind meaning colours. */
export const Tint = {
  jade: 'rgba(79,214,156,0.14)',
  tangerine: 'rgba(255,179,71,0.14)',
  coral: 'rgba(255,107,120,0.14)',
  gold: 'rgba(244,197,83,0.14)',
  accent: 'rgba(106,168,255,0.14)',
} as const;

/** Pastel tile gradients (top-left → bottom-right). Text on these is C.onLight. */
export const Pastel = {
  sky: ['#D6E7FF', '#A9C9FF'],
  mint: ['#D2F7E6', '#97E5C3'],
  butter: ['#FFF2C9', '#FAD585'],
  rose: ['#FFDCE8', '#F4A8C3'],
  lilac: ['#E6DEFF', '#BFAEFF'],
  peach: ['#FFE3D1', '#FFBC91'],
} as const satisfies Record<string, readonly [string, string]>;

export type PastelName = keyof typeof Pastel;
export const PASTELS = Object.keys(Pastel) as PastelName[];

export type Tone = 'jade' | 'tangerine' | 'coral' | 'gold' | 'neutral';

export const toneColor = (t: Tone) => (t === 'neutral' ? C.haze : C[t]);

/** One family: Plus Jakarta Sans. */
export const F = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semi: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extra: 'PlusJakartaSans_800ExtraBold',
  // aliases kept for older call sites
  display: 'PlusJakartaSans_800ExtraBold',
  displayBold: 'PlusJakartaSans_700Bold',
  displaySemi: 'PlusJakartaSans_600SemiBold',
  body: 'PlusJakartaSans_500Medium',
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
} as const;

/** Type scale (pt). */
export const T = {
  verdict: 88, // full-screen gate verdict
  hero: 30, // screen headline
  title: 28, // big stats
  stat: 24,
  h2: 19, // section titles
  body: 16,
  sub: 14,
  small: 12,
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

/** Radii by hierarchy. */
export const R = {
  hero: 28,
  surface: 22,
  tile: 20,
  control: 16,
  pill: 999,
} as const;

/** Height of the custom tab bar, excluding the bottom safe area. */
export const TAB_BAR_HEIGHT = 64;
