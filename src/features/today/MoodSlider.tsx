/**
 * State of Mind slider (Apple Health): a gradient track through the 7 valence colours,
 * a big white thumb you can drag, and 7 tap targets. The thumb follows your finger,
 * then springs to the nearest step on release.
 */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Platform, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { C, VALENCE } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { Txt, useSpringValue } from '@/ui';

import { along } from './visuals';

export const VALENCE_COLORS = VALENCE.map((v) => v.color);
const STEPS = VALENCE.length; // 7
const THUMB = 30;
const TRACK = 10;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const toStep = (frac: number) => Math.round(frac * (STEPS - 1)) + 1;
const toFrac = (step: number) => (step - 1) / (STEPS - 1);

/**
 * `value` is 1..7. `onPosition` reports the continuous 0..1 position while dragging (for
 * live colour); `onChange` fires each time the nearest step changes.
 */
export function MoodSlider({
  value,
  onChange,
  onPosition,
}: {
  value: number;
  onChange: (v: number) => void;
  onPosition?: (frac: number | null) => void;
}) {
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const settled = useSpringValue(drag ?? toFrac(value), 'snappy');
  const pos = drag ?? settled;
  const lift = useSpringValue(drag !== null ? 1.12 : 1, 'snappy');
  const usable = Math.max(1, width - THUMB);

  const fracAt = (e: GestureResponderEvent) => clamp01((e.nativeEvent.locationX - THUMB / 2) / usable);

  const move = (e: GestureResponderEvent) => {
    const f = fracAt(e);
    setDrag(f);
    onPosition?.(f);
    const s = toStep(f);
    if (s !== value) {
      haptic.tap();
      onChange(s);
    }
  };
  const end = () => {
    setDrag(null);
    onPosition?.(null);
  };

  return (
    <View style={{ gap: 10 }}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="How you feel"
        accessibilityValue={{ text: VALENCE[value - 1].label, min: 1, max: STEPS, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment' && value < STEPS) onChange(value + 1);
          if (e.nativeEvent.actionName === 'decrement' && value > 1) onChange(value - 1);
        }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={styles.wrap}>
        <View style={styles.trackBox} pointerEvents="none">
          <LinearGradient
            colors={VALENCE_COLORS as unknown as [string, string, ...string[]]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.track}
          />
          {Array.from({ length: STEPS }, (_, i) => (
            <View
              key={i}
              style={[styles.tick, { left: THUMB / 2 + (usable * i) / (STEPS - 1) - 2.5, opacity: i + 1 === value ? 0 : 1 }]}
            />
          ))}
        </View>
        {width > 0 ? (
          <View pointerEvents="none" style={[styles.thumb, { transform: [{ translateX: pos * usable }, { scale: lift }] }]}>
            <View style={[styles.thumbDot, { backgroundColor: along(VALENCE_COLORS, pos) }]} />
          </View>
        ) : null}
        {/* One flat touch surface on top, so locationX is always relative to the track. */}
        <View
          style={[StyleSheet.absoluteFill, Platform.OS === 'web' ? ({ touchAction: 'pan-y', cursor: 'pointer' } as object) : null]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={move}
          onResponderMove={move}
          onResponderRelease={end}
          onResponderTerminate={end}
        />
      </View>
      <View style={styles.ends}>
        <Txt v="caption1" color={C.label2}>
          Very unpleasant
        </Txt>
        <Txt v="caption1" color={C.label2}>
          Very pleasant
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 44, justifyContent: 'center' },
  trackBox: { height: TRACK, marginHorizontal: 0, justifyContent: 'center' },
  track: { position: 'absolute', left: THUMB / 2 - TRACK / 2, right: THUMB / 2 - TRACK / 2, height: TRACK, borderRadius: TRACK / 2 },
  tick: { position: 'absolute', width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.55)' },
  thumb: {
    position: 'absolute',
    left: 0,
    top: (44 - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  thumbDot: { width: 12, height: 12, borderRadius: 6 },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
});
