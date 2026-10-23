/**
 * Get Gud UI kit (v2). Every screen builds from these; don't restyle ad hoc.
 * See DESIGN.md for the rules behind them.
 */
import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

import { C, F, Pastel, R, S, T, TAB_BAR_HEIGHT, Tint, toneColor, type PastelName, type Tone } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

export type { LucideIcon };

/* ---------- artwork ---------- */

export const Art = {
  dawn: require('@/assets/art/dawn.jpg') as ImageSource,
  gold: require('@/assets/art/gold.jpg') as ImageSource,
  calm: require('@/assets/art/calm.jpg') as ImageSource,
  ember: require('@/assets/art/ember.jpg') as ImageSource,
};
export type ArtName = keyof typeof Art;

/* ---------- layout ---------- */

export function Screen({
  children,
  scroll = true,
  modal = false,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  /** Modal screens have no tab bar and a smaller top inset. */
  modal?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const pad: ViewStyle = {
    paddingTop: modal ? S.xl : insets.top + S.lg,
    paddingBottom: (modal ? insets.bottom : insets.bottom + TAB_BAR_HEIGHT) + S.xxl,
    paddingHorizontal: S.gutter,
    gap: S.xl,
  };
  if (!scroll) return <View style={[styles.screen, pad, style]}>{children}</View>;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[pad, styles.maxWidth, style]}
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive">
      {children}
    </ScrollView>
  );
}

/** Screen headline: a quiet line of context above a bold title. */
export function Hero({ context, title, right }: { context?: string; title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.heroRow}>
      <View style={{ flex: 1, gap: 4 }}>
        {context ? <Sub>{context}</Sub> : null}
        <Display size={T.hero}>{title}</Display>
      </View>
      {right}
    </View>
  );
}

/** Greeting header with avatar, used on Today. */
export function Greeting({
  name,
  line,
  title,
  right,
}: {
  name: string;
  line: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.heroRow}>
      <Avatar name={name} />
      <View style={{ flex: 1, gap: 2 }}>
        <Sub>{line}</Sub>
        <Display size={22} numberOfLines={2}>
          {title}
        </Display>
      </View>
      {right}
    </View>
  );
}

export function Section({
  title,
  aside,
  children,
  style,
}: {
  title?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap: S.md }, style]}>
      {title ? (
        <View style={styles.sectionHead}>
          <Display size={T.h2} weight="bold">
            {title}
          </Display>
          {typeof aside === 'string' ? <Small>{aside}</Small> : aside}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Bordered card. Use `tone` only when the whole block carries that meaning. */
export function Surface({
  children,
  tone,
  style,
}: {
  children: React.ReactNode;
  tone?: Exclude<Tone, 'neutral'>;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.surface, tone && { backgroundColor: Tint[tone], borderColor: toneColor(tone) }, style]}>
      {children}
    </View>
  );
}
export const Card = Surface;

/** Card with gradient artwork behind it. Text on it should be C.mist. */
export function ArtCard({
  art = 'dawn',
  children,
  style,
  footer,
}: {
  art?: ArtName;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Darker band at the bottom, e.g. a row of stats. */
  footer?: React.ReactNode;
}) {
  return (
    <View style={[styles.artCard, style]}>
      <Image source={Art[art]} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />
      <View style={{ padding: S.xl, gap: S.md }}>{children}</View>
      {footer ? <View style={styles.artFooter}>{footer}</View> : null}
    </View>
  );
}

export function Row({
  children,
  style,
  gap = S.sm,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line }} />;
}

/* ---------- text ---------- */

type TxtProps = { children: React.ReactNode; color?: string; style?: StyleProp<TextStyle>; numberOfLines?: number };

export function Display({
  children,
  size = T.title,
  color = C.mist,
  weight = 'extra',
  style,
  numberOfLines,
}: TxtProps & { size?: number; weight?: 'extra' | 'bold' | 'semi' }) {
  const family = weight === 'extra' ? F.extra : weight === 'bold' ? F.bold : F.semi;
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { fontFamily: family, fontSize: size, lineHeight: Math.round(size * 1.18), color, letterSpacing: -size * 0.025 },
        style,
      ]}>
      {children}
    </Text>
  );
}

export function Body({ children, color = C.mist, style, numberOfLines }: TxtProps) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.medium, fontSize: T.body, lineHeight: 23, color }, style]}>
      {children}
    </Text>
  );
}

export function Sub({ children, color = C.haze, style, numberOfLines }: TxtProps) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.medium, fontSize: T.sub, lineHeight: 20, color }, style]}>
      {children}
    </Text>
  );
}

export function Small({ children, color = C.haze, style, numberOfLines }: TxtProps) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.medium, fontSize: T.small, lineHeight: 17, color }, style]}>
      {children}
    </Text>
  );
}

/* ---------- icons & badges ---------- */

export function Icon({ icon: I, size = 20, color = C.mist, stroke = 2 }: { icon: LucideIcon; size?: number; color?: string; stroke?: number }) {
  return <I size={size} color={color} strokeWidth={stroke} />;
}

/** Icon in a soft rounded square. */
export function IconBadge({
  icon,
  color = C.mist,
  bg = C.raised,
  size = 40,
}: {
  icon: LucideIcon;
  color?: string;
  bg?: string;
  size?: number;
}) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon icon={icon} size={size * 0.5} color={color} />
    </View>
  );
}

export function Avatar({ name, size = 52 }: { name: string; size?: number }) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    (words.length === 1 && words[0].length <= 3 ? words[0] : words.map((w) => w[0]).join(''))
      .slice(0, 2)
      .toUpperCase() || 'GG';
  return (
    <LinearGradient
      colors={['#6AA8FF', '#BFAEFF', '#FFBC91']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, padding: 2 }}>
      <View style={[styles.avatarInner, { borderRadius: size / 2 }]}>
        <Text style={{ fontFamily: F.extra, fontSize: size * 0.34, color: C.mist, letterSpacing: 0.5 }}>{initials}</Text>
      </View>
    </LinearGradient>
  );
}

/** Small rounded label, e.g. a streak or a status. */
export function Pill({
  label,
  icon,
  tone = 'neutral',
  solid,
}: {
  label: string;
  icon?: LucideIcon;
  tone?: Tone | 'accent';
  /** Solid fill with dark text instead of a tint. */
  solid?: boolean;
}) {
  const color = tone === 'accent' ? C.accent : tone === 'neutral' ? C.mist : toneColor(tone);
  const bg = solid ? color : tone === 'neutral' ? 'rgba(255,255,255,0.12)' : tone === 'accent' ? Tint.accent : Tint[tone];
  const fg = solid ? C.onLight : color;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? <Icon icon={icon} size={14} color={fg} stroke={2.4} /> : null}
      <Text style={{ fontFamily: F.bold, fontSize: 13, color: fg }}>{label}</Text>
    </View>
  );
}

/** Circular progress ring. `value` 0..1. */
export function ProgressRing({
  value,
  size = 64,
  stroke = 7,
  colors = [C.accent, '#BFAEFF'],
  track = 'rgba(255,255,255,0.1)',
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  colors?: readonly [string, string];
  track?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const id = React.useId().replace(/:/g, '');
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors[0]} />
            <Stop offset="1" stopColor={colors[1]} />
          </SvgLinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {v > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={`url(#g${id})`}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - v)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}

/* ---------- tiles ---------- */

/**
 * Pastel tile for things you tap: promises, urge kinds, actions.
 * `selected` (or `done`) shows the full pastel; otherwise a dark tile with a pastel icon.
 */
export function Tile({
  title,
  subtitle,
  icon,
  pastel = 'sky',
  selected = true,
  check,
  onPress,
  style,
  accessibilityRole = 'button',
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  pastel?: PastelName;
  selected?: boolean;
  /** Show a check mark in the corner when selected. */
  check?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: 'button' | 'checkbox' | 'radio';
}) {
  const [a, b] = Pastel[pastel];
  const content = (
    <>
      <View style={styles.tileTop}>
        {icon ? (
          <View style={[styles.tileIcon, { backgroundColor: selected ? 'rgba(13,20,36,0.1)' : 'rgba(255,255,255,0.06)' }]}>
            <Icon icon={icon} size={18} color={selected ? C.onLight : b} />
          </View>
        ) : (
          <View />
        )}
        {check ? (
          <View style={[styles.tileCheck, selected ? { backgroundColor: C.onLight, borderColor: C.onLight } : null]}>
            {selected ? <Text style={{ color: a, fontSize: 12, fontFamily: F.extra }}>✓</Text> : null}
          </View>
        ) : null}
      </View>
      <View style={{ gap: 2 }}>
        <Text numberOfLines={2} style={{ fontFamily: F.bold, fontSize: 15, lineHeight: 19, color: selected ? C.onLight : C.mist }}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: selected ? 'rgba(13,20,36,0.65)' : C.haze }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </>
  );
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityRole === 'button' ? undefined : { checked: selected, selected }}
      accessibilityLabel={title}
      disabled={!onPress}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={({ pressed }) => [styles.tileWrap, style, pressed && { transform: [{ scale: 0.97 }] }]}>
      {selected ? (
        <LinearGradient colors={[a, b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.tile, styles.tileOff]}>{content}</View>
      )}
    </Pressable>
  );
}

/** Two-column grid wrapper for Tiles. */
export function Grid({ children, columns = 2, gap = S.md }: { children: React.ReactNode; columns?: number; gap?: number }) {
  const items = React.Children.toArray(children);
  const rows: React.ReactNode[][] = [];
  items.forEach((c, i) => {
    if (i % columns === 0) rows.push([]);
    rows[rows.length - 1].push(c);
  });
  return (
    <View style={{ gap }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap }}>
          {r.map((c, j) => (
            <View key={j} style={{ flex: 1, flexDirection: 'column' }}>
              {c}
            </View>
          ))}
          {Array.from({ length: columns - r.length }, (_, k) => (
            <View key={`pad${k}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

/* ---------- controls ---------- */

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  /** primary = white fill; accent = blue gradient; secondary = raised; ghost = text only; danger = coral outline */
  kind?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}) {
  const fg = kind === 'primary' || kind === 'accent' ? C.onLight : kind === 'danger' ? C.coral : C.mist;
  const inner = (
    <>
      {icon ? <Icon icon={icon} size={19} color={fg} stroke={2.3} /> : null}
      <Text style={{ fontFamily: F.bold, fontSize: T.body, color: fg }}>{label}</Text>
    </>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        haptic.press();
        onPress();
      }}
      style={({ pressed }) => [
        styles.buttonWrap,
        { opacity: disabled ? 0.35 : pressed ? 0.8 : 1 },
        pressed && !disabled && { transform: [{ scale: 0.985 }] },
        style,
      ]}>
      {kind === 'accent' ? (
        <LinearGradient colors={['#8EC0FF', '#6AA8FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.button,
            kind === 'primary' && { backgroundColor: C.mist },
            kind === 'secondary' && { backgroundColor: C.raised, borderWidth: 1, borderColor: C.line },
            kind === 'danger' && { borderWidth: 1, borderColor: C.coral },
            kind === 'ghost' && { minHeight: 44, paddingHorizontal: 0 },
          ]}>
          {inner}
        </View>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  tone = 'neutral',
  onPress,
}: {
  label: string;
  selected: boolean;
  tone?: Tone;
  onPress: () => void;
}) {
  const color = toneColor(tone);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        selected
          ? { backgroundColor: tone === 'neutral' ? C.mist : color, borderColor: 'transparent' }
          : { backgroundColor: C.raised, borderColor: C.line },
        pressed && { opacity: 0.75 },
      ]}>
      {!selected && tone !== 'neutral' ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text style={{ fontFamily: F.semi, fontSize: T.sub, color: selected ? C.onLight : C.mist }}>{label}</Text>
    </Pressable>
  );
}

/** 1..max rating as a row of segments. */
export function Scale({
  value,
  onChange,
  max = 5,
  low,
  high,
}: {
  value?: number;
  onChange: (v: number) => void;
  max?: number;
  low?: string;
  high?: string;
}) {
  return (
    <View style={{ gap: S.xs }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
          const on = value !== undefined && n <= value;
          return (
            <Pressable
              key={n}
              accessibilityRole="adjustable"
              accessibilityLabel={`${n} of ${max}`}
              onPress={() => {
                haptic.tap();
                onChange(n);
              }}
              style={[styles.scaleSeg, { backgroundColor: on ? C.accent : C.raised }]}>
              <Text style={{ fontFamily: F.bold, fontSize: 15, color: on ? C.onLight : C.haze }}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
      {low || high ? (
        <Row style={{ justifyContent: 'space-between' }}>
          <Small color={C.faint}>{low}</Small>
          <Small color={C.faint}>{high}</Small>
        </Row>
      ) : null}
    </View>
  );
}

/** A tickable line. Used for rules and lists. */
export function CheckRow({
  label,
  checked,
  onPress,
  detail,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  detail?: string;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.checkRow, pressed && { opacity: 0.7 }]}>
      <View style={[styles.box, checked ? { backgroundColor: C.jade, borderColor: C.jade } : null]}>
        {checked ? <Text style={{ color: C.onLight, fontSize: 14, fontFamily: F.extra }}>✓</Text> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Body color={checked ? C.mist : C.mist}>{label}</Body>
        {detail ? <Small>{detail}</Small> : null}
      </View>
    </Pressable>
  );
}

export function Segmented<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: V; label: string; tone?: Tone }[];
  value?: V;
  onChange: (v: V) => void;
}) {
  return (
    <View style={styles.segWrap}>
      {options.map((o) => {
        const on = o.value === value;
        const fill = on ? (o.tone && o.tone !== 'neutral' ? toneColor(o.tone) : C.mist) : 'transparent';
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => {
              haptic.tap();
              onChange(o.value);
            }}
            style={[styles.seg, { backgroundColor: fill }]}>
            <Text style={{ fontFamily: F.semi, fontSize: T.sub, color: on ? C.onLight : C.haze }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  const btn = (label: string, next: number, dis: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '−' ? 'Decrease' : 'Increase'}
      disabled={dis}
      onPress={() => {
        haptic.tap();
        onChange(next);
      }}
      style={[styles.stepBtn, dis && { opacity: 0.3 }]}>
      <Text style={{ color: C.mist, fontSize: 20, fontFamily: F.semi }}>{label}</Text>
    </Pressable>
  );
  return (
    <Row gap={S.sm}>
      {btn('−', Math.max(min, value - step), value <= min)}
      <Display size={20} style={{ minWidth: 52, textAlign: 'center' }}>
        {value}
        {suffix ? <Text style={{ fontSize: 14, fontFamily: F.semi }}>{suffix}</Text> : null}
      </Display>
      {btn('+', Math.min(max, value + step), value >= max)}
    </Row>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: S.sm }}>
      {label ? <Sub>{label}</Sub> : null}
      <TextInput
        placeholderTextColor={C.faint}
        selectionColor={C.accent}
        keyboardAppearance="dark"
        {...rest}
        style={[styles.field, rest.multiline && { minHeight: 96, textAlignVertical: 'top' }, style]}
      />
    </View>
  );
}

/** A number with a quiet label underneath. */
export function Stat({ value, label, tone = 'neutral' }: { value: string; label: string; tone?: Tone }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Display size={T.stat} color={tone === 'neutral' ? C.mist : toneColor(tone)}>
        {value}
      </Display>
      <Small>{label}</Small>
    </View>
  );
}

/** Round icon button. Pass a lucide `icon` (preferred) or a text `glyph`. */
export function IconButton({
  icon,
  glyph,
  label,
  onPress,
}: {
  icon?: LucideIcon;
  glyph?: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}>
      {icon ? <Icon icon={icon} size={20} /> : <Text style={{ color: C.mist, fontSize: 18 }}>{glyph}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.ink },
  maxWidth: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: S.md },
  surface: {
    backgroundColor: C.surface,
    borderRadius: R.surface,
    borderWidth: 1,
    borderColor: C.line,
    padding: S.lg,
    gap: S.md,
  },
  artCard: {
    borderRadius: R.hero,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: C.surface,
  },
  artFooter: {
    backgroundColor: 'rgba(10,16,32,0.55)',
    paddingHorizontal: S.xl,
    paddingVertical: S.lg,
    flexDirection: 'row',
    gap: S.md,
  },
  avatarInner: { flex: 1, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    height: 30,
    borderRadius: R.pill,
  },
  tileWrap: { borderRadius: R.tile, flexGrow: 1 },
  tile: { flexGrow: 1, borderRadius: R.tile, padding: 14, minHeight: 116, justifyContent: 'space-between', gap: S.md },
  tileOff: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tileIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonWrap: { borderRadius: R.control },
  button: {
    minHeight: 56,
    borderRadius: R.control,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: S.sm,
    paddingHorizontal: S.xl,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 40,
    borderRadius: R.pill,
    borderWidth: 1,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  scaleSeg: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md, paddingVertical: 10, minHeight: 44 },
  box: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.faint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segWrap: { flexDirection: 'row', backgroundColor: C.raised, borderRadius: R.control, padding: 4, gap: 4 },
  seg: { flex: 1, minHeight: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    backgroundColor: C.raised,
    borderRadius: R.control,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: S.lg,
    paddingVertical: 14,
    color: C.mist,
    fontSize: T.body,
    fontFamily: F.medium,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
