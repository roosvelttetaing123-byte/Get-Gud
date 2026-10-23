/**
 * Motion primitives: Apple-style springs (duration + bounce).
 * - useSpringValue: JS spring for numbers (ring fill, count-ups). Cross-platform, no worklets.
 * - Pressy: any tappable thing; scales to 0.96 with a snappy spring, like iOS.
 * - useReduceMotion: honour the system setting.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { SPRING } from '@/constants/theme';

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduce(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
}

type Preset = keyof typeof SPRING;

/**
 * Animate a number toward `target` with a damped spring (duration/bounce model).
 * Returns the current value; re-renders each frame while moving.
 */
export function useSpringValue(target: number, preset: Preset = 'smooth', from?: number): number {
  const reduce = useReduceMotion();
  const [value, setValue] = useState(from ?? target);
  const state = useRef({ x: from ?? target, v: 0 });
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (reduce) {
      state.current = { x: target, v: 0 };
      return;
    }
    const { duration, dampingRatio } = SPRING[preset];
    // Map Apple's (duration, bounce) to stiffness/damping: omega = 2π / duration.
    const omega = (2 * Math.PI) / (duration / 1000);
    const k = omega * omega;
    const c = 2 * dampingRatio * omega;
    let last = 0;
    const step = (t: number) => {
      const dt = last ? Math.min(0.032, (t - last) / 1000) : 1 / 60;
      last = t;
      const s = state.current;
      const a = -k * (s.x - target) - c * s.v;
      s.v += a * dt;
      s.x += s.v * dt;
      if (Math.abs(s.x - target) < 0.0005 && Math.abs(s.v) < 0.001) {
        s.x = target;
        s.v = 0;
        setValue(target);
        raf.current = null;
        return;
      }
      setValue(s.x);
      raf.current = requestAnimationFrame(step);
    };
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
  }, [target, preset, reduce]);

  return reduce ? target : value;
}

/** Tappable with an iOS press response: scale down on press-in, spring back. */
export function Pressy({
  children,
  style,
  scaleTo = 0.96,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: PressableProps & { children: React.ReactNode; style?: StyleProp<ViewStyle>; scaleTo?: number }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, SPRING.snappy));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, SPRING.snappy));
        onPressOut?.(e);
      }}>
      <Animated.View style={[style, anim]}>{children}</Animated.View>
    </Pressable>
  );
}
