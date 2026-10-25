/**
 * Get Gud UI kit v3: Apple iOS 26 patterns, dark-first.
 * Build every screen from these. Read DESIGN.md first.
 */
import { BlurView } from 'expo-blur';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useInsets } from './insets';

import { C, FONT, R, S, TAB_BAR_HEIGHT, TYPE, tint, type TypeStyle, type Weight } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

import { Backdrop } from './Backdrop';
import type { BackdropTone } from './glow';
import { Pressy, useSpringValue } from './motion';
import { HapticTarget, NativeSwitch } from './NativeSwitch';

export { Pressy, useReduceMotion, useSpringValue } from './motion';
export { Backdrop } from './Backdrop';
export type { BackdropTone, BackgroundStyle } from './glow';
export { HapticTarget, NativeSwitch } from './NativeSwitch';
export type { LucideIcon };

/* =========================================================================
 * Text
 * ========================================================================= */

export function Txt({
  v = 'body',
  color = C.label,
  weight,
  rounded,
  tabular,
  align,
  numberOfLines,
  style,
  children,
}: {
  v?: TypeStyle;
  color?: string;
  weight?: Weight;
  /** SF Pro Rounded (great for numbers and friendly headlines). */
  rounded?: boolean;
  /** Fixed-width digits for numbers that change. */
  tabular?: boolean;
  align?: TextStyle['textAlign'];
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}) {
  const t = TYPE[v];
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: rounded ? FONT.rounded : FONT.system,
          fontSize: t.size,
          lineHeight: t.line,
          fontWeight: weight ?? t.weight,
          color,
          textAlign: align,
        },
        tabular && { fontVariant: ['tabular-nums'] },
        style,
      ]}>
      {children}
    </Text>
  );
}

/** Big rounded number, Fitness-style. */
export function Num({
  children,
  size = 34,
  weight = '700',
  color = C.label,
  numberOfLines,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  weight?: Weight;
  color?: string;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: FONT.rounded,
          fontSize: size,
          lineHeight: Math.round(size * 1.12),
          fontWeight: weight,
          color,
          fontVariant: ['tabular-nums'],
        },
        style,
      ]}>
      {children}
    </Text>
  );
}

/* =========================================================================
 * Screen scaffolding
 * ========================================================================= */

/**
 * A tab screen: large left-aligned title, optional caption above it and accessory on the right,
 * plus a soft scroll-edge fade under the status bar once content scrolls.
 */
export function Screen({
  title,
  caption,
  accessory,
  children,
  scroll = true,
  modal = false,
  gap = S.section,
  contentStyle,
  backdrop = 'none',
}: {
  title?: string;
  caption?: string;
  accessory?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  /** Modal/sheet routes: no tab bar padding. */
  modal?: boolean;
  gap?: number;
  contentStyle?: StyleProp<ViewStyle>;
  /** Which colour glows behind this screen (Settings > Background decides the style). */
  backdrop?: BackdropTone;
}) {
  const insets = useInsets();
  const [scrolled, setScrolled] = useState(false);
  const top = modal ? S.xl : insets.top + S.sm;
  const bottom = (modal ? insets.bottom : insets.bottom + TAB_BAR_HEIGHT) + S.xxxl;

  const header = title ? (
    <View style={styles.titleRow}>
      <View style={{ flex: 1, gap: 2 }}>
        {caption ? (
          <Txt v="subhead" color={C.label2} weight="600">
            {caption}
          </Txt>
        ) : null}
        <Txt v="largeTitle">{title}</Txt>
      </View>
      {accessory}
    </View>
  ) : null;

  const content = (
    <>
      {header}
      {children}
    </>
  );

  if (!scroll) {
    return (
      <View style={[styles.screen, { paddingTop: top, paddingBottom: bottom }]}>
        <Backdrop tone={backdrop} />
        <View style={[styles.column, { gap }, contentStyle]}>{content}</View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Backdrop tone={backdrop} />
      <ScrollView
        style={StyleSheet.absoluteFill}
        contentContainerStyle={[styles.column, { paddingTop: top, paddingBottom: bottom, gap }, contentStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        scrollEventThrottle={32}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const y = e.nativeEvent.contentOffset.y > 8;
          if (y !== scrolled) setScrolled(y);
        }}>
        {content}
      </ScrollView>
      {/* scroll edge effect: content softly fades under the status bar */}
      <View
        pointerEvents="none"
        style={[styles.edge, { height: insets.top + 12, opacity: scrolled ? 1 : 0 }]}
      />
    </View>
  );
}

/** Section with an optional title row (Title 3) and trailing action. */
export function Section({
  title,
  action,
  footer,
  children,
  style,
}: {
  title?: string;
  action?: { label: string; onPress: () => void };
  footer?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap: S.sm }, style]}>
      {title || action ? (
        <View style={styles.sectionHead}>
          {title ? (
            <Txt v="title3" weight="700">
              {title}
            </Txt>
          ) : (
            <View />
          )}
          {action ? (
            <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={10}>
              <Txt v="subhead" color={C.tint} weight="600">
                {action.label}
              </Txt>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
      {footer ? (
        <Txt v="footnote" color={C.label2} style={{ paddingHorizontal: S.lg }}>
          {footer}
        </Txt>
      ) : null}
    </View>
  );
}

/** Opaque content card (secondarySystemGroupedBackground), 26pt radius. */
export function Card({
  children,
  style,
  padding = S.lg,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  if (onPress) {
    return (
      <Pressy
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => {
          haptic.tap();
          onPress();
        }}
        style={[styles.card, { padding }, style]}>
        {children}
      </Pressy>
    );
  }
  return <View style={[styles.card, { padding }, style]}>{children}</View>;
}

export function Row({
  children,
  gap = S.sm,
  style,
  align = 'center',
}: {
  children: React.ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  align?: ViewStyle['alignItems'];
}) {
  return <View style={[{ flexDirection: 'row', alignItems: align, gap }, style]}>{children}</View>;
}

export function Divider({ inset = 0 }: { inset?: number }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.separator, marginLeft: inset }} />;
}

/* =========================================================================
 * Settings-style grouped lists
 * ========================================================================= */

/** Coloured rounded-square icon with a white glyph (iOS Settings). */
export function IconSquare({ icon: I, color, size = 30 }: { icon: LucideIcon; color: string; size?: number }) {
  return (
    <View style={[styles.iconSquare, { width: size, height: size, backgroundColor: color, borderRadius: size * 0.24 }]}>
      <I size={size * 0.6} color="#FFFFFF" strokeWidth={2.2} />
    </View>
  );
}

/** Larger soft icon well, tinted (for cards and empty states). */
export function IconWell({ icon: I, color, size = 44 }: { icon: LucideIcon; color: string; size?: number }) {
  return (
    <View style={[styles.iconSquare, { width: size, height: size, backgroundColor: tint(color, 0.18), borderRadius: size * 0.3 }]}>
      <I size={size * 0.5} color={color} strokeWidth={2.2} />
    </View>
  );
}

/** Inset grouped list. Children should be <ListRow>s; separators are drawn for you. */
export function Group({
  header,
  footer,
  children,
  style,
}: {
  header?: string;
  footer?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ gap: 6 }, style]}>
      {header ? (
        <Txt v="footnote" color={C.label2} style={{ paddingHorizontal: S.lg }}>
          {header}
        </Txt>
      ) : null}
      <View style={styles.group}>
        {rows.map((r, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <Divider inset={React.isValidElement(r) && (r.props as { icon?: unknown }).icon ? 58 : S.lg} /> : null}
            {r}
          </React.Fragment>
        ))}
      </View>
      {footer ? (
        <Txt v="footnote" color={C.label2} style={{ paddingHorizontal: S.lg }}>
          {footer}
        </Txt>
      ) : null}
    </View>
  );
}

export function ListRow({
  icon,
  iconColor = C.gray,
  title,
  subtitle,
  value,
  chevron,
  accessory,
  onPress,
  destructive,
  titleColor,
}: {
  icon?: LucideIcon;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  chevron?: boolean;
  /** e.g. <NativeSwitch/>, a Stepper, a badge */
  accessory?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  titleColor?: string;
}) {
  const body = (
    <View style={styles.listRow}>
      {icon ? <IconSquare icon={icon} color={iconColor} /> : null}
      <View style={{ flex: 1, gap: 1, paddingVertical: subtitle ? 10 : 12 }}>
        <Txt v="body" color={destructive ? C.red : (titleColor ?? C.label)}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt v="footnote" color={C.label2}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {value ? (
        <Txt v="body" color={C.label2}>
          {value}
        </Txt>
      ) : null}
      {accessory}
      {chevron ? <ChevronRight size={18} color={C.label3} strokeWidth={2.4} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [pressed && { backgroundColor: C.fill4 }]}>
      {body}
    </Pressable>
  );
}

/** A list row with a real iOS switch. The row itself also toggles. */
export function ToggleRow({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  onChange,
  tint: tintColor = C.green,
}: {
  icon?: LucideIcon;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  tint?: string;
}) {
  // HapticTarget makes the whole row a genuine tap on the switch, so iOS plays its haptic tick.
  return (
    <HapticTarget>
      <View style={{ flex: 1 }}>
        <ListRow
          icon={icon}
          iconColor={iconColor}
          title={title}
          subtitle={subtitle}
          accessory={<NativeSwitch value={value} onValueChange={onChange} accessibilityLabel={title} tint={tintColor} />}
        />
      </View>
    </HapticTarget>
  );
}

/* =========================================================================
 * Controls
 * ========================================================================= */

type ButtonKind = 'filled' | 'tinted' | 'gray' | 'plain' | 'destructive' | 'glass';

/** iOS capsule button. `color` overrides the tint (e.g. a verdict colour). */
export function Button({
  title,
  onPress,
  kind = 'filled',
  size = 'large',
  icon: I,
  color = C.tint,
  textColor,
  disabled,
  full = true,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: ButtonKind;
  size?: 'large' | 'medium' | 'small';
  icon?: LucideIcon;
  color?: string;
  textColor?: string;
  disabled?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const h = size === 'large' ? 52 : size === 'medium' ? 42 : 32;
  const fs = size === 'small' ? 15 : 17;
  const bg =
    kind === 'filled'
      ? color
      : kind === 'tinted'
        ? tint(color, 0.2)
        : kind === 'gray'
          ? C.fill3
          : kind === 'destructive'
            ? tint(C.red, 0.18)
            : kind === 'glass'
              ? 'rgba(255,255,255,0.14)'
              : 'transparent';
  const fg =
    textColor ??
    (kind === 'filled'
      ? isLight(color)
        ? '#000000'
        : '#FFFFFF'
      : kind === 'destructive'
        ? C.red
        : kind === 'gray' || kind === 'glass'
          ? C.label
          : color);
  return (
    <Pressy
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        haptic.press();
        onPress();
      }}
      style={[
        styles.button,
        { height: h, backgroundColor: bg, opacity: disabled ? 0.4 : 1, paddingHorizontal: size === 'small' ? 14 : 22 },
        full ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' },
        style,
      ]}>
      {I ? <I size={fs + 2} color={fg} strokeWidth={2.3} /> : null}
      <Text style={{ fontFamily: FONT.system, fontSize: fs, fontWeight: '600', color: fg }}>{title}</Text>
    </Pressy>
  );
}

/** Round icon-only button (e.g. settings gear in a title row). */
export function IconButton({
  icon: I,
  label,
  onPress,
  color = C.label,
  bg = C.fill3,
  size = 36,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  color?: string;
  bg?: string;
  size?: number;
}) {
  return (
    <Pressy
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      scaleTo={0.9}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <I size={size * 0.52} color={color} strokeWidth={2.2} />
    </Pressy>
  );
}

/** Selectable capsule (Health "feelings" style). */
export function Chip({
  label,
  selected,
  onPress,
  color = C.tint,
  icon: I,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
  icon?: LucideIcon;
}) {
  const fg = selected ? (isLight(color) ? '#000' : '#FFF') : C.label;
  return (
    <Pressy
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      scaleTo={0.94}
      style={[styles.chip, { backgroundColor: selected ? color : C.fill3 }]}>
      {I ? <I size={16} color={selected ? fg : color} strokeWidth={2.3} /> : null}
      <Text style={{ fontFamily: FONT.system, fontSize: 15, fontWeight: '600', color: fg }}>{label}</Text>
    </Pressy>
  );
}

/** iOS segmented control with a sliding thumb. */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: V; label: string }[];
  value?: V;
  onChange: (v: V) => void;
}) {
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSpringValue(idx, 'snappy');
  const seg = options.length ? (w - 4) / options.length : 0;
  return (
    <View style={styles.segWrap} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {value !== undefined && w > 0 ? (
        <View style={[styles.segThumb, { width: seg, transform: [{ translateX: x * seg }] }]} />
      ) : null}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => {
              haptic.tap();
              onChange(o.value);
            }}
            style={styles.seg}>
            <Text style={{ fontFamily: FONT.system, fontSize: 14, fontWeight: on ? '600' : '500', color: C.label }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** − value + */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  format,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
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
      style={({ pressed }) => [styles.stepBtn, { opacity: dis ? 0.3 : pressed ? 0.6 : 1 }]}>
      <Text style={{ color: C.label, fontSize: 20, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {btn('−', Math.max(min, value - step), value <= min)}
      <View style={{ width: StyleSheet.hairlineWidth, height: 18, backgroundColor: C.separator }} />
      <Num size={17} weight="600" style={{ minWidth: 40, textAlign: 'center' }}>
        {format ? format(value) : value}
      </Num>
      <View style={{ width: StyleSheet.hairlineWidth, height: 18, backgroundColor: C.separator }} />
      {btn('+', Math.min(max, value + step), value >= max)}
    </View>
  );
}

/** iOS text field. Font is 17px so iOS never zooms. */
export function Field(props: TextInputProps & { label?: string }) {
  const { label, style, multiline, onFocus, onBlur, ...rest } = props;
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Txt v="footnote" color={C.label2} style={{ paddingHorizontal: 4 }}>
          {label}
        </Txt>
      ) : null}
      <TextInput
        placeholderTextColor={C.label3}
        selectionColor={C.tint}
        keyboardAppearance="dark"
        multiline={multiline}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.field,
          multiline && { minHeight: 88, textAlignVertical: 'top', paddingTop: 12 },
          { borderColor: focused ? tint(C.tint, 0.7) : 'transparent' },
          Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
          style,
        ]}
      />
    </View>
  );
}

/* =========================================================================
 * Data display
 * ========================================================================= */

export function Stat({
  value,
  label,
  color = C.label,
  size = 28,
}: {
  value: string;
  label: string;
  color?: string;
  size?: number;
}) {
  return (
    <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
      <Num size={size} color={color} numberOfLines={1}>
        {value}
      </Num>
      <Txt v="footnote" color={C.label2} numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}

/** Small status capsule. */
export function Badge({ label, color = C.tint, icon: I, solid }: { label: string; color?: string; icon?: LucideIcon; solid?: boolean }) {
  const fg = solid ? (isLight(color) ? '#000' : '#FFF') : color;
  return (
    <View style={[styles.badge, { backgroundColor: solid ? color : tint(color, 0.18) }]}>
      {I ? <I size={13} color={fg} strokeWidth={2.6} /> : null}
      <Text style={{ fontFamily: FONT.system, fontSize: 13, fontWeight: '700', color: fg }}>{label}</Text>
    </View>
  );
}

/** Empty state: icon, title, one line, one action. */
export function Empty({
  icon,
  color = C.tint,
  title,
  message,
  action,
}: {
  icon: LucideIcon;
  color?: string;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: S.xxl, gap: S.md }}>
      <IconWell icon={icon} color={color} size={56} />
      <View style={{ gap: 4, alignItems: 'center' }}>
        <Txt v="headline" align="center">
          {title}
        </Txt>
        {message ? (
          <Txt v="subhead" color={C.label2} align="center">
            {message}
          </Txt>
        ) : null}
      </View>
      {action ? <Button title={action.label} onPress={action.onPress} kind="tinted" size="medium" full={false} /> : null}
    </Card>
  );
}

/* =========================================================================
 * Glass (navigation layer only: tab bar, sheet headers, floating buttons)
 * ========================================================================= */

export function Glass({
  children,
  style,
  intensity = 60,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}) {
  return (
    <BlurView intensity={intensity} tint="systemChromeMaterialDark" style={[styles.glass, style]}>
      {children}
    </BlurView>
  );
}

/* ---------- helpers ---------- */

export function isLight(hex: string): boolean {
  const h = hex.replace('#', '');
  if (h.length < 6) return false;
  const n = parseInt(h.slice(0, 6), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  column: { width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: S.margin },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: S.md, marginBottom: -S.sm },
  edge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.62)',
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(18px) saturate(1.4)', WebkitBackdropFilter: 'blur(18px) saturate(1.4)' } as object)
      : null),
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  card: { backgroundColor: C.cardTranslucent, borderRadius: R.card, gap: S.md, overflow: 'hidden' },
  group: { backgroundColor: C.cardTranslucent, borderRadius: R.card, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, minHeight: 48 },
  iconSquare: { alignItems: 'center', justifyContent: 'center' },
  button: { borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 15, borderRadius: R.pill },
  segWrap: { flexDirection: 'row', backgroundColor: C.fill3, borderRadius: 10, padding: 2, height: 36 },
  segThumb: {
    position: 'absolute',
    top: 2,
    left: 2,
    bottom: 2,
    borderRadius: 8,
    backgroundColor: '#636366',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  seg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.fill3,
    borderRadius: 10,
    height: 34,
    paddingHorizontal: 4,
    gap: 2,
  },
  stepBtn: { width: 36, height: 34, alignItems: 'center', justifyContent: 'center' },
  field: {
    backgroundColor: C.card2,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.label,
    fontSize: 17,
    fontFamily: FONT.system,
  },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 26, paddingHorizontal: 10, borderRadius: R.pill, alignSelf: 'flex-start' },
  glass: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
});

/* ---------- composite components (separate files) ---------- */
export { MiniRing, ProgressRing, Ring, Rings } from './Rings';
export { Sheet } from './Sheet';
export { Celebration, Medal } from './Medal';
