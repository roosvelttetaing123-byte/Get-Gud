/**
 * iOS sheet: slides up with a smooth spring over a dimmed backdrop, 36pt top corners,
 * grabber, optional title with Cancel/Done. Detents: medium (~60%) or large (~92%).
 */
import { X } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useInsets } from './insets';

import { C, R, S } from '@/constants/theme';

import { IconButton, Txt } from './index';
import { useSpringValue } from './motion';

export function Sheet({
  visible,
  onClose,
  title,
  detent = 'large',
  action,
  children,
  scroll = true,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  detent?: 'medium' | 'large';
  /** Trailing header action, e.g. { label: 'Done', onPress } */
  action?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const { height } = useWindowDimensions();
  const insets = useInsets();
  const sheetH = Math.round(height * (detent === 'large' ? 0.92 : 0.62));
  const p = useSpringValue(visible ? 1 : 0, 'smooth', 0);
  // Stay mounted while the close animation plays out.
  if (!visible && p < 0.01) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${0.55 * p})` }]} />
      <View
        style={[
          styles.sheet,
          { height: sheetH, paddingBottom: insets.bottom + S.lg, transform: [{ translateY: (1 - p) * (sheetH + 40) }] },
        ]}>
        <View style={styles.grabber} />
        {title || action ? (
          <View style={styles.header}>
            <IconButton icon={X} label="Close" onPress={onClose} size={32} color={C.label2} />
            <Txt v="headline" align="center" style={{ flex: 1 }} numberOfLines={1}>
              {title ?? ''}
            </Txt>
            <View style={{ minWidth: 32, alignItems: 'flex-end' }}>{action}</View>
          </View>
        ) : null}
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: S.margin, paddingTop: S.sm, gap: S.xl, paddingBottom: S.xxl }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingHorizontal: S.margin }}>{children}</View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.card,
    borderTopLeftRadius: R.sheet,
    borderTopRightRadius: R.sheet,
    overflow: 'hidden',
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: C.label3, marginTop: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingTop: S.sm, paddingBottom: S.sm },
});
