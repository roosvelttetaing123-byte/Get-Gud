/**
 * Motion for the gate: Apple springs (SPRING presets) for React Native's Animated,
 * plus the step slide used between "How do you feel", "Name it" and "Rules".
 */
import React, { useEffect, useState } from 'react';
import { Animated, Platform, type StyleProp, type ViewStyle } from 'react-native';

import { SPRING } from '@/constants/theme';
import { useReduceMotion } from '@/ui';

/** The native driver isn't available on web. */
export const ND = Platform.OS !== 'web';

/** Apple (duration, damping ratio) spring as Animated.spring stiffness/damping. */
export function spring(preset: keyof typeof SPRING) {
  const { duration, dampingRatio } = SPRING[preset];
  const w = (2 * Math.PI) / (duration / 1000);
  return { stiffness: w * w, damping: 2 * dampingRatio * w, mass: 1, useNativeDriver: ND };
}

/** A value that springs from `from` to 1 once, on mount. Honours Reduce Motion. */
export function useEntrance(preset: keyof typeof SPRING = 'smooth', delay = 0, from = 0): Animated.Value {
  const reduce = useReduceMotion();
  const [v] = useState(() => new Animated.Value(from));
  useEffect(() => {
    if (reduce) {
      v.setValue(1);
      return;
    }
    const a = Animated.sequence([Animated.delay(delay), Animated.spring(v, { toValue: 1, ...spring(preset) })]);
    a.start();
    return () => a.stop();
  }, [v, preset, delay, reduce]);
  return v;
}

/**
 * A step that slides in from the side it came from (dir 1 = forward, from the right)
 * while it fades up. Key it by step so each step gets a fresh entrance.
 */
export function Slide({
  dir,
  children,
  style,
}: {
  dir: 1 | -1;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const p = useEntrance('smooth');
  return (
    <Animated.View
      style={[
        { flex: 1 },
        style,
        {
          opacity: p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }),
          transform: [{ translateX: p.interpolate({ inputRange: [0, 1], outputRange: [dir * 56, 0] }) }],
        },
      ]}>
      {children}
    </Animated.View>
  );
}
