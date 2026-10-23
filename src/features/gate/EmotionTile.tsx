/**
 * The kit Tile, tuned for a three-column grid of one-word emotions: tighter
 * padding, a title sized to the column so no label ever breaks mid-word, and
 * a check badge only on selected tiles.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { Check, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, F, Pastel, R, S, type PastelName } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { Icon } from '@/ui/legacy';

/** "Frustrated", the widest emotion label, in ems of Plus Jakarta Sans Bold. */
const WIDEST_EM = 5.14;
const PAD = 12;

/** Title size that fits the widest label in a column of `columnWidth`, between 12 and 15. */
export function emotionTitleSize(columnWidth: number) {
  const inner = columnWidth - PAD * 2 - 2;
  return Math.max(12, Math.min(15, Math.floor((inner / WIDEST_EM) * 2) / 2));
}

export function EmotionTile({
  label,
  icon,
  pastel,
  selected,
  titleSize = 15,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  pastel: PastelName;
  selected: boolean;
  titleSize?: number;
  onPress: () => void;
}) {
  const [a, b] = Pastel[pastel];
  const content = (
    <>
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: selected ? 'rgba(13,20,36,0.1)' : 'rgba(255,255,255,0.06)' }]}>
          <Icon icon={icon} size={18} color={selected ? C.onLight : b} />
        </View>
        {selected ? (
          <View style={styles.check}>
            <Icon icon={Check} size={12} color={a} stroke={3.6} />
          </View>
        ) : null}
      </View>
      <Text
        numberOfLines={1}
        style={{
          fontFamily: F.bold,
          fontSize: titleSize,
          lineHeight: Math.round(titleSize * 1.27),
          color: selected ? C.onLight : C.mist,
        }}>
        {label}
      </Text>
    </>
  );
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.wrap, pressed && { transform: [{ scale: 0.97 }] }]}>
      {selected ? (
        <LinearGradient colors={[a, b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.tile, styles.on]}>
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.tile, styles.off]}>{content}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: R.tile, flexGrow: 1 },
  tile: {
    flexGrow: 1,
    borderRadius: R.tile,
    borderWidth: 1,
    padding: PAD,
    minHeight: 104,
    justifyContent: 'space-between',
    gap: S.md,
  },
  on: { borderColor: 'rgba(255,255,255,0.3)' },
  off: { backgroundColor: C.surface, borderColor: C.line },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.onLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
