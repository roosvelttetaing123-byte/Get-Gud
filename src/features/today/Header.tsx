/**
 * Header accessory (a Contacts-style monogram that opens Settings) and the quiet "why" quote.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Flame, Quote, Settings } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { C, R, S, SYS, tint } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { IconButton, Pressy, Txt } from '@/ui';

import { flameStage } from './StreakFlame';

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

/**
 * The streak beside the avatar, so it greets you before the day's empty rings do.
 * Its flame takes the streak's colour (orange, blue from 21, purple from 66). Opens Medals.
 */
export function StreakChip({ streak }: { streak: number }) {
  if (streak < 2) return null;
  const st = flameStage(streak);
  return (
    <Pressy
      accessibilityRole="button"
      accessibilityLabel={`${streak} day streak. Medals`}
      hitSlop={6}
      scaleTo={0.92}
      onPress={() => {
        haptic.tap();
        router.push('/awards');
      }}
      style={[styles.chip, { backgroundColor: tint(st.outer, 0.2) }]}>
      <Flame size={16} color={st.outer} fill={st.core} strokeWidth={2} />
      <Txt v="subhead" weight="700" rounded tabular color={st.text}>
        {streak}
      </Txt>
    </Pressy>
  );
}

/** Today's top-right corner: the streak chip, then the avatar. */
export function TodayAccessory({ name, streak }: { name: string; streak: number }) {
  return (
    <View style={styles.accessory}>
      <StreakChip streak={streak} />
      <ProfileButton name={name} />
    </View>
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
  accessory: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 11, borderRadius: R.pill },
  why: { alignItems: 'center', gap: S.sm, paddingHorizontal: S.xxl, paddingTop: S.sm },
});
