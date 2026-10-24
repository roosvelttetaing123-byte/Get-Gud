/**
 * Step 2, "Name it": big feeling chips coloured by what they mean for the next
 * trade (green good, orange smaller, red don't), then what it's about.
 * Suggestions from the mood are outlined, never pre-selected.
 */
import { Image } from 'expo-image';
import { type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { C, FONT, R, S, VALENCE, tint } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { isLight, Pressy, Txt } from '@/ui';

import { MOOD_SHAPES } from './MoodShape';
import { ASSOCIATIONS, FEELINGS, MEANING, meaningOf, worstMeaning } from './logic';
import { ABOUT_ICON, feelingIcon } from './look';

/** Selectable capsule. Large for feelings, regular for associations. */
function Pick({
  label,
  icon: I,
  color,
  selected,
  suggested,
  large,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  color: string;
  selected: boolean;
  suggested: boolean;
  large?: boolean;
  onPress: () => void;
}) {
  const h = large ? 46 : 38;
  const fg = selected && isLight(color) ? C.bg : C.label;
  return (
    <Pressy
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      accessibilityHint={suggested && !selected ? 'Suggested' : undefined}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      scaleTo={0.92}
      style={[
        styles.pick,
        {
          height: h,
          paddingHorizontal: large ? 16 : 14,
          backgroundColor: selected ? color : suggested ? tint(color, 0.16) : 'rgba(255,255,255,0.09)',
          borderColor: selected ? color : suggested ? tint(color, 0.85) : 'transparent',
        },
      ]}>
      <I size={large ? 18 : 16} color={selected ? fg : color} strokeWidth={2.3} />
      <Text style={[styles.pickText, { fontSize: large ? 16 : 15, color: fg }]}>{label}</Text>
    </Pressy>
  );
}

export function NameStep({
  valence,
  feelings,
  about,
  suggested,
  onToggleFeeling,
  onToggleAbout,
  onEditMood,
}: {
  valence: number;
  feelings: string[];
  about: string[];
  suggested: { feelings: string[]; about: string[] };
  onToggleFeeling: (label: string) => void;
  onToggleAbout: (label: string) => void;
  onEditMood: () => void;
}) {
  const worst = worstMeaning(feelings);
  const mood = VALENCE[valence - 1];
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      <View style={{ gap: S.md }}>
        <Pressy
          accessibilityRole="button"
          accessibilityLabel={`Mood: ${mood.label}. Change`}
          onPress={onEditMood}
          scaleTo={0.95}
          style={styles.mood}>
          <Image source={MOOD_SHAPES[valence - 1]} contentFit="contain" style={{ width: 30, height: 30 }} />
          <Txt v="subhead" weight="600">
            {mood.label}
          </Txt>
        </Pressy>
        <View style={{ gap: 2 }}>
          <Txt v="title1">Name it</Txt>
          <Txt v="subhead" color={C.label2}>
            Pick all that fit. Suggestions are outlined.
          </Txt>
        </View>
      </View>

      <View style={{ gap: S.md }}>
        <View style={styles.wrap}>
          {FEELINGS.map((f) => (
            <Pick
              key={f}
              large
              label={f}
              icon={feelingIcon(f)}
              color={MEANING[meaningOf(f)].color}
              selected={feelings.includes(f)}
              suggested={suggested.feelings.includes(f)}
              onPress={() => onToggleFeeling(f)}
            />
          ))}
        </View>
        <View style={styles.meaning} accessibilityLiveRegion="polite">
          <View style={[styles.dot, { backgroundColor: worst ? MEANING[worst].color : C.label3 }]} />
          <Txt v="subhead" weight="600" color={worst ? MEANING[worst].color : C.label2}>
            {worst ? MEANING[worst].label : 'Pick at least one'}
          </Txt>
        </View>
      </View>

      <View style={{ gap: S.md }}>
        <View style={{ gap: 2 }}>
          <Txt v="title3" weight="700">
            What’s it about?
          </Txt>
          <Txt v="subhead" color={C.label2}>
            Optional.
          </Txt>
        </View>
        <View style={styles.wrap}>
          {ASSOCIATIONS.map((a) => (
            <Pick
              key={a}
              label={a}
              icon={ABOUT_ICON[a]}
              color={C.tint}
              selected={about.includes(a)}
              suggested={suggested.about.includes(a)}
              onPress={() => onToggleAbout(a)}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: S.xxl,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: S.margin,
    paddingTop: S.sm,
    paddingBottom: S.xxxl,
  },
  mood: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: R.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: R.pill, borderWidth: 1.5 },
  pickText: { fontFamily: FONT.system, fontWeight: '600', color: C.label },
  meaning: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
