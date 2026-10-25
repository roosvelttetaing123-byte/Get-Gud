/**
 * Today's hero, Fitness Summary style: the rings at the left (spin them), the three ring stats
 * stacked at the right: the label in the ring colour, a big rounded value, a short caption.
 * Tap the card for "Today's rings": exactly what's left to close each one.
 */
import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { C, RING, S, type RingKey } from '@/constants/theme';
import type { RingDetail } from '@/lib/engage';
import { haptic } from '@/lib/haptics';
import { Card, Num, Txt } from '@/ui';

import { RING_ORDER, TodayRings } from './TodayRings';
import { mix } from './visuals';

/** The legend colour: the middle of the ring's sweep. */
export const ringColor = (k: RingKey) => mix(RING[k].from, RING[k].to, 0.35);

/** The value and its short caption, read like Fitness's "350/500 kcal". */
export function ringStat(d: RingDetail, evening: boolean): { value: string; caption: string } {
  if (d.key === 'promises') return d.total ? { value: `${d.done}/${d.total}`, caption: 'kept' } : { value: '–', caption: 'add some' };
  if (d.key === 'mind') {
    if (d.done === 2) return { value: '2/2', caption: 'done' };
    // The engine's caption names the missing ritual: "Check in" or "Close the day".
    const next = d.caption === 'Check in' ? 'check in' : evening ? 'close the day' : 'close tonight';
    return { value: `${d.done}/2`, caption: next };
  }
  return d.total ? { value: `${d.done}/${d.total}`, caption: 'by the rules' } : { value: '100%', caption: 'no trades' };
}

export function HeroRings({
  details,
  perfect,
  evening,
  onPress,
}: {
  details: RingDetail[];
  perfect: boolean;
  /** Close-the-day time: the Mind caption asks for it now rather than "tonight". */
  evening: boolean;
  onPress: () => void;
}) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 600);
  const size = Math.round(Math.max(132, Math.min(160, w * 0.385)));
  const valueSize = w < 375 ? 22 : 24;
  const by = Object.fromEntries(details.map((d) => [d.key, d])) as Record<RingKey, RingDetail>;
  const label = `${perfect ? 'Perfect day. ' : ''}${details.map((d) => `${d.label}: ${d.caption}`).join('. ')}. Show what's left`;

  return (
    <Card onPress={onPress} accessibilityLabel={label} padding={S.lg}>
      <View style={styles.row}>
        <TodayRings
          details={details}
          perfect={perfect}
          size={size}
          onTap={() => {
            haptic.tap();
            onPress();
          }}
        />
        <View style={styles.stats}>
          {RING_ORDER.map((k) => {
            const s = ringStat(by[k], evening);
            return (
              <View key={k}>
                <Txt v="footnote" weight="600" color={ringColor(k)} numberOfLines={1}>
                  {by[k].label}
                </Txt>
                <View style={styles.value}>
                  <Num size={valueSize} weight="700" numberOfLines={1}>
                    {s.value}
                  </Num>
                  <Txt v="footnote" weight="500" color={C.label2} numberOfLines={1} style={styles.caption}>
                    {s.caption}
                  </Txt>
                </View>
              </View>
            );
          })}
        </View>
      </View>
      <View pointerEvents="none" style={styles.chevron}>
        <ChevronRight size={18} color={C.label3} strokeWidth={2.6} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: S.lg },
  stats: { flex: 1, minWidth: 0, gap: 6 },
  value: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  caption: { flexShrink: 1 },
  chevron: { position: 'absolute', top: S.lg, right: S.md },
});
