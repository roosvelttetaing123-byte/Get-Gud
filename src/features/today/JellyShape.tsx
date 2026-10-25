/**
 * A mood shape you can poke. A tap squashes it and it wobbles back like jelly; a drag pulls it a
 * little toward the finger, stretching along the drag, and it springs home when you let go.
 * Transform-only (translate, scale, rotate) on a small leaf view, so it stays smooth on iPhone.
 * Static with Reduce Motion.
 */
import { Image, type ImageSource } from 'expo-image';
import React, { useEffect, useRef } from 'react';
import { Platform, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';

import { SPRING } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { useReduceMotion } from '@/ui';

/** The kit's bouncy spring, loosened so it wobbles a few times before it settles: that's the jelly. */
const JELLY = { duration: SPRING.bouncy.duration, dampingRatio: 0.3 };

const TOUCH = Platform.OS === 'web' ? ({ touchAction: 'none', cursor: 'grab' } as object) : null;

const clamp = (x: number, a: number) => Math.max(-a, Math.min(a, x));
/** Follows the finger less the further it goes, like pulling on something soft. */
const rubber = (d: number, max: number) => ((max * d) / (max + Math.abs(d))) * 0.9;

/** Squash flat, then let the jelly spring take it (it overshoots into a stretch and back). */
function boing(sx: SharedValue<number>, sy: SharedValue<number>, amount: number) {
  sx.set(withSequence(withTiming(1 + amount, { duration: 80 }), withSpring(1, JELLY)));
  sy.set(withSequence(withTiming(1 - amount, { duration: 80 }), withSpring(1, JELLY)));
}

export function JellyShape({
  source,
  size,
  kick,
  label,
  style,
}: {
  source: ImageSource;
  size: number;
  /** Change this (e.g. the mood value) to make it wobble on its own. */
  kick?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReduceMotion();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const rot = useSharedValue(0);
  const g = useRef({ x: 0, y: 0, t: 0, lx: 0, ly: 0, lt: 0, vx: 0, vy: 0, moved: false });

  // Wobble when the value changes (not on first mount).
  const shown = useRef(kick);
  useEffect(() => {
    if (shown.current === kick) return;
    shown.current = kick;
    if (!reduce) boing(sx, sy, 0.12);
  }, [kick, reduce, sx, sy]);

  const style2 = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.get() },
      { translateY: ty.get() },
      { rotate: `${rot.get()}deg` },
      { scaleX: sx.get() },
      { scaleY: sy.get() },
    ],
  }));

  const pull = size * 0.18; // how far it follows the finger
  const grant = (e: GestureResponderEvent) => {
    const { pageX, pageY, timestamp } = e.nativeEvent;
    g.current = { x: pageX, y: pageY, t: timestamp, lx: pageX, ly: pageY, lt: timestamp, vx: 0, vy: 0, moved: false };
    if (reduce) return;
    haptic.tap();
    // A poke: it gives under the finger straight away.
    sx.set(withSpring(1.08, SPRING.snappy));
    sy.set(withSpring(0.9, SPRING.snappy));
  };
  const move = (e: GestureResponderEvent) => {
    const s = g.current;
    const { pageX, pageY, timestamp } = e.nativeEvent;
    const dt = Math.max(1, timestamp - s.lt);
    s.vx = (pageX - s.lx) / dt;
    s.vy = (pageY - s.ly) / dt;
    s.lx = pageX;
    s.ly = pageY;
    s.lt = timestamp;
    const dx = pageX - s.x;
    const dy = pageY - s.y;
    if (Math.hypot(dx, dy) > 6) s.moved = true;
    if (reduce || !s.moved) return;
    // Lean toward the finger and stretch along the pull, keeping its volume.
    const d = Math.hypot(dx, dy);
    const k = Math.min(0.28, d / (size * 2.2));
    const along = 1 + k;
    const across = 1 / Math.sqrt(along);
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    tx.set(rubber(dx, pull));
    ty.set(rubber(dy, pull));
    rot.set(clamp(dx * 0.08, 10));
    sx.set(horizontal ? along : across);
    sy.set(horizontal ? across : along);
  };
  const release = (e: GestureResponderEvent) => {
    const s = g.current;
    if (reduce) return;
    // A finger that rested before lifting has no fling left in it.
    if (e.nativeEvent.timestamp - s.lt > 80) s.vx = s.vy = 0;
    if (!s.moved) {
      boing(sx, sy, 0.16);
      return;
    }
    // Spring home with the flick's speed, so a fling wobbles more than a slow let-go.
    tx.set(withSpring(0, { ...JELLY, velocity: clamp(s.vx * 300, 1600) }));
    ty.set(withSpring(0, { ...JELLY, velocity: clamp(s.vy * 300, 1600) }));
    rot.set(withSpring(0, JELLY));
    sx.set(withSpring(1, JELLY));
    sy.set(withSpring(1, JELLY));
  };

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={grant}
      onResponderMove={move}
      onResponderRelease={release}
      onResponderTerminate={release}
      style={[{ width: size, height: size }, TOUCH, style]}>
      <Animated.View style={[{ width: size, height: size }, style2]}>
        <Image source={source} style={{ width: size, height: size }} contentFit="contain" transition={120} />
      </Animated.View>
    </View>
  );
}
