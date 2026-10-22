import { useEffect, useEffectEvent, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

/**
 * Countdown to an absolute timestamp. Remaining time is always recomputed from
 * Date.now(), so it stays correct after the app is backgrounded (JS timers pause
 * there; we recompute as soon as the app is active again).
 */
export function useCountdown(endAt: number, onDone: () => void) {
  const [now, setNow] = useState(() => Date.now());
  const done = useEffectEvent(onDone);

  useEffect(() => {
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
  }, [endAt]);

  return { remaining: Math.max(0, endAt - now), now };
}

type A11yEvent = 'reduceMotionChanged' | 'screenReaderChanged';

/** Live accessibility setting. null until the first read resolves. */
export function useA11yFlag(event: A11yEvent): boolean | null {
  const [on, setOn] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    const read =
      event === 'reduceMotionChanged'
        ? AccessibilityInfo.isReduceMotionEnabled()
        : AccessibilityInfo.isScreenReaderEnabled();
    read.then((v) => alive && setOn(v)).catch(() => alive && setOn(false));
    const sub = AccessibilityInfo.addEventListener(event, (v: boolean) => setOn(v));
    return () => {
      alive = false;
      sub.remove();
    };
  }, [event]);

  return on;
}
