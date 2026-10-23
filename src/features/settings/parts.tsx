import { Text, View, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { C, F, Pastel, R, S, type PastelName } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { Divider, IconBadge, Small, Sub, type LucideIcon } from '@/ui';

/** rgba() overlay of a token hex, so screens never invent colours. */
export function alpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** IconBadge tinted from a pastel: the pastel's deeper stop over a soft wash of it. */
export function PastelBadge({ icon, pastel, size = 40 }: { icon: LucideIcon; pastel: PastelName; size?: number }) {
  const deep = Pastel[pastel][1];
  return <IconBadge icon={icon} color={deep} bg={alpha(deep, 0.16)} size={size} />;
}

/** Same geometry as IconBadge, with a number instead of an icon. */
export function NumberBadge({ n, pastel = 'sky', size = 40 }: { n: number; pastel?: PastelName; size?: number }) {
  const deep = Pastel[pastel][1];
  return (
    <View
      style={[
        styles.numberBadge,
        { width: size, height: size, borderRadius: size * 0.32, backgroundColor: alpha(deep, 0.16) },
      ]}>
      <Text style={{ fontFamily: F.extra, fontSize: size * 0.4, color: deep }}>{n}</Text>
    </View>
  );
}

/**
 * One line of a grouped settings card: badge on the left, label and detail in the middle,
 * control on the right. A long detail drops below the control so labels never get squeezed.
 */
export function SettingRow({
  badge,
  label,
  detail,
  control,
  style,
}: {
  badge: React.ReactNode;
  label: string;
  detail?: string;
  control?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.row, style]}>
      {badge}
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.rowTop}>
          <Text numberOfLines={2} style={styles.label}>
            {label}
          </Text>
          {control}
        </View>
        {detail ? <Small>{detail}</Small> : null}
      </View>
    </View>
  );
}

/** Small round remove button: an X in a soft circle, with a 44pt touch area. */
export function RemoveButton({ label, onPress, icon: I }: { label: string; onPress: () => void; icon: LucideIcon }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.remove, pressed && { backgroundColor: alpha(C.coral, 0.18) }]}>
      {({ pressed }) => <I size={15} color={pressed ? C.coral : C.haze} strokeWidth={2.6} />}
    </Pressable>
  );
}

/** Hairline that starts where the row text starts, like grouped iOS lists. */
export function InsetDivider({ inset = 52 }: { inset?: number }) {
  return (
    <View style={{ marginLeft: inset }}>
      <Divider />
    </View>
  );
}

/** Compact white pill for closing a modal. */
export function DoneButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Done"
      hitSlop={6}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.done, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}>
      <Text style={styles.doneText}>Done</Text>
    </Pressable>
  );
}

/** Quiet note under a grouped card, iOS section-footer style. */
export function CardNote({ children }: { children: React.ReactNode }) {
  return <Sub style={{ paddingHorizontal: S.xs, fontSize: 13, lineHeight: 19 }}>{children}</Sub>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md, paddingVertical: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: S.sm, minHeight: 40 },
  label: { flex: 1, fontFamily: F.bold, fontSize: 16, lineHeight: 21, color: C.mist, letterSpacing: -0.2 },
  numberBadge: { alignItems: 'center', justifyContent: 'center' },
  done: {
    height: 38,
    paddingHorizontal: 18,
    borderRadius: R.pill,
    backgroundColor: C.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { fontFamily: F.bold, fontSize: 15, color: C.onLight },
  remove: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
