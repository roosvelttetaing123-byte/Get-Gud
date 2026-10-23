import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { C, F, Pastel, R, S } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { Art, Body, Button, Display, Pill, ProgressRing, Screen } from '@/ui/legacy';

import { BreathingOrb, useBreath } from './BreathingCircle';
import { useA11yFlag, useCountdown } from './hooks';
import { LINE_MS, clock, groundingLines, spokenDuration, type Session } from './model';
import { kindMeta } from './visuals';

const MAX_RING = 280;
const MIN_RING = 180;

export function SurfView({
  session,
  onExtend,
  onEnd,
}: {
  session: Session;
  onExtend: () => void;
  /** seconds actually sat with it */
  onEnd: (seconds: number) => void;
}) {
  const { kind, startAt, endAt, seed } = session;
  const reduceMotion = useA11yFlag('reduceMotionChanged');
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const breath = useBreath(startAt);

  const { remaining, now } = useCountdown(endAt, () => {
    haptic.success();
    onEnd(Math.round((endAt - startAt) / 1000));
  });

  const secsLeft = Math.ceil(remaining / 1000);
  const lines = groundingLines(kind, seed);
  const line = lines[Math.floor(Math.max(0, now - startAt) / LINE_MS) % lines.length];
  const left = remaining / Math.max(1, endAt - startAt);

  const size = area ? Math.max(MIN_RING, Math.min(MAX_RING, area.w, area.h)) : 0;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea((a) => (a && a.w === width && a.h === height ? a : { w: width, h: height }));
  };

  return (
    <View style={styles.root}>
      <Image source={Art.calm} style={[StyleSheet.absoluteFill, styles.art]} contentFit="cover" transition={0} />
      <LinearGradient
        colors={['rgba(10,16,32,0.15)', 'rgba(10,16,32,0.55)', C.ink]}
        locations={[0, 0.5, 0.92]}
        style={StyleSheet.absoluteFill}
      />

      <Screen scroll={false} style={styles.screen}>
        <View style={styles.top}>
          <View>
            <Pill icon={kindMeta(kind).icon} label={kind} />
          </View>
        </View>

        <View style={styles.middle} onLayout={onLayout}>
          {size ? (
            <View style={{ width: size, height: size }}>
              {reduceMotion !== null ? (
                <View style={styles.fill}>
                  <BreathingOrb fullness={breath.fullness} size={size} reduceMotion={reduceMotion} />
                </View>
              ) : null}
              <View style={styles.fill}>
                <ProgressRing
                  value={left}
                  size={size}
                  stroke={6}
                  colors={[Pastel.mint[1], C.accent]}
                  track="rgba(242,245,251,0.1)">
                  <View
                    accessible
                    accessibilityRole="timer"
                    accessibilityLabel={`${spokenDuration(secsLeft)} left. ${breath.word}.`}
                    style={styles.readout}>
                    <Display size={56} style={styles.time}>
                      {clock(secsLeft, true)}
                    </Display>
                    <Display size={19} weight="semi" color="rgba(242,245,251,0.86)">
                      {breath.word}
                    </Display>
                  </View>
                </ProgressRing>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.lineCard}>
          <Body style={styles.line}>{line}</Body>
        </View>

        <View style={styles.actions}>
          <Button
            kind="secondary"
            icon={Check}
            label="It's passed"
            onPress={() => onEnd(Math.round((Math.min(Date.now(), endAt) - startAt) / 1000))}
          />
          <Button kind="ghost" icon={Plus} label="Add 5 minutes" onPress={onExtend} />
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ink },
  art: { opacity: 0.38 },
  screen: { backgroundColor: 'transparent' },
  top: { alignItems: 'center' },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: MIN_RING },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  readout: { alignItems: 'center', gap: 2 },
  time: { fontVariant: ['tabular-nums'], textShadowColor: 'rgba(10,16,32,0.35)', textShadowRadius: 12 },
  lineCard: {
    minHeight: 104,
    justifyContent: 'center',
    paddingHorizontal: S.xl,
    paddingVertical: S.lg,
    borderRadius: R.surface,
    backgroundColor: 'rgba(19,27,48,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(242,245,251,0.1)',
  },
  line: { textAlign: 'center', fontFamily: F.semi, color: 'rgba(242,245,251,0.9)' },
  actions: { gap: S.xs },
});
