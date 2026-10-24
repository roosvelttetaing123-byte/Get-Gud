/**
 * Control Center-style vertical slider for urge strength 1-10. A tall rounded track
 * fills from the bottom; the fill reveals a fixed green-to-red ramp, so the colour at
 * its top edge is the colour of the level. Drag to follow your finger, or tap to jump;
 * on release it settles onto the level with a spring. The track swells slightly
 * while held, like iOS.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { Flame } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { C, S } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { Num, Txt } from '@/ui';

import { NATIVE } from './hooks';
import { MAX_LEVEL, MIN_LEVEL, TRACK_GRADIENT, intensityColor, intensityWord } from './model';

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const levelAt = (f: number) => clamp(Math.ceil(f * MAX_LEVEL), MIN_LEVEL, MAX_LEVEL);

const WEB_TRACK = Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none', cursor: 'pointer' } as object) : null;

export function IntensitySlider({
  value,
  onChange,
  ghost,
  label,
  width = 120,
  height = 260,
}: {
  value?: number;
  onChange: (n: number) => void;
  /** A faint marker at an earlier level (e.g. before the surf). */
  ghost?: number;
  label: string;
  width?: number;
  height?: number;
}) {
  const [frac] = useState(() => new Animated.Value(value ? value / MAX_LEVEL : 0));
  const [press] = useState(() => new Animated.Value(0));
  const origin = useRef(0);
  const dragging = useRef(false);
  const current = useRef(value);

  // Follow outside changes (preset, reset, accessibility actions) with a spring.
  useEffect(() => {
    current.current = value;
    if (dragging.current) return;
    Animated.spring(frac, {
      toValue: value ? value / MAX_LEVEL : 0,
      speed: 18,
      bounciness: 6,
      useNativeDriver: NATIVE,
    }).start();
  }, [value, frac]);

  const pick = (f: number) => {
    const n = levelAt(f);
    if (n !== current.current) {
      current.current = n;
      haptic.tap();
      onChange(n);
    }
  };

  const fracFromPage = (e: GestureResponderEvent) => clamp(1 - (e.nativeEvent.pageY - origin.current) / height, 0, 1);

  const onGrant = (e: GestureResponderEvent) => {
    dragging.current = true;
    origin.current = e.nativeEvent.pageY - e.nativeEvent.locationY;
    const f = fracFromPage(e);
    Animated.spring(frac, { toValue: Math.max(f, 0.05), speed: 40, bounciness: 0, useNativeDriver: NATIVE }).start();
    Animated.spring(press, { toValue: 1, speed: 30, bounciness: 4, useNativeDriver: NATIVE }).start();
    pick(f);
  };
  const onMove = (e: GestureResponderEvent) => {
    const f = fracFromPage(e);
    frac.setValue(Math.max(f, 0.05));
    pick(f);
  };
  const onEnd = () => {
    dragging.current = false;
    const n = current.current;
    Animated.spring(frac, {
      toValue: n ? n / MAX_LEVEL : 0,
      speed: 16,
      bounciness: 9,
      useNativeDriver: NATIVE,
    }).start();
    Animated.spring(press, { toValue: 0, speed: 16, bounciness: 10, useNativeDriver: NATIVE }).start();
  };

  const step = (d: number) => onChange(clamp((value ?? 0) + d, MIN_LEVEL, MAX_LEVEL));

  const fillY = frac.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
  const rampY = frac.interpolate({ inputRange: [0, 1], outputRange: [-height, 0] });
  const swell = press.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const glyph = value ? '#FFFFFF' : C.label3;

  return (
    <Animated.View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={
        value ? { min: MIN_LEVEL, max: MAX_LEVEL, now: value, text: `${value}, ${intensityWord(value)}` } : { text: 'Not set' }
      }
      aria-valuemin={MIN_LEVEL}
      aria-valuemax={MAX_LEVEL}
      aria-valuenow={value}
      aria-valuetext={value ? `${value}, ${intensityWord(value)}` : 'Not set'}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={onGrant}
      onResponderMove={onMove}
      onResponderRelease={onEnd}
      onResponderTerminate={onEnd}
      style={[
        styles.track,
        WEB_TRACK,
        { width, height, borderRadius: Math.round(width * 0.27), transform: [{ scale: swell }] },
      ]}>
      <Animated.View pointerEvents="none" style={[styles.fill, { height, transform: [{ translateY: fillY }] }]}>
        <Animated.View style={[styles.fill, { height, transform: [{ translateY: rampY }] }]}>
          <LinearGradient
            colors={TRACK_GRADIENT.colors}
            locations={TRACK_GRADIENT.locations}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>

      {ghost ? (
        <View pointerEvents="none" style={[styles.ghost, { top: (1 - ghost / MAX_LEVEL) * height - 1.5 }]}>
          <View style={styles.ghostLine} />
        </View>
      ) : null}

      <View pointerEvents="none" style={styles.glyph}>
        <Flame size={26} color={glyph} strokeWidth={2.2} fill={value ? 'rgba(255,255,255,0.22)' : 'transparent'} />
      </View>
    </Animated.View>
  );
}

/** The big number and its word, coloured on the ramp. */
export function IntensityReadout({ value, prompt = 'Drag to rate' }: { value?: number; prompt?: string }) {
  return (
    <View style={{ gap: 2, minWidth: 128 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Num size={88} weight="700" color={value ? intensityColor(value) : C.label4}>
        {value ?? '–'}
      </Num>
      <Txt v="title3" color={value ? C.label : C.label2} weight="600">
        {value ? intensityWord(value) : prompt}
      </Txt>
      <Txt v="footnote" color={C.label3} style={{ marginTop: S.xxs }}>
        {value ? `${value} of 10` : '1 to 10'}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: 'rgba(120,120,128,0.24)', overflow: 'hidden' },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  ghost: { position: 'absolute', left: 0, right: 0, height: 3, alignItems: 'center' },
  ghostLine: { width: 44, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.85)' },
  glyph: { position: 'absolute', left: 0, right: 0, bottom: 18, alignItems: 'center' },
});
