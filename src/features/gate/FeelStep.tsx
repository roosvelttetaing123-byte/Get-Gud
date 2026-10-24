/**
 * Step 1, "How do you feel?" (Health State of Mind): one big mood shape,
 * its name, and a slider through the seven mood colours.
 */
import { Image } from 'expo-image';
import React from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { C, R, S, VALENCE } from '@/constants/theme';
import { Badge, Pressy, Txt } from '@/ui';

import type { SessionBadge } from './logic';
import { MOOD_SHAPES, MoodShape } from './MoodShape';
import { MoodSlider } from './MoodSlider';

export function FeelStep({
  valence,
  onChange,
  badges,
  morning,
  onSameAsMorning,
}: {
  valence: number;
  onChange: (v: number) => void;
  badges: SessionBadge[];
  morning?: number;
  onSameAsMorning: () => void;
}) {
  const { height } = useWindowDimensions();
  // The shape takes what's left once the controls fit; the caption goes on short phones.
  const size = Math.round(Math.max(140, Math.min(240, height - 540)));
  const short = height < 740;
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.page, short && { gap: S.md }]}
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical={false}>
      <View
        style={{ gap: S.sm, alignItems: 'center' }}
        accessible
        accessibilityLabel={`Today’s session: ${badges.map((b) => b.label).join(', ')}`}>
        {short ? null : (
          <Txt v="footnote" color={C.label2} weight="600">
            Today’s session
          </Txt>
        )}
        <View style={styles.badges}>
          {badges.map((b) => (
            <Badge key={b.key} label={b.label} color={b.color} solid={b.solid} />
          ))}
        </View>
      </View>

      <View style={{ alignItems: 'center', gap: S.xs }}>
        <Txt v="title2" align="center">
          How do you feel?
        </Txt>
        <Txt v="subhead" color={C.label2} align="center">
          Right now, before this trade.
        </Txt>
      </View>

      <View style={{ alignItems: 'center', gap: S.sm }}>
        <MoodShape valence={valence} size={size} />
        <Txt v="title1" align="center" style={{ marginTop: S.xs }} numberOfLines={1}>
          {VALENCE[valence - 1].label}
        </Txt>
      </View>

      <View style={{ gap: S.lg }}>
        <MoodSlider value={valence} onChange={onChange} />
        {morning ? (
          <View style={{ alignItems: 'center' }}>
            <Pressy
              accessibilityRole="button"
              accessibilityLabel={`Same as this morning, ${VALENCE[morning - 1].label}`}
              onPress={onSameAsMorning}
              scaleTo={0.94}
              style={styles.same}>
              <Image source={MOOD_SHAPES[morning - 1]} contentFit="contain" style={{ width: 24, height: 24 }} />
              <Txt v="subhead" weight="600" numberOfLines={1}>
                Same as this morning
              </Txt>
            </Pressy>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: S.lg,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: S.xl,
    paddingTop: S.sm,
    paddingBottom: S.xl,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  same: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38,
    paddingLeft: 8,
    paddingRight: 16,
    borderRadius: R.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
