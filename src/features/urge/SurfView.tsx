import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { C, S, T } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { Body, Button, Display, Screen, Sub } from '@/ui';

import { BreathingCircle, PHASE_WORD_SPACE } from './BreathingCircle';
import { useA11yFlag, useCountdown } from './hooks';
import { LINE_MS, clock, groundingLines, spokenDuration, urgeContext, type Session } from './model';

const MAX_CIRCLE = 300;
const MIN_CIRCLE = 120;

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

  const { remaining, now } = useCountdown(endAt, () => {
    haptic.success();
    onEnd(Math.round((endAt - startAt) / 1000));
  });

  const secsLeft = Math.ceil(remaining / 1000);
  const lines = groundingLines(kind, seed);
  const line = lines[Math.floor(Math.max(0, now - startAt) / LINE_MS) % lines.length];

  const size = area
    ? Math.max(MIN_CIRCLE, Math.min(MAX_CIRCLE, area.w, area.h - PHASE_WORD_SPACE))
    : 0;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea((a) => (a && a.w === width && a.h === height ? a : { w: width, h: height }));
  };

  return (
    <Screen scroll={false}>
      <View accessible accessibilityRole="timer" accessibilityLabel={`${spokenDuration(secsLeft)} left`}>
        <Sub>{urgeContext(kind)}</Sub>
        <Display size={T.hero} style={styles.countdown}>
          {clock(secsLeft, true)}
        </Display>
      </View>

      <View style={styles.middle} onLayout={onLayout}>
        {size && reduceMotion !== null ? (
          <BreathingCircle startAt={startAt} size={size} reduceMotion={reduceMotion} />
        ) : null}
      </View>

      <Body color={C.haze} style={styles.line}>
        {line}
      </Body>

      <View style={styles.actions}>
        <Button
          kind="secondary"
          label="It's passed"
          onPress={() => onEnd(Math.round((Math.min(Date.now(), endAt) - startAt) / 1000))}
        />
        <Button kind="ghost" label="Add 5 minutes" onPress={onExtend} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  countdown: { marginTop: 2, fontVariant: ['tabular-nums'] },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: MIN_CIRCLE + PHASE_WORD_SPACE },
  line: { textAlign: 'center', minHeight: 72 },
  actions: { gap: S.sm },
});
