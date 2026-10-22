/**
 * Get Gud UI kit. Every screen builds from these; don't restyle ad hoc.
 * See DESIGN.md for the rules behind them.
 */
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

import { C, F, R, S, T, Tint, toneColor, type Tone } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

const TAB_BAR = 90;

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
    paddingTop: modal ? S.xl : insets.top + S.md,
    paddingBottom: (modal ? insets.bottom : insets.bottom + TAB_BAR) + S.xl,
    paddingHorizontal: S.gutter,
    gap: S.xl,
  };
  if (!scroll) return <View style={[styles.screen, pad, style]}>{children}</View>;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[pad, style]}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive">
      {children}
    </ScrollView>
  );
}

/** Screen headline: a quiet line of context above a big condensed title. */
export function Hero({ context, title, right }: { context?: string; title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.heroRow}>
      <View style={{ flex: 1 }}>
        {context ? <Sub>{context}</Sub> : null}
        <Display size={T.hero} style={{ marginTop: 2 }}>
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

/** Grouped content. Use `tone` only when the whole block carries that meaning. */
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
    <View
      style={[
        styles.surface,
        tone && { backgroundColor: Tint[tone], borderColor: toneColor(tone), borderWidth: StyleSheet.hairlineWidth },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Row({ children, style, gap = S.sm }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
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
  const family = weight === 'extra' ? F.display : weight === 'bold' ? F.displayBold : F.displaySemi;
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ fontFamily: family, fontSize: size, lineHeight: size * 0.98, color, letterSpacing: 0.2 }, style]}>
      {children}
    </Text>
  );
}

export function Body({ children, color = C.mist, style, numberOfLines }: TxtProps) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.body, fontSize: T.body, lineHeight: 24, color }, style]}>
      {children}
    </Text>
  );
}

export function Sub({ children, color = C.haze, style, numberOfLines }: TxtProps) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.body, fontSize: T.sub, lineHeight: 21, color }, style]}>
      {children}
    </Text>
  );
}

export function Small({ children, color = C.haze, style, numberOfLines }: TxtProps) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.body, fontSize: T.small, lineHeight: 18, color }, style]}>
      {children}
    </Text>
  );
}

/* ---------- controls ---------- */

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  /** primary = mist fill; secondary = raised; ghost = text only; danger = coral outline */
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = kind === 'primary' ? C.mist : kind === 'secondary' ? C.raised : 'transparent';
  const fg = kind === 'primary' ? C.ink : kind === 'danger' ? C.coral : C.mist;
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
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.35 : pressed ? 0.75 : 1 },
        kind === 'danger' && { borderWidth: 1, borderColor: C.coral },
        kind === 'ghost' && { minHeight: 44, paddingHorizontal: 0 },
        style,
      ]}>
      <Text style={{ fontFamily: F.body, fontSize: T.body, fontWeight: '600', color: fg }}>{label}</Text>
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
          : { backgroundColor: C.raised, borderColor: C.raised },
        pressed && { opacity: 0.75 },
      ]}>
      {!selected && tone !== 'neutral' ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text style={{ fontFamily: F.body, fontSize: T.sub, fontWeight: '600', color: selected ? C.ink : C.mist }}>
        {label}
      </Text>
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
      <View style={{ flexDirection: 'row', gap: S.xs }}>
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
              style={[styles.scaleSeg, { backgroundColor: on ? C.mist : C.raised }]}>
              <Text style={{ fontFamily: F.displayBold, fontSize: 18, color: on ? C.ink : C.haze }}>{n}</Text>
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

/** A tickable line. Used for rules and daily promises. */
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
        {checked ? <Text style={{ color: C.ink, fontSize: 15, fontWeight: '800' }}>✓</Text> : null}
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
            <Text style={{ fontFamily: F.body, fontSize: T.sub, fontWeight: '600', color: on ? C.ink : C.haze }}>
              {o.label}
            </Text>
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
      <Text style={{ color: C.mist, fontSize: 22, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
  return (
    <Row gap={S.md}>
      {btn('−', Math.max(min, value - step), value <= min)}
      <Display size={T.stat} style={{ minWidth: 56, textAlign: 'center' }}>
        {value}
        {suffix ? <Text style={{ fontSize: 16 }}>{suffix}</Text> : null}
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
        selectionColor={C.mist}
        keyboardAppearance="dark"
        {...rest}
        style={[styles.field, rest.multiline && { minHeight: 88, textAlignVertical: 'top' }, style]}
      />
    </View>
  );
}

/** A number with a quiet label underneath. */
export function Stat({ value, label, tone = 'neutral' }: { value: string; label: string; tone?: Tone }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Display size={T.title} color={tone === 'neutral' ? C.mist : toneColor(tone)}>
        {value}
      </Display>
      <Small>{label}</Small>
    </View>
  );
}

/** Small round icon-ish button (e.g. settings gear) using a text glyph. */
export function IconButton({ glyph, label, onPress }: { glyph: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}>
      <Text style={{ color: C.mist, fontSize: 20 }}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.ink },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: S.md },
  surface: { backgroundColor: C.surface, borderRadius: R.surface, padding: S.lg, gap: S.md },
  button: {
    minHeight: 54,
    borderRadius: R.control,
    alignItems: 'center',
    justifyContent: 'center',
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
  scaleSeg: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md, paddingVertical: 10, minHeight: 44 },
  box: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.faint,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -1,
  },
  segWrap: { flexDirection: 'row', backgroundColor: C.raised, borderRadius: R.control, padding: 3, gap: 3 },
  seg: { flex: 1, minHeight: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    backgroundColor: C.raised,
    borderRadius: R.control,
    paddingHorizontal: S.lg,
    paddingVertical: 14,
    color: C.mist,
    fontSize: T.body,
    fontFamily: F.body,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
