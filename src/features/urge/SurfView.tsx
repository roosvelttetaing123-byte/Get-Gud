/**
 * The surf: full screen, pure black, a breathing bloom in the middle.
 * Shown in a Modal so it covers the tab bar; fades in from Pick and out to the re-rate.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useId } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { C, S } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { Button, Num, Row, Txt, useReduceMotion } from '@/ui';

import { Bloom } from './Bloom';
import { CrossFade } from './CrossFade';
import { useBreath, useCountdown } from './hooks';
import { kindMeta } from './kinds';
import { LINE_MS, clock, groundingLines, spokenDuration, urgeContext, type Session } from './model';

export function SurfModal({
  visible,
  session,
  onExtend,
  onEnd,
}: {
  visible: boolean;
  session?: Session;
  onExtend: () => void;
  /** seconds actually sat with it */
  onEnd: (seconds: number) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => session && onEnd(Math.round((Math.min(Date.now(), session.endAt) - session.startAt) / 1000))}>
      {session ? (
        <SurfBody key={session.startAt} session={session} active={visible} onExtend={onExtend} onEnd={onEnd} />
      ) : null}
    </Modal>
  );
}

function SurfBody({
  session,
  active,
  onExtend,
  onEnd,
}: {
  session: Session;
  active: boolean;
  onExtend: () => void;
  onEnd: (seconds: number) => void;
}) {
  const { kind, startAt, endAt, seed } = session;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const breath = useBreath(startAt, active);
  const { remaining, now } = useCountdown(endAt, active, () => {
    haptic.success();
    onEnd(Math.round((endAt - startAt) / 1000));
  });

  const secsLeft = Math.ceil(remaining / 1000);
  const total = Math.max(1, endAt - startAt);
  const progress = Math.min(1, Math.max(0, (now - startAt) / total));
  const lines = groundingLines(kind, seed);
  const line = lines[Math.floor(Math.max(0, now - startAt) / LINE_MS) % lines.length];
  const bloom = Math.round(Math.min(width - 56, height * 0.44, 380));
  const m = kindMeta(kind);
  const M = m.icon;

  return (
    <View style={[styles.root, { paddingTop: insets.top + S.lg, paddingBottom: insets.bottom + S.lg }]}>
      <Backdrop width={width} height={height} />

      <Row gap={6} style={{ justifyContent: 'center' }}>
        <M size={15} color={m.color} strokeWidth={2.4} />
        <Txt v="subhead" weight="600" color={C.label2}>
          {urgeContext(kind)}
        </Txt>
      </Row>

      <View style={styles.middle}>
        <Bloom fullness={breath.fullness} size={bloom} reduce={reduce} />
      </View>

      <View style={styles.words}>
        <CrossFade
          value={breath.word}
          duration={900}
          style={{ alignSelf: 'stretch' }}
          render={(w) => (
            <Txt v="title2" weight="600" align="center">
              {w}
            </Txt>
          )}
        />
        <CrossFade
          value={line}
          duration={1400}
          lift={4}
          style={styles.line}
          render={(l) => (
            <Txt v="callout" color={C.label2} align="center" numberOfLines={2}>
              {l}
            </Txt>
          )}
        />
      </View>

      <View style={styles.bottom}>
        <View style={styles.track}>
          <View style={[styles.progress, { width: `${progress * 100}%` }]}>
            <LinearGradient
              colors={[C.indigo, C.cyan]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </View>
        <View style={styles.controls}>
          <View style={styles.side}>
            <Button title="+1 min" kind="gray" size="small" full={false} onPress={onExtend} />
          </View>
          <View accessible accessibilityRole="timer" accessibilityLabel={`${spokenDuration(secsLeft)} left`} style={styles.time}>
            <Num size={20} weight="600" color={C.label}>
              {clock(secsLeft)}
            </Num>
            <Txt v="caption2" color={C.label3}>
              left
            </Txt>
          </View>
          <View style={[styles.side, { alignItems: 'flex-end' }]}>
            <Button
              title="End"
              kind="plain"
              size="small"
              color={C.label}
              full={false}
              onPress={() => onEnd(Math.round((Math.min(Date.now(), endAt) - startAt) / 1000))}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

/** Pure black with a faint cyan light where the bloom sits and indigo pooling below. */
function Backdrop({ width, height }: { width: number; height: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id={`c${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={C.cyan} stopOpacity={0.1} />
            <Stop offset="1" stopColor={C.cyan} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`i${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={C.indigo} stopOpacity={0.14} />
            <Stop offset="1" stopColor={C.indigo} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={width / 2} cy={height * 0.42} rx={width * 0.95} ry={height * 0.42} fill={`url(#c${id})`} />
        <Ellipse cx={width / 2} cy={height * 1.02} rx={width * 1.1} ry={height * 0.4} fill={`url(#i${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingHorizontal: S.margin },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  words: { alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, marginBottom: S.xxxl },
  line: { alignSelf: 'stretch', minHeight: 42, maxWidth: 340, marginHorizontal: 'auto' },
  bottom: { gap: S.lg, width: '100%', maxWidth: 460, alignSelf: 'center' },
  track: { height: 3, borderRadius: 2, backgroundColor: 'rgba(120,120,128,0.24)', overflow: 'hidden', marginHorizontal: S.xs },
  progress: { height: 3, borderRadius: 2, overflow: 'hidden' },
  controls: { flexDirection: 'row', alignItems: 'center' },
  side: { flex: 1 },
  time: { alignItems: 'center' },
});
