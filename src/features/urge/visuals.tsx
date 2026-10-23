/**
 * Urge tab visuals: kind icons and pastels, the jade-to-coral intensity ramp,
 * and the intensity control shared by Pick (before) and Review (after).
 */
import {
  ArrowRight,
  CircleHelp,
  Dumbbell,
  HandCoins,
  MoonStar,
  MoveVertical,
  Repeat,
  Smartphone,
  Swords,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, Pastel, S, T, type PastelName } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { Display, Icon, Row, Small, Sub, Surface } from '@/ui';

/* ---------- kinds ---------- */

interface KindMeta {
  icon: LucideIcon;
  pastel: PastelName;
  hint: string;
}

const KIND_META: Record<string, KindMeta> = {
  'Revenge trade': { icon: Swords, pastel: 'rose', hint: 'Win the last one back' },
  Overtrade: { icon: Repeat, pastel: 'peach', hint: 'Just one more setup' },
  'Move my stop': { icon: MoveVertical, pastel: 'butter', hint: 'Give it more room' },
  'Take profit early': { icon: HandCoins, pastel: 'mint', hint: 'Lock it in now' },
  Doomscroll: { icon: Smartphone, pastel: 'sky', hint: 'Phone in hand' },
  'Skip the gym': { icon: Dumbbell, pastel: 'lilac', hint: 'Not today' },
  'Stay up late': { icon: MoonStar, pastel: 'rose', hint: 'One more episode' },
  Other: { icon: CircleHelp, pastel: 'butter', hint: 'Something else' },
};

const FALLBACK: KindMeta = KIND_META.Other;

export const kindMeta = (kind: string): KindMeta => KIND_META[kind] ?? FALLBACK;

/** The lighter end of the kind's pastel, for icons on dark backgrounds. */
export const kindTint = (kind: string) => Pastel[kindMeta(kind).pastel][1];

/* ---------- intensity ramp ---------- */

/** Hex token to [hue, saturation, lightness] (0-360, 0-1, 0-1). */
function hsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

/** Blend two tokens through hue (shortest way round), so the middle stays vivid instead of muddy. */
function mix(a: string, b: string, t: number, alpha: number, soft = 0): string {
  const [h1, s1, l1] = hsl(a);
  const [h2, s2, l2] = hsl(b);
  let dh = h2 - h1;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  const h = (h1 + dh * t + 360) % 360;
  // Ease saturation off between the two tokens so the in-betweens stay soft, not neon.
  const soften = 1 - soft * Math.sin(Math.PI * t);
  const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
  return `hsla(${Math.round(h)},${pct((s1 + (s2 - s1) * t) * soften)},${pct(l1 + (l2 - l1) * t)},${alpha})`;
}

/** 1 is jade, the middle is tangerine, 10 is coral. */
export function intensityColor(n: number, alpha = 1): string {
  const t = (Math.min(10, Math.max(1, n)) - 1) / 9;
  return t <= 0.5 ? mix(C.jade, C.tangerine, t / 0.5, alpha, 0.32) : mix(C.tangerine, C.coral, (t - 0.5) / 0.5, alpha);
}

export function intensityWord(n: number): string {
  if (n <= 2) return 'Faint';
  if (n <= 4) return 'Noticeable';
  if (n <= 6) return 'Strong';
  if (n <= 8) return 'Very strong';
  return 'Overwhelming';
}

/* ---------- intensity control ---------- */

const LEVELS = Array.from({ length: 10 }, (_, i) => i + 1);
const BAR_MIN = 18;
const BAR_MAX = 52;

/** Ten rising bars, coloured along the ramp. Filled up to the chosen value. */
function Bars({ value, onChange }: { value?: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.bars}>
      {LEVELS.map((n) => {
        const on = value !== undefined && n <= value;
        const h = BAR_MIN + ((BAR_MAX - BAR_MIN) * (n - 1)) / 9;
        return (
          <Pressable
            key={n}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === n, checked: value === n }}
            accessibilityLabel={`${n} of 10, ${intensityWord(n).toLowerCase()}`}
            hitSlop={{ top: 8, bottom: 8 }}
            onPress={() => {
              haptic.tap();
              onChange(n);
            }}
            style={({ pressed }) => [styles.barHit, pressed && { opacity: 0.7 }]}>
            <View
              style={[
                styles.bar,
                {
                  height: h,
                  backgroundColor: on ? intensityColor(n) : C.raised,
                  borderColor: on ? intensityColor(n) : intensityColor(n, 0.3),
                },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function Num({ n, size }: { n?: number; size: number }) {
  if (n === undefined) {
    // Empty slot the size of a digit, so nothing shifts when it fills.
    const h = Math.round(size * 1.18);
    return (
      <View style={{ height: h, justifyContent: 'center' }}>
        <View style={[styles.slot, { width: size * 0.7, height: size * 0.86, borderRadius: size * 0.2 }]} />
      </View>
    );
  }
  return (
    <Display size={size} color={intensityColor(n)} style={styles.num}>
      {String(n)}
    </Display>
  );
}

/**
 * "How strong is it?" with the number big beside the title.
 * Pass `before` (Review) to show the change instead: two numbers with an arrow icon between.
 */
export function IntensityControl({
  title,
  value,
  onChange,
  before,
}: {
  title: string;
  value?: number;
  onChange: (n: number) => void;
  before?: number;
}) {
  const scale = (
    <View style={{ gap: S.sm }}>
      <Bars value={value} onChange={onChange} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Small color={C.faint}>Faint</Small>
        <Small color={C.faint}>Overwhelming</Small>
      </Row>
    </View>
  );

  if (before !== undefined) {
    return (
      <Surface style={styles.card}>
        <View style={styles.compare} accessible accessibilityLabel={changeLabel(before, value)}>
          <View style={styles.compareSide}>
            <Num n={before} size={56} />
            <Small>Before</Small>
          </View>
          <View style={styles.arrow}>
            <Icon icon={ArrowRight} size={22} color={C.haze} stroke={2.4} />
          </View>
          <View style={styles.compareSide}>
            <Num n={value} size={56} />
            <Small>Now</Small>
          </View>
        </View>
        <View style={{ gap: 4 }}>
          <Display size={T.h2} weight="bold">
            {title}
          </Display>
          <Sub>{changeLine(before, value)}</Sub>
        </View>
        {scale}
      </Surface>
    );
  }

  return (
    <Surface style={styles.card}>
      <Row gap={S.md} style={styles.head}>
        <View style={{ flex: 1, gap: 4 }}>
          <Display size={T.h2} weight="bold">
            {title}
          </Display>
          <Sub>{value === undefined ? 'Tap the bar that matches. Only you see this.' : intensityWord(value)}</Sub>
        </View>
        {value !== undefined ? (
          <View style={styles.big} accessible accessibilityLabel={`${value} of 10`}>
            <Num n={value} size={52} />
            <Small color={C.faint} style={styles.outOf}>
              /10
            </Small>
          </View>
        ) : null}
      </Row>
      {scale}
    </Surface>
  );
}

function changeLine(before: number, after?: number): string {
  if (after === undefined) return 'Tap how strong it feels now.';
  const d = before - after;
  if (d > 0) return `Down ${d}. That's the wave passing.`;
  if (d === 0) return 'Same as before. Sitting with it counts.';
  return `Up ${-d}. That happens. Log it honestly.`;
}

function changeLabel(before: number, after?: number) {
  return after === undefined ? `Started at ${before}. Not rated yet.` : `Started at ${before}, now ${after}.`;
}

/** Compact "8 [arrow] 3" for result cards and rows. */
export function ChangeInline({ before, after, size = 22 }: { before: number; after?: number; size?: number }) {
  return (
    <Row gap={6} style={{ alignItems: 'center' }}>
      <Num n={before} size={size} />
      {after !== undefined ? (
        <>
          <Icon icon={ArrowRight} size={Math.round(size * 0.7)} color={C.haze} stroke={2.4} />
          <Num n={after} size={size} />
        </>
      ) : null}
    </Row>
  );
}

const styles = StyleSheet.create({
  card: { gap: S.lg, padding: S.xl - 4 },
  bars: { flexDirection: 'row', gap: 5, alignItems: 'flex-end' },
  barHit: { flex: 1, height: BAR_MAX, justifyContent: 'flex-end' },
  bar: { borderRadius: 7, borderWidth: 1 },
  head: { minHeight: 62 },
  big: { flexDirection: 'row', alignItems: 'flex-end' },
  num: { fontVariant: ['tabular-nums'] },
  outOf: { marginBottom: 10, marginLeft: 2 },
  compare: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.lg },
  compareSide: { alignItems: 'center', gap: 2, minWidth: 80 },
  slot: { borderWidth: 2, borderStyle: 'dashed', borderColor: C.faint },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.raised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
});
