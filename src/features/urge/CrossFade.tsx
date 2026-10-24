/**
 * Cross-fades between string values: the old one fades out in place while the
 * new one fades in and settles up a few points. Reduce motion drops the lift.
 */
import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useReduceMotion } from '@/ui';

import { NATIVE } from './hooks';

export function CrossFade({
  value,
  render,
  duration = 700,
  lift = 8,
  style,
}: {
  value: string;
  render: (v: string) => React.ReactNode;
  duration?: number;
  lift?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReduceMotion();
  const [cur, setCur] = useState(value);
  const [prev, setPrev] = useState<string | null>(null);
  const [t] = useState(() => new Animated.Value(0));
  if (value !== cur) {
    setPrev(cur);
    setCur(value);
  }

  useEffect(() => {
    t.setValue(0);
    const a = Animated.timing(t, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE });
    a.start();
    return () => a.stop();
  }, [cur, t, duration]);

  const outOpacity = t.interpolate({ inputRange: [0, 0.55], outputRange: [1, 0], extrapolate: 'clamp' });
  const inOpacity = t.interpolate({ inputRange: [0.2, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const inLift = t.interpolate({ inputRange: [0, 1], outputRange: [reduce ? 0 : lift, 0] });

  return (
    <View style={style}>
      {prev !== null ? (
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[StyleSheet.absoluteFill, { opacity: outOpacity }]}>
          {render(prev)}
        </Animated.View>
      ) : null}
      <Animated.View style={{ opacity: inOpacity, transform: [{ translateY: inLift }] }}>{render(cur)}</Animated.View>
    </View>
  );
}
