/**
 * Paced breathing: in 4s, hold 4s, out 6s, looping.
 * Phases are computed from the session's absolute start time, so the pace
 * re-syncs correctly after the app has been in the background.
 */
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Easing, StyleSheet, View, useAnimatedValue } from 'react-native';

import { C, S, T } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { Display } from '@/ui';

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

const MIN_SCALE = 0.5;
/** Room reserved under the circle for the phase word. */
export const PHASE_WORD_SPACE = T.title + S.lg;

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

/** Memoised: the parent re-renders on every countdown tick; the circle only needs its own phase ticks. */
export const BreathingCircle = memo(function BreathingCircle({
  startAt,
  size,
  reduceMotion,
}: {
  startAt: number;
  size: number;
  reduceMotion: boolean;
}) {
  // A fresh object on every update, so an AppState resync re-runs the pacing effect
  // even when the phase hasn't changed.
  const [tick, setTick] = useState(() => ({ ord: ordinalAt(Date.now() - startAt) }));
  const fullness = useAnimatedValue(0);
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

  const word = PHASES[tick.ord % 3].word;
  // Reduce motion: no scaling, the disc only brightens and dims with the breath.
  const discStyle = useMemo(
    () =>
      reduceMotion
        ? { opacity: fullness.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }), transform: [{ scale: 0.8 }] }
        : {
            opacity: fullness.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }),
            transform: [{ scale: fullness.interpolate({ inputRange: [0, 1], outputRange: [MIN_SCALE, 1] }) }],
          },
    [reduceMotion, fullness],
  );

  return (
    <View style={styles.wrap}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: size, height: size }}>
        <View style={[styles.guide, { width: size, height: size, borderRadius: size / 2 }]} />
        <Animated.View style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }, discStyle]} />
      </View>
      <Display size={T.title} style={styles.word}>
        {word}
      </Display>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: S.lg },
  guide: { position: 'absolute', borderWidth: 1, borderColor: C.line },
  disc: { position: 'absolute', backgroundColor: C.raised, borderWidth: 2, borderColor: C.mist },
  word: { textAlign: 'center' },
});
