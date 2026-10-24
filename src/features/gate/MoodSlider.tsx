/**
 * The State of Mind slider: a thick track through the seven mood colours and a
 * big white thumb. Drag it (it follows your finger, then springs to the nearest
 * mood) or tap anywhere on the track. Ticks a haptic on every step.
 */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { C, S, VALENCE } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { Txt } from '@/ui';

import { spring } from './anim';

const THUMB = 34;
const TRACK = 14;
const HIT = 56;
const COLORS = VALENCE.map((v) => v.color) as unknown as readonly [string, string, ...string[]];

export function MoodSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [w, setW] = useState(0);
  const [pos] = useState(() => new Animated.Value(value - 1));
  const [press] = useState(() => new Animated.Value(1));
  const drag = useRef<{ x0: number; p0: number } | null>(null);
  const last = useRef(value);

  // Follow changes made elsewhere (e.g. "Same as this morning").
  useEffect(() => {
    last.current = value;
    if (drag.current) return;
    const a = Animated.spring(pos, { toValue: value - 1, ...spring('snappy') });
    a.start();
    return () => a.stop();
  }, [value, pos]);

  const usable = Math.max(1, w - THUMB);
  const toPos = (x: number) => Math.max(0, Math.min(6, ((x - THUMB / 2) / usable) * 6));

  const emit = (p: number) => {
    const v = Math.round(p) + 1;
    if (v !== last.current) {
      last.current = v;
      haptic.tap();
      onChange(v);
    }
  };

  const grant = (e: GestureResponderEvent) => {
    const { locationX, pageX } = e.nativeEvent;
    drag.current = { x0: locationX, p0: pageX };
    const p = toPos(locationX);
    pos.stopAnimation();
    Animated.spring(pos, { toValue: p, ...spring('snappy') }).start();
    Animated.spring(press, { toValue: 1.18, ...spring('snappy') }).start();
    emit(p);
  };

  const move = (e: GestureResponderEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toPos(d.x0 + (e.nativeEvent.pageX - d.p0));
    pos.stopAnimation();
    pos.setValue(p);
    emit(p);
  };

  const release = () => {
    drag.current = null;
    Animated.spring(pos, { toValue: last.current - 1, ...spring('bouncy') }).start();
    Animated.spring(press, { toValue: 1, ...spring('bouncy') }).start();
  };

  const step = (d: number) => {
    const v = Math.max(1, Math.min(7, value + d));
    if (v !== value) {
      haptic.tap();
      onChange(v);
    }
  };

  return (
    <View style={{ gap: S.xs }}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="How you feel"
        accessibilityValue={{ min: 1, max: 7, now: value, text: VALENCE[value - 1].label }}
        aria-valuemin={1}
        aria-valuemax={7}
        aria-valuenow={value}
        aria-valuetext={VALENCE[value - 1].label}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={grant}
        onResponderMove={move}
        onResponderRelease={release}
        onResponderTerminate={release}
        style={styles.hit}>
        <View pointerEvents="none" style={styles.track}>
          <LinearGradient
            colors={COLORS}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          {w > 0
            ? VALENCE.map((_, i) => <View key={i} style={[styles.tick, { left: THUMB / 2 + (usable * i) / 6 - 2 }]} />)
            : null}
        </View>
        {w > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.thumb,
              {
                transform: [
                  { translateX: pos.interpolate({ inputRange: [0, 6], outputRange: [0, usable] }) },
                  { scale: press },
                ],
              },
            ]}
          />
        ) : null}
      </View>
      <View style={styles.ends}>
        <Txt v="footnote" color={C.label2}>
          Very unpleasant
        </Txt>
        <Txt v="footnote" color={C.label2}>
          Very pleasant
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: HIT, justifyContent: 'center', cursor: 'pointer' as never, touchAction: 'none' as never },
  track: { height: TRACK, borderRadius: TRACK / 2, overflow: 'hidden' },
  tick: {
    position: 'absolute',
    top: TRACK / 2 - 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  thumb: {
    position: 'absolute',
    left: 0,
    top: (HIT - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: C.label,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  ends: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
});
