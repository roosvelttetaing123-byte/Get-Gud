/**
 * The streak flame grows up with you: orange for the first three weeks, blue from 21 days,
 * purple from 66 (the median time for a habit to stick). It flickers softly: the outer flame
 * sways from its base while the bright core breathes out of step. Static with Reduce Motion.
 */
import { Flame } from 'lucide-react-native';
import React, { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { C, RING, SYS } from '@/constants/theme';
import { useReduceMotion } from '@/ui';

export interface FlameStage {
  outer: string;
  core: string;
  /** For the streak number beside it. */
  text: string;
  /** Days until the next colour, and its name. */
  next?: { at: number; name: string };
}

export function flameStage(streak: number): FlameStage {
  if (streak >= 66) return { outer: SYS.purple, core: RING.mind.to, text: RING.mind.to };
  if (streak >= 21) return { outer: SYS.blue, core: SYS.cyan, text: SYS.cyan, next: { at: 66, name: 'purple' } };
  return { outer: SYS.orange, core: SYS.yellow, text: C.tint, next: { at: 21, name: 'blue' } };
}

const ease = Easing.inOut(Easing.sin);

export function StreakFlame({ streak, size = 34 }: { streak: number; size?: number }) {
  const reduce = useReduceMotion();
  const lit = streak > 0;
  const stage = flameStage(streak);
  const sway = useSharedValue(0);
  const breathe = useSharedValue(0);
  const id = `flame${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  useEffect(() => {
    if (reduce || !lit) {
      cancelAnimation(sway);
      cancelAnimation(breathe);
      sway.set(0);
      breathe.set(0);
      return;
    }
    // Uneven beats so it never looks like a metronome.
    sway.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 520, easing: ease }),
          withTiming(-0.6, { duration: 440, easing: ease }),
          withTiming(0.4, { duration: 360, easing: ease }),
          withTiming(0, { duration: 480, easing: ease }),
        ),
        -1,
      ),
    );
    breathe.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300, easing: ease }),
          withTiming(0.2, { duration: 420, easing: ease }),
          withTiming(0.8, { duration: 260, easing: ease }),
          withTiming(0, { duration: 380, easing: ease }),
        ),
        -1,
      ),
    );
    return () => {
      cancelAnimation(sway);
      cancelAnimation(breathe);
    };
  }, [reduce, lit, sway, breathe]);

  // Scale from the base: shift up by half the growth so the bottom stays planted.
  const outer = useAnimatedStyle(() => {
    const s = 1 + sway.get() * 0.05;
    return { transform: [{ translateY: (-(s - 1) * size) / 2 }, { skewX: `${sway.get() * 2.5}deg` }, { scaleY: s }] };
  });
  const core = useAnimatedStyle(() => {
    const s = 0.94 + breathe.get() * 0.12;
    return { opacity: 0.8 + breathe.get() * 0.2, transform: [{ translateY: (-(s - 1) * size * 0.5) / 2 }, { scale: s }] };
  });

  if (!lit) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Flame size={size * 0.88} color={C.label3} strokeWidth={2} />
      </View>
    );
  }

  const glow = size * 2.6;
  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <Svg width={glow} height={glow} style={[styles.glow, { left: (size - glow) / 2, top: (size - glow) / 2 }]} pointerEvents="none">
        <Defs>
          <RadialGradient id={id} cx="50%" cy="58%" r="50%">
            <Stop offset="0" stopColor={stage.outer} stopOpacity={0.3} />
            <Stop offset="0.5" stopColor={stage.outer} stopOpacity={0.12} />
            <Stop offset="1" stopColor={stage.outer} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={glow / 2} cy={glow / 2} r={glow / 2} fill={`url(#${id})`} />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, outer]}>
        <Flame size={size} color={stage.outer} fill={stage.outer} strokeWidth={1.6} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.coreBox, core]}>
        <Flame size={size * 0.5} color={stage.core} fill={stage.core} strokeWidth={1.4} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
  coreBox: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '9%' },
});
