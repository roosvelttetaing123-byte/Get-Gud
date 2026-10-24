/**
 * Breathe-style bloom: six translucent petals in a ring that open outward and turn
 * as you breathe in, rest on the hold, and fold back in as you breathe out.
 * Transforms and opacity only, all driven by one 0..1 fullness value.
 * Reduce motion: the flower stays open and still, and only its light rises and falls.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useId } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { C, tint } from '@/constants/theme';

/** Outer edge colour, inner colour. Mint at the top, indigo at the bottom. */
const PETALS: [string, string][] = [
  [C.mint, C.cyan],
  [C.cyan, C.teal],
  [C.blue, C.cyan],
  [C.indigo, C.blue],
  [C.blue, C.indigo],
  [C.teal, C.mint],
];

const WEB = Platform.OS === 'web';
/** Screen blending makes overlaps glow, like light (web and new-arch iOS). */
const BLEND = { mixBlendMode: 'screen' } as const;
const LAYER = WEB ? ({ willChange: 'transform, opacity' } as object) : null;

export const Bloom = memo(function Bloom({
  fullness,
  size,
  reduce,
}: {
  fullness: Animated.Value;
  size: number;
  reduce: boolean;
}) {
  const d = size * 0.5;
  const at = (a: number, b: number) => fullness.interpolate({ inputRange: [0, 1], outputRange: [a, b] });

  const group = reduce
    ? { opacity: at(0.5, 1), transform: [{ scale: 0.86 }] }
    : {
        opacity: at(0.82, 1),
        transform: [
          { rotate: fullness.interpolate({ inputRange: [0, 1], outputRange: ['-28deg', '32deg'] }) },
          { scale: at(0.36, 1) },
        ],
      };
  const offset = reduce ? -d * 0.44 : at(-d * 0.18, -d * 0.5);

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Glow fullness={fullness} size={size} reduce={reduce} />
      <Animated.View style={[{ width: size, height: size }, LAYER, group]}>
        {PETALS.map(([outer, inner], i) => (
          <Animated.View
            key={i}
            style={[
              styles.petal,
              LAYER,
              BLEND,
              {
                width: d,
                height: d,
                borderRadius: d / 2,
                left: (size - d) / 2,
                top: (size - d) / 2,
                transform: [{ rotate: `${i * 60}deg` }, { translateY: offset }],
              },
            ]}>
            <LinearGradient
              colors={[tint(outer, 0.78), tint(inner, 0.42)]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: d / 2 }]}
            />
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
});

/** Soft cyan-to-indigo light behind the bloom that swells with it. */
function Glow({ fullness, size, reduce }: { fullness: Animated.Value; size: number; reduce: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const g = size * 1.7;
  const style = {
    opacity: fullness.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
    transform: reduce ? [] : [{ scale: fullness.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.04] }) }],
  };
  return (
    <Animated.View style={[styles.glow, LAYER, { width: g, height: g, left: (size - g) / 2, top: (size - g) / 2 }, style]}>
      <Svg width={g} height={g}>
        <Defs>
          <RadialGradient id={`bg${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={C.cyan} stopOpacity={0.3} />
            <Stop offset="0.35" stopColor={C.teal} stopOpacity={0.12} />
            <Stop offset="0.62" stopColor={C.indigo} stopOpacity={0.07} />
            <Stop offset="1" stopColor={C.indigo} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={g / 2} cy={g / 2} r={g / 2} fill={`url(#bg${id})`} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  petal: { position: 'absolute', overflow: 'hidden' },
  glow: { position: 'absolute' },
});
