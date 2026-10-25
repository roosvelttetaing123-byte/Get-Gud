/**
 * Today's three rings, Fitness style, and you can spin them: swipe sideways across the stack and
 * it turns with your finger, then a flick carries it round and it lands upright again. Rings that
 * close fill with the bouncy (reward) spring and the stack pulses; a perfect day pulses bigger.
 * A tap goes to `onTap` (the parent card's own press is muted so it never fires twice).
 */
import { Sparkles } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { C, RING, SPRING, type RingKey } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import type { RingDetail } from '@/lib/engage';
import { Ring, useReduceMotion, useSpringValue } from '@/ui';

export const RING_ORDER: RingKey[] = ['promises', 'mind', 'discipline'];

/** Long and smooth, so a flick reads as momentum and the stack lands upright without a wobble. */
const SPIN = { duration: 900, dampingRatio: 0.92 };

// pan-y: a vertical swipe still scrolls the page; a sideways one spins the rings.
const TOUCH = Platform.OS === 'web' ? ({ touchAction: 'pan-y', cursor: 'grab' } as object) : null;

function useRingSpring(v: number) {
  // Closing a ring gets the bouncy (reward) spring; everything else glides.
  return useSpringValue(v, v >= 1 ? 'bouncy' : 'smooth', 0);
}

const pulse = (peak: number) => withSequence(withTiming(peak, { duration: 140 }), withSpring(1, SPRING.bouncy));

export function TodayRings({
  details,
  perfect,
  size,
  onTap,
}: {
  details: RingDetail[];
  perfect: boolean;
  size: number;
  onTap?: () => void;
}) {
  const stroke = Math.round(size * 0.11);
  const gap = Math.max(2, Math.round(size * 0.018));
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

  // Spin: degrees, plus a little press-in so a touch on the rings still feels like a press.
  const angle = useSharedValue(0);
  const press = useSharedValue(1);
  const g = useRef({ x: 0, from: 0, lx: 0, lt: 0, v: 0, spinning: false });
  const degPerPx = 360 / (Math.PI * size); // a swipe across half the ring turns it half a turn

  const grant = (e: GestureResponderEvent) => {
    const { pageX, timestamp } = e.nativeEvent;
    cancelAnimation(angle);
    g.current = { x: pageX, from: angle.get(), lx: pageX, lt: timestamp, v: 0, spinning: false };
    press.set(withSpring(0.96, SPRING.snappy));
  };
  const move = (e: GestureResponderEvent) => {
    const s = g.current;
    const { pageX, timestamp } = e.nativeEvent;
    const dt = Math.max(1, timestamp - s.lt);
    s.v = (pageX - s.lx) / dt; // px per ms
    s.lx = pageX;
    s.lt = timestamp;
    const dx = pageX - s.x;
    if (!s.spinning && Math.abs(dx) > 6) {
      s.spinning = true;
      press.set(withSpring(1, SPRING.snappy));
    }
    if (s.spinning) angle.set(s.from + dx * degPerPx);
  };
  const end = (e: GestureResponderEvent, cancelled: boolean) => {
    const s = g.current;
    // A finger that rested before lifting has no fling left in it.
    if (e.nativeEvent.timestamp - s.lt > 80) s.v = 0;
    press.set(withSpring(1, SPRING.snappy));
    if (!s.spinning) {
      if (!cancelled) onTap?.();
      return;
    }
    // Land upright: the nearest whole turn in the direction of the flick.
    const v = reduce ? 0 : s.v * 1000 * degPerPx; // deg per second
    const target = Math.round((angle.get() + v * 0.28) / 360) * 360;
    if (target !== Math.round(s.from / 360) * 360) haptic.tap();
    angle.set(withSpring(target, { ...SPIN, velocity: v }));
  };

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() * press.get() }, { rotate: `${angle.get()}deg` }],
  }));

  return (
    <View
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => !g.current.spinning}
      onResponderGrant={grant}
      onResponderMove={move}
      onResponderRelease={(e) => end(e, false)}
      onResponderTerminate={(e) => end(e, true)}
      // The rings handle their own tap; stop the click reaching the card so it can't fire twice.
      {...(Platform.OS === 'web' ? { onClick: (e: { stopPropagation: () => void }) => e.stopPropagation() } : null)}
      style={[{ width: size, height: size }, TOUCH]}>
      <Animated.View style={[{ width: size, height: size }, spinStyle]}>
        <Svg width={size} height={size}>
          {RING_ORDER.map((k, i) => (
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
      {perfect ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Sparkles size={Math.round(size * 0.13)} color={C.tint} fill={C.tint} strokeWidth={1.6} />
        </View>
      ) : null}
    </View>
  );
}
