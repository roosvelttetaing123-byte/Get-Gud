/**
 * Paced breathing: in 4s, hold 4s, out 6s, looping.
 * Phases are computed from the session's absolute start time, so the pace
 * re-syncs correctly after the app has been in the background.
 *
 * useBreath() owns the pacing (phase word, a 0..1 "lung fullness" value, haptics);
 * BreathingOrb is the pure visual that follows it.
 */
import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { C, Pastel } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

const IN = 4000;
const HOLD = 4000;
const OUT = 6000;
const CYCLE = IN + HOLD + OUT;

/** from/to are lung fullness: 0 empty, 1 full. */
const PHASES = [
  { word: 'Breathe in', ms: IN, from: 0, to: 1 },
  { word: 'Hold', ms: HOLD, from: 1, to: 1 },
  { word: 'Breathe out', ms: OUT, from: 1, to: 0 },
] as const;

/** Phase ordinal at an elapsed time: cycle * 3 + phase index. Strictly increasing. */
function ordinalAt(elapsed: number): number {
  const e = Math.max(0, elapsed);
  const cycle = Math.floor(e / CYCLE);
  const c = e - cycle * CYCLE;
  return cycle * 3 + (c < IN ? 0 : c < IN + HOLD ? 1 : 2);
}

function phaseOffset(ord: number): number {
  const idx = ord % 3;
  return Math.floor(ord / 3) * CYCLE + (idx > 0 ? IN : 0) + (idx > 1 ? HOLD : 0);
}

/** Drives the breath from an absolute start time. Haptic tap on each natural phase change. */
export function useBreath(startAt: number) {
  // A fresh object on every update, so an AppState resync re-runs the pacing effect
  // even when the phase hasn't changed.
  const [tick, setTick] = useState(() => ({ ord: ordinalAt(Date.now() - startAt) }));
  const [fullness] = useState(() => new Animated.Value(0));
  const lastOrd = useRef<number | null>(null);

  useEffect(() => {
    const { ord } = tick;
    const p = PHASES[ord % 3];
    const begin = startAt + phaseOffset(ord);
    const now = Date.now();
    const left = Math.max(0, begin + p.ms - now);
    const progress = Math.min(1, Math.max(0, (now - begin) / p.ms));

    // Haptic only on a natural step to the next phase, not on mount or resync.
    if (lastOrd.current !== null && ord === lastOrd.current + 1) haptic.tap();
    lastOrd.current = ord;

    fullness.setValue(p.from + (p.to - p.from) * progress);
    const anim = Animated.timing(fullness, {
      toValue: p.to,
      duration: left,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    });
    anim.start();
    const next = setTimeout(() => setTick({ ord: ordinalAt(Date.now() - startAt) }), left + 20);
    return () => {
      anim.stop();
      clearTimeout(next);
    };
  }, [tick, startAt, fullness]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        lastOrd.current = null;
        setTick({ ord: ordinalAt(Date.now() - startAt) });
      }
    });
    return () => sub.remove();
  }, [startAt]);

  return { word: PHASES[tick.ord % 3].word, fullness };
}

/**
 * Layered glow that swells with the breath: a wide soft halo and a brighter core,
 * both radial gradients fading to transparent. With reduce motion it stays still
 * and only brightens and dims.
 */
export const BreathingOrb = memo(function BreathingOrb({
  fullness,
  size,
  reduceMotion,
}: {
  fullness: Animated.Value;
  size: number;
  reduceMotion: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const halo = size * 1.3;
  const core = size * 0.78;

  const haloStyle = useMemo(
    () =>
      reduceMotion
        ? { opacity: fullness.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] }), transform: [{ scale: 0.85 }] }
        : {
            opacity: fullness.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
            transform: [{ scale: fullness.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }],
          },
    [reduceMotion, fullness],
  );
  const coreStyle = useMemo(
    () =>
      reduceMotion
        ? { opacity: fullness.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), transform: [{ scale: 0.85 }] }
        : {
            opacity: fullness.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }),
            transform: [{ scale: fullness.interpolate({ inputRange: [0, 1], outputRange: [0.58, 1] }) }],
          },
    [reduceMotion, fullness],
  );

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.center, { width: size, height: size }]}>
      <Animated.View style={[styles.layer, { width: halo, height: halo }, haloStyle]}>
        <Svg width={halo} height={halo}>
          <Defs>
            <RadialGradient id={`halo${id}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={C.jade} stopOpacity={0.4} />
              <Stop offset="0.45" stopColor={C.accent} stopOpacity={0.22} />
              <Stop offset="1" stopColor={C.accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={halo / 2} cy={halo / 2} r={halo / 2} fill={`url(#halo${id})`} />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.layer, { width: core, height: core }, coreStyle]}>
        <Svg width={core} height={core}>
          <Defs>
            <RadialGradient id={`core${id}`} cx="50%" cy="50%" r="50%" fx="38%" fy="32%">
              <Stop offset="0" stopColor={Pastel.mint[1]} stopOpacity={0.75} />
              <Stop offset="0.4" stopColor={C.jade} stopOpacity={0.5} />
              <Stop offset="0.8" stopColor={C.accent} stopOpacity={0.32} />
              <Stop offset="1" stopColor={C.accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={core / 2} cy={core / 2} r={core / 2 - 1} fill={`url(#core${id})`} />
          <Circle cx={core / 2} cy={core / 2} r={core / 2 - 1} fill="none" stroke="rgba(242,245,251,0.16)" strokeWidth={1.5} />
        </Svg>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute' },
});
