/**
 * Controls for the full-bleed verdict, where the background is a meaning
 * colour and everything sits on it in ink (C.onLight). Mirrors the kit's
 * sizing: 56pt buttons, radius 16, 44pt minimum touch targets.
 */
import type { LucideIcon } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, F, R, S, T, TAB_BAR_HEIGHT } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { Display, Icon } from '@/ui/legacy';

/** Ink at low alpha, for panels and fields that sit on the flood. */
export const INK_08 = 'rgba(13,20,36,0.08)';
const INK_14 = 'rgba(13,20,36,0.14)';
const INK_SOFT = 'rgba(13,20,36,0.72)';

/** Edge-to-edge coloured page. Pass `flood` to fade the colour in over the app background. */
export function FullBleed({
  colour,
  flood,
  endKey,
  children,
}: {
  colour: string;
  flood?: Animated.Value;
  /** When this changes (e.g. a field opens at the bottom), scroll to the end. */
  endKey?: string | number | boolean;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollViewInstance>(null);

  // Inputs live at the bottom of the page; keep them above the keyboard.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => scroller.current?.scrollToEnd({ animated: true }));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!endKey) return;
    const id = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [endKey]);

  return (
    <View style={[styles.fill, { backgroundColor: flood ? C.ink : colour }]}>
      {flood ? (
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: colour, opacity: flood, pointerEvents: 'none' }]}
        />
      ) : null}
      <ScrollView
        ref={scroller}
        style={styles.fill}
        contentContainerStyle={[
          styles.page,
          {
            paddingTop: insets.top + S.md,
            paddingBottom: insets.bottom + TAB_BAR_HEIGHT + S.xl,
          },
        ]}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        alwaysBounceVertical={false}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

/* Plus Jakarta Sans ExtraBold metrics, in ems. */
const ASCENT = 1.038;
const DESCENT = 0.222;
const CAP = 0.745;
/** Tracking for the giant word, in ems per character. */
const TRACK = -0.03;
/** Baseline-to-baseline distance for stacked lines, in ems. */
const LEADING = 0.98;

/**
 * The giant ink word at T.verdict, shrunk only if its widest line would not
 * fit the gutter. `em` is that line's advance width in ems (from the font).
 *
 * The word is a sign, not reading text: Dynamic Type is cancelled out so it
 * renders at one physical size and never breaks mid-word. Each line box is the
 * face's natural height so descenders (the p in "Stop.") are never clipped;
 * negative margins trim the space above the caps and between stacked lines.
 */
export function GiantWord({ lines, em }: { lines: string[]; em: number }) {
  const { width, fontScale } = useWindowDimensions();
  const widest = Math.max(...lines.map((l) => l.length));
  const fit = (Math.min(width, 560) - S.gutter * 2) / (em + TRACK * widest);
  const px = Math.min(T.verdict, Math.floor(fit));
  const font = px / (fontScale > 0 ? fontScale : 1);
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={lines.join(' ')}>
      {lines.map((line, i) => (
        <Display
          key={line}
          size={font}
          color={C.onLight}
          style={{
            lineHeight: font * (ASCENT + DESCENT),
            letterSpacing: font * TRACK,
            marginTop: i === 0 ? -px * (ASCENT - CAP) : -px * (ASCENT + DESCENT - LEADING),
          }}>
          {line}
        </Display>
      ))}
    </View>
  );
}

/** Height of the top action row; the confirmation leaves the same space so its word lands where the verdict's did. */
export const TOP_ROW = 44;

export function InkButton({
  label,
  onPress,
  kind = 'fill',
  icon,
  small,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  /** fill = ink with mist text; outline = ink border; text = ink label only; chip = small translucent capsule */
  kind?: 'fill' | 'outline' | 'text' | 'chip';
  icon?: LucideIcon;
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const fg = kind === 'fill' ? C.mist : C.onLight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={kind === 'chip' ? 4 : kind === 'text' ? 6 : undefined}
      onPress={() => {
        haptic.press();
        onPress();
      }}
      style={({ pressed }) => [
        kind === 'text' ? styles.textBtn : kind === 'chip' ? styles.chip : styles.btn,
        kind === 'fill' && { backgroundColor: C.onLight },
        kind === 'outline' && styles.outline,
        { opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        pressed && !disabled && kind !== 'text' && { transform: [{ scale: 0.985 }] },
        style,
      ]}>
      {icon ? <Icon icon={icon} size={kind === 'chip' || small ? 16 : 19} color={fg} stroke={2.4} /> : null}
      <Text style={{ fontFamily: F.bold, fontSize: kind === 'chip' || small ? T.sub : T.body, color: fg }}>{label}</Text>
    </Pressable>
  );
}

/** Ink text field for use on a meaning colour: a translucent well with ink text and an ink focus border. */
export function InkInput(props: TextInputProps) {
  const { style, onFocus, onBlur, ...rest } = props;
  const [focused, setFocused] = useState(false);
  // The web build draws an accent focus ring on every element; on the flood the ink border shows focus instead.
  const noWebRing = useCallback((node: unknown) => {
    if (Platform.OS === 'web' && node) (node as unknown as { style: { outline: string } }).style.outline = 'none';
  }, []);
  return (
    <TextInput
      ref={noWebRing}
      placeholderTextColor={INK_SOFT}
      selectionColor={C.onLight}
      cursorColor={C.onLight}
      keyboardAppearance="light"
      returnKeyType="done"
      {...rest}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[styles.input, focused && styles.inputFocused, style]}
    />
  );
}

/** Small translucent ink label, e.g. an emotion you checked in with. */
export function InkChip({ label, icon }: { label: string; icon?: LucideIcon }) {
  return (
    <View style={styles.inkChip}>
      {icon ? <Icon icon={icon} size={14} color={C.onLight} stroke={2.4} /> : null}
      <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.onLight }}>{label}</Text>
    </View>
  );
}

/** Translucent ink panel on the flood, e.g. for the verdict's reasons. */
export function InkCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export const InkRule = () => <View style={{ height: 1, backgroundColor: INK_14 }} />;

/** Small ink capsule with a meaning-coloured label, e.g. a running total. */
export function InkPill({ label, icon, color = C.mist }: { label: string; icon?: LucideIcon; color?: string }) {
  return (
    <View style={styles.pill}>
      {icon ? <Icon icon={icon} size={15} color={color} stroke={2.4} /> : null}
      <Text style={{ fontFamily: F.bold, fontSize: 14, color }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: { flexGrow: 1, paddingHorizontal: S.gutter, width: '100%', maxWidth: 560, alignSelf: 'center' },
  btn: {
    minHeight: 56,
    borderRadius: R.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
    paddingHorizontal: S.xl,
  },
  outline: { borderWidth: 1.5, borderColor: C.onLight },
  textBtn: {
    minHeight: TOP_ROW,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingHorizontal: S.sm,
  },
  chip: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: R.pill,
    backgroundColor: INK_08,
  },
  input: {
    minHeight: 56,
    backgroundColor: INK_08,
    borderWidth: 1,
    borderColor: INK_14,
    borderRadius: R.control,
    paddingHorizontal: S.lg,
    paddingVertical: 15,
    color: C.onLight,
    fontSize: T.body,
    fontFamily: F.semi,
  },
  inputFocused: { borderColor: C.onLight, borderWidth: 1.5, paddingHorizontal: S.lg - 0.5 },
  inkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 30,
    paddingHorizontal: 11,
    borderRadius: R.pill,
    backgroundColor: INK_08,
  },
  card: {
    backgroundColor: INK_08,
    borderRadius: R.surface,
    padding: S.lg + 2,
    gap: S.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    height: 34,
    paddingHorizontal: 14,
    borderRadius: R.pill,
    backgroundColor: C.onLight,
  },
});
