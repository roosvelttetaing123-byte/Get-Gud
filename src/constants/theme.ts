/**
 * Get Gud design tokens (v3): Apple iOS 26, dark-first.
 *
 * Source: Apple HIG colour/typography tables (iOS 26 values), Liquid Glass guidance,
 * WWDC23 spring animations. See DESIGN.md.
 *
 * Rules:
 * - Content is opaque (C.card on C.bg). Glass is ONLY for floating navigation (tab bar, sheets).
 * - One brand tint (gold) for actions and selection. Verdict colours are semantic, not brand.
 * - Colour makes it lively: rings, coloured icon squares, medals, celebrations.
 */
import { Platform } from 'react-native';

/** iOS 26 system colours, dark appearance. */
export const SYS = {
  blue: '#0091FF',
  green: '#30D158',
  orange: '#FF9230',
  red: '#FF4245',
  yellow: '#FFD600',
  mint: '#00DAC3',
  teal: '#00D2E0',
  cyan: '#3CD3FE',
  indigo: '#6D7CFF',
  purple: '#DB34F2',
  pink: '#FF375F',
  brown: '#B78A66',
  gray: '#8E8E93',
  gray2: '#636366',
  gray3: '#48484A',
  gray4: '#3A3A3C',
  gray5: '#2C2C2E',
  gray6: '#1C1C1E',
} as const;

export const C = {
  // surfaces
  bg: '#000000', // systemGroupedBackground (dark)
  card: '#1C1C1E', // secondarySystemGroupedBackground
  card2: '#2C2C2E', // tertiarySystemGroupedBackground / elevated rows
  fill: 'rgba(120,120,128,0.36)', // systemFill
  fill2: 'rgba(120,120,128,0.32)', // secondarySystemFill
  fill3: 'rgba(118,118,128,0.24)', // tertiarySystemFill (segmented control track)
  fill4: 'rgba(118,118,128,0.18)', // quaternarySystemFill
  // text
  label: '#FFFFFF',
  label2: 'rgba(235,235,245,0.6)',
  label3: 'rgba(235,235,245,0.3)',
  label4: 'rgba(235,235,245,0.16)',
  separator: 'rgba(84,84,88,0.6)',
  // brand tint: warm gold (trading gold)
  tint: '#FFB800',
  onTint: '#000000',
  // semantic
  clear: SYS.green,
  wait: SYS.orange,
  stop: SYS.red,
  win: SYS.green,
  loss: SYS.red,
  ...SYS,

  // ---- deprecated v2 aliases (kept so old screens compile during the rebuild) ----
  ink: '#000000',
  surface: '#1C1C1E',
  raised: '#2C2C2E',
  line: 'rgba(84,84,88,0.6)',
  mist: '#FFFFFF',
  haze: 'rgba(235,235,245,0.6)',
  faint: 'rgba(235,235,245,0.3)',
  accent: '#FFB800',
  jade: SYS.green,
  tangerine: SYS.orange,
  coral: SYS.red,
  gold: '#FFB800',
  onLight: '#000000',
} as const;

/** The three daily rings. Our own colours (not Apple's Move/Exercise/Stand). */
export const RING = {
  promises: { from: '#FF9230', to: '#FFD600', track: 'rgba(255,146,48,0.22)', label: 'Promises' },
  mind: { from: '#6D7CFF', to: '#B57BFF', track: 'rgba(109,124,255,0.22)', label: 'Mind' },
  discipline: { from: '#00DAC3', to: '#30D158', track: 'rgba(0,218,195,0.22)', label: 'Discipline' },
} as const;
export type RingKey = keyof typeof RING;

/** Mood valence 1..7 (Apple Health State of Mind scale): purple → blue → orange. */
export const VALENCE = [
  { label: 'Very unpleasant', color: '#B03CF2' },
  { label: 'Unpleasant', color: '#8A5CF6' },
  { label: 'Slightly unpleasant', color: '#5D79FF' },
  { label: 'Neutral', color: '#0091FF' },
  { label: 'Slightly pleasant', color: '#36B6E8' },
  { label: 'Pleasant', color: '#FFB340' },
  { label: 'Very pleasant', color: '#FF9230' },
] as const;

/** Soft translucent tints for backgrounds behind a colour (e.g. icon wells, chips). */
export const tint = (hex: string, a = 0.18) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/* ---------- typography: SF Pro via the system font ---------- */

const SYSTEM_WEB = '-apple-system, system-ui, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';
const ROUNDED_WEB = 'ui-rounded, "SF Pro Rounded", -apple-system, system-ui, "Helvetica Neue", sans-serif';

export const FONT = {
  system: Platform.select({ web: SYSTEM_WEB, default: undefined }) as string | undefined,
  rounded: Platform.select({ web: ROUNDED_WEB, ios: 'ui-rounded', default: undefined }) as string | undefined,
};

export type Weight = '400' | '500' | '600' | '700' | '800' | '900';

/** Apple Dynamic Type styles at the default (Large) size. */
export const TYPE = {
  largeTitle: { size: 34, line: 41, weight: '700' as Weight },
  title1: { size: 28, line: 34, weight: '700' as Weight },
  title2: { size: 22, line: 28, weight: '700' as Weight },
  title3: { size: 20, line: 25, weight: '600' as Weight },
  headline: { size: 17, line: 22, weight: '600' as Weight },
  body: { size: 17, line: 22, weight: '400' as Weight },
  callout: { size: 16, line: 21, weight: '400' as Weight },
  subhead: { size: 15, line: 20, weight: '400' as Weight },
  footnote: { size: 13, line: 18, weight: '400' as Weight },
  caption1: { size: 12, line: 16, weight: '400' as Weight },
  caption2: { size: 11, line: 13, weight: '400' as Weight },
} as const;
export type TypeStyle = keyof typeof TYPE;

/* ---------- layout ---------- */

export const S = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  margin: 16, // screen side margin
  section: 28, // between sections
  gutter: 16, // deprecated alias of margin
} as const;

/** Concentric radii. */
export const R = {
  card: 26,
  inner: 14, // card radius minus 12 padding
  sheet: 36,
  iconSquare: 7,
  pill: 999,
  // deprecated v2 aliases
  hero: 26,
  surface: 26,
  tile: 22,
  control: 14,
} as const;

/** Floating glass tab bar. */
export const TABBAR = {
  height: 64,
  gap: 10, // above the home indicator / safe area
  side: 20,
} as const;
export const TAB_BAR_HEIGHT = TABBAR.height + TABBAR.gap;

/* ---------- motion: Apple springs (duration + bounce) ---------- */

export const SPRING = {
  smooth: { duration: 500, dampingRatio: 1 },
  snappy: { duration: 380, dampingRatio: 0.85 },
  bouncy: { duration: 550, dampingRatio: 0.68 },
} as const;

/* ---------- deprecated v2 exports (remove once all screens are on v3) ---------- */

export type Tone = 'jade' | 'tangerine' | 'coral' | 'gold' | 'neutral';
export const toneColor = (t: Tone) =>
  t === 'neutral' ? C.label2 : t === 'jade' ? C.green : t === 'tangerine' ? C.orange : t === 'coral' ? C.red : C.tint;
export const Tint = {
  jade: tint(SYS.green),
  tangerine: tint(SYS.orange),
  coral: tint(SYS.red),
  gold: tint('#FFB800'),
  accent: tint('#FFB800'),
} as const;
export const Pastel = {
  sky: [SYS.blue, SYS.cyan],
  mint: [SYS.mint, SYS.green],
  butter: [SYS.yellow, '#FFB800'],
  rose: [SYS.pink, SYS.red],
  lilac: [SYS.indigo, SYS.purple],
  peach: [SYS.orange, SYS.yellow],
} as const satisfies Record<string, readonly [string, string]>;
export type PastelName = keyof typeof Pastel;
export const PASTELS = Object.keys(Pastel) as PastelName[];
export const F = {
  regular: FONT.system,
  medium: FONT.system,
  semi: FONT.system,
  bold: FONT.system,
  extra: FONT.system,
  display: FONT.system,
  displayBold: FONT.system,
  displaySemi: FONT.system,
  body: FONT.system,
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
} as const;
export const T = {
  verdict: 88,
  hero: 34,
  title: 28,
  stat: 22,
  h2: 20,
  body: 17,
  sub: 15,
  small: 13,
} as const;
