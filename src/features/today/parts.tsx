/**
 * Small building blocks for Today's sheets and cards, in the kit's style.
 */
import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { C, R, S } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { Pressy, Txt, isLight } from '@/ui';

/** A card inside a sheet: one step lighter than the sheet (tertiary grouped background). */
export function SheetCard({
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
    <View style={[styles.sheetCard, style]}>
      {title || aside ? (
        <View style={styles.head}>
          {title ? <Txt v="headline">{title}</Txt> : <View />}
          {aside}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/**
 * A big square-ish option tile (energy levels, day rating, quick picks).
 * Unselected: soft fill with the glyph in its colour. Selected: solid colour, dark or light glyph.
 */
export function OptionTile({
  icon: I,
  label,
  color,
  selected,
  onPress,
  height = 60,
  text,
  role = 'radio',
}: {
  icon?: LucideIcon;
  label: string;
  color: string;
  selected: boolean;
  onPress: () => void;
  height?: number;
  /** Show a text value instead of an icon (e.g. "7"). */
  text?: string;
  role?: 'radio' | 'button';
}) {
  const fg = selected ? (isLight(color) ? '#000000' : '#FFFFFF') : color;
  // Pressy styles its inner view, so the flex lives on a wrapper.
  return (
    <View style={styles.cell}>
      <Pressy
        accessibilityRole={role}
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        scaleTo={0.92}
        onPress={() => {
          haptic.tap();
          onPress();
        }}
        style={[styles.tile, { height, backgroundColor: selected ? color : C.fill3 }]}>
        {I ? <I size={24} color={fg} strokeWidth={2.2} /> : null}
        {text ? (
          <Txt v="headline" rounded tabular color={selected ? fg : C.label}>
            {text}
          </Txt>
        ) : null}
      </Pressy>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetCard: { backgroundColor: C.card2, borderRadius: R.card - 4, padding: S.lg, gap: S.md, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md, minHeight: 24 },
  cell: { flex: 1, minWidth: 0 },
  tile: { width: '100%', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
