import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Animated, AppState, Easing, Platform } from 'react-native';

import { haptic } from '@/lib/haptics';

export const NATIVE = Platform.OS !== 'web';

/**
 * Countdown to an absolute timestamp. Remaining time is always recomputed from
 * Date.now(), so it stays correct after the app is backgrounded (JS timers pause
 * there; we recompute as soon as the app is active again).
 * While `active` is false the clock is frozen and onDone never fires.
 */
export function useCountdown(endAt: number, active: boolean, onDone: () => void) {
  const [now, setNow] = useState(() => Date.now());
  const done = useEffectEvent(onDone);

  useEffect(() => {
    if (!active) return;
    let fired = false;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (!fired && t >= endAt) {
        fired = true;
        done();
      }
    };
    const id = setInterval(tick, 250);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [endAt, active]);

  return { remaining: Math.max(0, endAt - now), now };
}

/* =========================================================================
 * Breath pacing: in 4s, hold 2s, out 6s (12s a breath, 5 a minute).
 * Phases come from the session's absolute start time, so the pace re-syncs
 * correctly after the app has been in the background.
 * ========================================================================= */

/** from/to are lung fullness: 0 empty, 1 full. */
export const PHASES = [
  { word: 'Breathe in', ms: 4000, from: 0, to: 1 },
  { word: 'Hold', ms: 2000, from: 1, to: 1 },
  { word: 'Breathe out', ms: 6000, from: 1, to: 0 },
] as const;
export const CYCLE = PHASES.reduce((a, p) => a + p.ms, 0);

const START = [0, PHASES[0].ms, PHASES[0].ms + PHASES[1].ms];

/** Phase ordinal at an elapsed time: cycle * 3 + phase index. Strictly increasing. */
function ordinalAt(elapsed: number): number {
  const e = Math.max(0, elapsed);
  const cycle = Math.floor(e / CYCLE);
  const c = e - cycle * CYCLE;
  return cycle * 3 + (c < START[1] ? 0 : c < START[2] ? 1 : 2);
}

const phaseOffset = (ord: number) => Math.floor(ord / 3) * CYCLE + START[ord % 3];

/** Breath curve: slow start, slow finish, like a real lungful. */
const EASE = Easing.bezier(0.45, 0, 0.4, 1);

/**
 * Drives the breath from an absolute start time: the phase word, a 0..1 fullness
 * Animated.Value for the visuals, and a haptic on each natural phase change.
 */
export function useBreath(startAt: number, active: boolean) {
  // A fresh object on every update, so an AppState resync re-runs the pacing effect
  // even when the phase hasn't changed.
  const [tick, setTick] = useState(() => ({ ord: ordinalAt(Date.now() - startAt) }));
  const [fullness] = useState(() => new Animated.Value(0));
  const lastOrd = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const { ord } = tick;
    const idx = ord % 3;
    const p = PHASES[idx];
    const begin = startAt + phaseOffset(ord);
    const now = Date.now();
    const left = Math.max(0, begin + p.ms - now);
    const progress = Math.min(1, Math.max(0, (now - begin) / p.ms));

    // Haptic only on a natural step to the next phase, not on mount or resync.
    if (lastOrd.current !== null && ord === lastOrd.current + 1) {
      if (idx === 0) haptic.press();
      else haptic.tap();
    }
    lastOrd.current = ord;

    fullness.setValue(p.from + (p.to - p.from) * progress);
    const anim = Animated.timing(fullness, { toValue: p.to, duration: left, easing: EASE, useNativeDriver: NATIVE });
    anim.start();
    const next = setTimeout(() => setTick({ ord: ordinalAt(Date.now() - startAt) }), left + 16);
    return () => {
      anim.stop();
      clearTimeout(next);
    };
  }, [tick, startAt, fullness, active]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        lastOrd.current = null;
        setTick({ ord: ordinalAt(Date.now() - startAt) });
      }
    });
    return () => sub.remove();
  }, [startAt]);

  return { phase: tick.ord % 3, word: PHASES[tick.ord % 3].word, fullness };
}
