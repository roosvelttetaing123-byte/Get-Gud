/**
 * The frame shared by the gate's three steps: a background that glows in the
 * current mood colour, a top bar (back + step capsules) and a pinned footer
 * that sits clear of the floating tab bar.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, S, TABBAR } from '@/constants/theme';
import { IconButton, useSpringValue } from '@/ui';

import { rgba, valenceRgb } from './logic';

/** Distance from the screen bottom to the top of the floating tab bar (mirrors TabBar). */
export function useTabBarTop() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom - 8, 12) + TABBAR.height;
}

/** The wash colour just under the top bar, as an opaque colour (mood over black). */
function TopFade({ valence, strength }: { valence: number; strength: number }) {
  const pos = useSpringValue(valence, 'smooth');
  const a = useSpringValue(strength, 'smooth') * 0.9;
  const [r, g, b] = valenceRgb(pos).map((x) => Math.round(x * a));
  const solid = `rgb(${r},${g},${b})`;
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[solid, `rgba(${r},${g},${b},0)`]}
      style={{ position: 'absolute', left: 0, right: 0, top: 0, height: S.lg }}
    />
  );
}

/** Full-screen wash: mood colour at the top fading to black. Glides between moods. */
export function MoodBackdrop({ valence, strength }: { valence: number; strength: number }) {
  const pos = useSpringValue(valence, 'smooth');
  const a = useSpringValue(strength, 'smooth');
  const c = valenceRgb(pos);
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[rgba(c, a), rgba(c, a * 0.42), C.bg]}
      locations={[0, 0.48, 1]}
      style={StyleSheet.absoluteFill}
    />
  );
}

function Capsule({ on, done }: { on: boolean; done: boolean }) {
  const w = useSpringValue(on ? 24 : 8, 'snappy');
  return (
    <View
      style={{
        width: w,
        height: 6,
        borderRadius: 3,
        backgroundColor: on ? C.label : done ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.22)',
      }}
    />
  );
}

/** Three small capsules: where you are in the ritual. */
export function StepDots({ step, of = 3 }: { step: number; of?: number }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step + 1} of ${of}`}
      style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: of }, (_, i) => (
        <Capsule key={i} on={i === step} done={i < step} />
      ))}
    </View>
  );
}

export function Frame({
  valence,
  strength,
  step,
  onBack,
  footer,
  children,
}: {
  valence: number;
  strength: number;
  step: number;
  onBack?: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const tabTop = useTabBarTop();
  return (
    <View style={styles.screen}>
      <MoodBackdrop valence={valence} strength={strength} />
      <View style={[styles.column, { paddingTop: insets.top + S.xs }]}>
        <View style={styles.top}>
          <View style={styles.side}>
            {onBack ? (
              <IconButton icon={ChevronLeft} label="Back" onPress={onBack} bg="rgba(255,255,255,0.12)" />
            ) : null}
          </View>
          <StepDots step={step} />
          <View style={styles.side} />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        {children}
        {/* content softly fades as it scrolls under the top bar */}
        <TopFade valence={valence} strength={strength} />
        {/* content fades out as it scrolls under the footer */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', C.bg]}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: S.xxl }}
        />
      </View>
      <View style={[styles.column, { paddingTop: S.sm, paddingBottom: tabTop + S.lg, backgroundColor: C.bg }]}>
        {footer}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, overflow: 'hidden' },
  column: { width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: S.margin },
  top: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { width: 44, alignItems: 'flex-start' },
});
