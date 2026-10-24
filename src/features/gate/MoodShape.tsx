/**
 * The State of Mind shape: seven pre-rendered 3D objects stacked and cross-faded
 * by a spring, over a soft radial glow in the mood colour. Pops when the value
 * changes and floats gently while idle.
 */
import { Image } from 'expo-image';
import React, { useEffect, useId, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useReduceMotion, useSpringValue } from '@/ui';

import { ND, spring } from './anim';
import { valenceRgb } from './logic';

/** mood-1 … mood-7, in valence order. */
export const MOOD_SHAPES = [
  require('@/assets/3d/mood-1.webp'),
  require('@/assets/3d/mood-2.webp'),
  require('@/assets/3d/mood-3.webp'),
  require('@/assets/3d/mood-4.webp'),
  require('@/assets/3d/mood-5.webp'),
  require('@/assets/3d/mood-6.webp'),
  require('@/assets/3d/mood-7.webp'),
];

/** Soft radial light in a colour, for behind 3D objects. */
export function Glow({ size, color, strength = 0.75 }: { size: number; color: string; strength?: number }) {
  const id = `glow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={strength} />
          <Stop offset="0.4" stopColor={color} stopOpacity={strength * 0.45} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

export function MoodShape({ valence, size = 240, float = true }: { valence: number; size?: number; float?: boolean }) {
  const reduce = useReduceMotion();
  const pos = useSpringValue(valence, 'smooth');
  const [c0, c1, c2] = valenceRgb(pos);
  const [pop] = useState(() => new Animated.Value(1));
  const [bob] = useState(() => new Animated.Value(0));
  const prev = useRef(valence);

  // A little bouncy pop each time the mood changes.
  useEffect(() => {
    if (prev.current === valence) return;
    prev.current = valence;
    if (reduce) return;
    const a = Animated.sequence([
      Animated.timing(pop, { toValue: 0.9, duration: 70, useNativeDriver: ND }),
      Animated.spring(pop, { toValue: 1, ...spring('bouncy') }),
    ]);
    a.start();
    return () => a.stop();
  }, [valence, pop, reduce]);

  // Idle float, like an object hanging in light.
  useEffect(() => {
    if (!float || reduce) return;
    const ease = Easing.inOut(Easing.sin);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 2600, easing: ease, useNativeDriver: ND }),
        Animated.timing(bob, { toValue: 0, duration: 2600, easing: ease, useNativeDriver: ND }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, float, reduce]);

  const glow = size * 1.7;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: (size - glow) / 2, top: (size - glow) / 2 }}>
        <Glow size={glow} color={`rgb(${c0},${c1},${c2})`} strength={0.9} />
      </View>
      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [3, -5] }) }, { scale: pop }],
        }}>
        {MOOD_SHAPES.map((src, i) => {
          const o = Math.max(0, 1 - Math.abs(pos - (i + 1)));
          return (
            <Image
              key={i}
              source={src}
              contentFit="contain"
              style={{ position: 'absolute', width: size, height: size, opacity: o }}
            />
          );
        })}
      </Animated.View>
    </View>
  );
}
