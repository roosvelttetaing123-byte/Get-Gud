/**
 * First-run setup pieces, in the style of Apple's setup flows: a colourful glyph that pops in,
 * a centred Title 1 with one line, page dots that follow the slide spring, and reward objects.
 */
import type { ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useId, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { C, RING, S, tint } from '@/constants/theme';
import { Glow } from '@/features/awards/parts';
import { Medal, Rings, Txt, useReduceMotion, useSpringValue, type LucideIcon } from '@/ui';

/* ---------- hero glyph ---------- */

/** A rounded square filled with a two-colour gradient and a white glyph, popping in with a spring. */
export function HeroGlyph({ icon: I, colors, size = 76 }: { icon: LucideIcon; colors: readonly [string, string]; size?: number }) {
  const pop = useSpringValue(1, 'bouncy', 0.55);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        transform: [{ scale: pop }],
        boxShadow: `0 10px 34px ${tint(colors[1], 0.38)}`,
      }}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.glyph, { width: size, height: size, borderRadius: size * 0.28 }]}>
        <I size={size * 0.5} color="#FFFFFF" strokeWidth={2.1} />
      </LinearGradient>
    </View>
  );
}

/** Hero + Title 1 + one short line, centred. */
export function StepHead({ hero, title, line, big }: { hero?: React.ReactNode; title: string; line?: string; big?: boolean }) {
  return (
    <View style={styles.head}>
      {hero}
      <View style={{ gap: S.sm, alignItems: 'center' }}>
        <Txt v={big ? 'largeTitle' : 'title1'} align="center">
          {title}
        </Txt>
        {line ? (
          <Txt v="body" color={C.label2} align="center" style={{ maxWidth: 340 }}>
            {line}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

/* ---------- page dots ---------- */

/** UIPageControl-style dots. `at` is the live (springing) page position, so dots cross-fade with the slide. */
export function PageDots({ count, at }: { count: number; at: number }) {
  const page = Math.round(at);
  return (
    <View style={styles.dots} accessible accessibilityRole="text" accessibilityLabel={`Page ${page + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => {
        const k = Math.max(0, 1 - Math.abs(at - i));
        return <View key={i} style={[styles.dot, { opacity: 0.26 + 0.74 * k }]} />;
      })}
    </View>
  );
}

/* ---------- welcome rings ---------- */

/** The three rings fill one after another, then the legend explains them. */
export function WelcomeRings({ size }: { size: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const ts = [160, 380, 600].map((ms, i) => setTimeout(() => setN(i + 1), ms));
    return () => ts.forEach(clearTimeout);
  }, []);
  const pop = useSpringValue(1, 'bouncy', 0.86);
  const stage = size * 1.5;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pop }] }}>
      <View style={{ position: 'absolute', width: stage, height: stage, left: (size - stage) / 2, top: (size - stage) / 2 }}>
        <Glow size={stage} color={RING.mind.from} strength={0.26} />
      </View>
      <Rings
        values={{ promises: n >= 1 ? 0.8 : 0, mind: n >= 2 ? 0.6 : 0, discipline: n >= 3 ? 1 : 0 }}
        size={size}
        stroke={Math.round(size * 0.115)}
        gap={Math.round(size * 0.02)}
      />
    </View>
  );
}

export function RingLegend() {
  const items = [RING.promises, RING.mind, RING.discipline];
  return (
    <View style={styles.legend}>
      {items.map((r) => (
        <View key={r.label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: r.from }]} />
          <Txt v="subhead" weight="600" color={r.from}>
            {r.label}
          </Txt>
        </View>
      ))}
    </View>
  );
}

/* ---------- floating medal ---------- */

/** A 3D medal hovering with a gentle bob, its warm light pooling beneath it. Pressable to tilt. */
export function FloatingMedal({ image, size, label }: { image: ImageSource; size: number; label: string }) {
  const reduce = useReduceMotion();
  const bob = useSharedValue(0);
  useEffect(() => {
    if (reduce) {
      cancelAnimation(bob);
      bob.set(0);
      return;
    }
    bob.set(withRepeat(withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(bob);
  }, [reduce, bob]);
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: -12 * bob.get() }] }));
  const pool = useAnimatedStyle(() => ({ opacity: 0.9 - 0.4 * bob.get(), transform: [{ scaleX: 1 - 0.16 * bob.get() }] }));
  const pop = useSpringValue(1, 'bouncy', 0.4);
  const id = `pool${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const stage = size * 1.6;
  return (
    <View style={{ width: size, height: size + 34, alignItems: 'center', transform: [{ scale: pop }] }}>
      <View style={{ position: 'absolute', width: stage, height: stage, left: (size - stage) / 2, top: (size - stage) / 2 }}>
        <Glow size={stage} color={C.tint} strength={0.34} />
      </View>
      <Animated.View style={[{ position: 'absolute', bottom: 0, width: size * 0.8, height: 26 }, pool]}>
        <Svg width={size * 0.8} height={26}>
          <Defs>
            <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor={C.tint} stopOpacity={0.5} />
              <Stop offset="1" stopColor={C.tint} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={size * 0.4} cy={13} rx={size * 0.4} ry={13} fill={`url(#${id})`} />
        </Svg>
      </Animated.View>
      <Animated.View style={float}>
        <Medal image={image} size={size} label={label} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  glyph: { alignItems: 'center', justifyContent: 'center' },
  head: { alignItems: 'center', gap: S.xl },
  dots: { flexDirection: 'row', gap: 9, alignSelf: 'center', height: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.label },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: S.lg, rowGap: S.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
});
