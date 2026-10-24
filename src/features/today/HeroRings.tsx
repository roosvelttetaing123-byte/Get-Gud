/**
 * Today's hero: the three rings, Fitness Summary style, with a coloured legend.
 * Built on the kit's single `Ring` so each ring can pick its own spring: rings that
 * close use the bouncy spring, and the whole stack pulses when a ring closes or the
 * day turns perfect.
 */
import { Sparkles } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { C, RING, S, SPRING, type RingKey } from '@/constants/theme';
import type { RingDetail } from '@/lib/engage';
import { Badge, Card, Num, Ring, Txt, useReduceMotion, useSpringValue } from '@/ui';

import { mix } from './visuals';

const ORDER: RingKey[] = ['promises', 'mind', 'discipline'];

/** The legend colour: the middle of the ring's sweep. */
export const ringColor = (k: RingKey) => mix(RING[k].from, RING[k].to, 0.35);

function useRingSpring(v: number) {
  // Closing a ring gets the bouncy (reward) spring; everything else glides.
  return useSpringValue(v, v >= 1 ? 'bouncy' : 'smooth', 0);
}

const pulse = (peak: number) =>
  withSequence(withTiming(peak, { duration: 140 }), withSpring(1, SPRING.bouncy));

/** The value already says "2/4", so drop a leading "2 of 4" from the caption ("kept", "by the rules"). */
function captionText(d: RingDetail) {
  const short = d.caption.replace(/^\d+ of \d+ /, '');
  return short.charAt(0).toUpperCase() + short.slice(1);
}

function valueText(d: RingDetail) {
  if (d.key === 'discipline' && d.total === 0) return '100%';
  if (d.total === 0) return '–';
  return `${d.done}/${d.total}`;
}

export function HeroRings({ details, perfect }: { details: RingDetail[]; perfect: boolean }) {
  const { width } = useWindowDimensions();
  const inner = Math.min(width, 600) - S.margin * 2 - S.lg * 2;
  const size = Math.round(Math.max(180, Math.min(236, inner * 0.72)));
  const stroke = Math.round(size * 0.112);
  const gap = 3;

  const by = Object.fromEntries(details.map((d) => [d.key, d])) as Record<RingKey, RingDetail>;
  const a = useRingSpring(by.promises.value);
  const b = useRingSpring(by.mind.value);
  const c = useRingSpring(by.discipline.value);
  const anim = [a, b, c];

  // One-off bouncy pulse: when the Promises ring closes, and (bigger) when the day turns perfect.
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  const prev = useRef<{ promises: number; perfect: boolean } | null>(null);
  const promises = by.promises.value;
  useEffect(() => {
    const was = prev.current;
    prev.current = { promises, perfect };
    if (reduce) return;
    if (!was) {
      if (perfect) scale.set(withDelay(650, pulse(1.06)));
      return;
    }
    if (perfect && !was.perfect) scale.set(pulse(1.07));
    else if (promises >= 1 && was.promises < 1) scale.set(pulse(1.04));
  }, [promises, perfect, reduce, scale]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const label = details.map((d) => `${d.label}: ${d.caption}`).join('. ');

  return (
    <Card padding={S.lg} style={styles.card}>
      <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.center}>
        <Animated.View style={[{ width: size, height: size }, pulseStyle]}>
          <Svg width={size} height={size}>
            {ORDER.map((k, i) => (
              <Ring
                key={k}
                value={anim[i]}
                size={size - i * 2 * (stroke + gap)}
                stroke={stroke}
                from={RING[k].from}
                to={RING[k].to}
                track={RING[k].track}
                cx={size / 2}
                cy={size / 2}
              />
            ))}
          </Svg>
        </Animated.View>
      </View>

      <View style={styles.legend}>
        {ORDER.map((k) => {
          const d = by[k];
          return (
            <View key={k} style={styles.item}>
              <Txt v="subhead" weight="600" color={ringColor(k)} numberOfLines={1}>
                {d.label}
              </Txt>
              <Num size={26} weight="700" numberOfLines={1}>
                {valueText(d)}
              </Num>
              <Txt v="caption1" color={C.label2} align="center" numberOfLines={2}>
                {captionText(d)}
              </Txt>
            </View>
          );
        })}
      </View>

      {perfect ? (
        <View style={styles.badgeRow}>
          <Badge label="Perfect day" icon={Sparkles} color={C.tint} solid />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingTop: S.xl, paddingBottom: S.xl, gap: S.xl },
  center: { alignItems: 'center' },
  badgeRow: { flexDirection: 'row', justifyContent: 'center', marginTop: -S.sm },
  legend: { flexDirection: 'row', gap: S.sm },
  item: { flex: 1, alignItems: 'center', gap: 1, minWidth: 0 },
});
