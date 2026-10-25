/**
 * Header accessory (a Contacts-style monogram that opens Settings) and the quiet "why" quote.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Quote, Settings } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { C, S, SYS } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { IconButton, Pressy, Txt } from '@/ui';

const openSettings = () => router.push('/settings');

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  const w = words[0];
  return (w.length <= 2 ? w : w[0]).toUpperCase();
}

/** Monogram avatar like Apple's account button; falls back to a gear when there's no name. */
export function ProfileButton({ name }: { name: string }) {
  const ini = initials(name);
  if (!ini) return <IconButton icon={Settings} label="Settings" onPress={openSettings} />;
  return (
    <Pressy
      accessibilityRole="button"
      accessibilityLabel="Settings"
      hitSlop={8}
      scaleTo={0.9}
      onPress={() => {
        haptic.tap();
        openSettings();
      }}>
      <LinearGradient colors={[SYS.gray, SYS.gray2]} style={styles.avatar}>
        <Txt v="subhead" weight="700" rounded>
          {ini}
        </Txt>
      </LinearGradient>
    </Pressy>
  );
}

/** The reason he's doing this, at the very bottom of Today: a quote on the background, not another card. */
export function WhyQuote({ why }: { why: string }) {
  return (
    <View style={styles.why} accessible accessibilityLabel={`Your why: ${why}`}>
      <Quote size={18} color={C.tint} fill={C.tint} strokeWidth={1.5} />
      <Txt v="callout" color={C.label} align="center">
        {why}
      </Txt>
      <Txt v="footnote" weight="600" color={C.label3}>
        Your why
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  why: { alignItems: 'center', gap: S.sm, paddingHorizontal: S.xxl, paddingTop: S.sm },
});
