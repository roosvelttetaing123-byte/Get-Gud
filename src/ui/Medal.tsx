/**
 * 3D medals (pre-rendered) with a tactile tilt + specular sweep on press,
 * and a full-screen celebration with confetti for newly earned awards (live 3D on web: features/medal3d).
 */
import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { C, S, SYS } from '@/constants/theme';
import { Medal3D } from '@/features/medal3d/Medal3D';
import { engraveDate } from '@/features/medal3d/specs';
import { haptic } from '@/lib/haptics';

import { Button, Txt } from './index';
import { useReduceMotion, useSpringValue } from './motion';

/** A medal you can press: it tilts toward your finger and a highlight sweeps across. */
export function Medal({
  image,
  size = 96,
  locked,
  onPress,
  label,
}: {
  image: ImageSource;
  size?: number;
  locked?: boolean;
  onPress?: () => void;
  label?: string;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [down, setDown] = useState(false);
  const rx = useSpringValue(tilt.x, 'bouncy');
  const ry = useSpringValue(tilt.y, 'bouncy');
  const shine = useSpringValue(down ? 1 : 0, 'smooth');
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={label}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      onPressIn={(e) => {
        const { locationX, locationY } = e.nativeEvent;
        setTilt({ x: ((locationY - size / 2) / size) * -22, y: ((locationX - size / 2) / size) * 22 });
        setDown(true);
      }}
      onPressOut={() => {
        setTilt({ x: 0, y: 0 });
        setDown(false);
      }}
      style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          transform: [{ perspective: 600 }, { rotateX: `${rx}deg` }, { rotateY: `${ry}deg` }, { scale: 1 + shine * 0.04 }],
        }}>
        <Image source={image} style={{ width: size, height: size, opacity: locked ? 0.55 : 1 }} contentFit="contain" />
        {!locked ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: shine * 0.9, borderRadius: size / 2, overflow: 'hidden' }]}>
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', width: size * 1.6, height: size * 1.6, left: -size * 0.3 + shine * size * 0.3, top: -size * 0.3 }}
            />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

/* ---------- confetti ---------- */

const CONFETTI_COLORS = [SYS.yellow, SYS.orange, SYS.pink, SYS.cyan, SYS.green, SYS.indigo, SYS.purple, '#FFB800'];

/** Deterministic pseudo-random in [0,1) so render stays pure. */
const rnd = (i: number, k: number, seed: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233 + seed * 37.719) * 43758.5453;
  return x - Math.floor(x);
};

function Confetti({ fire, seed = 1, count = 46 }: { fire: number; seed?: number; count?: number }) {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (rnd(i, 1, seed) - 0.5) * width * 1.1,
        y: -height * (0.25 + rnd(i, 2, seed) * 0.35),
        fall: height * (0.55 + rnd(i, 3, seed) * 0.4),
        rot: (rnd(i, 4, seed) - 0.5) * 900,
        w: 6 + rnd(i, 5, seed) * 6,
        h: 10 + rnd(i, 6, seed) * 10,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: rnd(i, 7, seed) > 0.7,
      })),
    [width, height, count, seed],
  );
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!fire) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 2200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [fire, progress]);
  if (!fire) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => {
        const tx = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, p.x, p.x * 1.15] });
        const ty = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, p.y, p.y + p.fall] });
        const r = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] });
        const o = progress.interpolate({ inputRange: [0, 0.05, 0.8, 1], outputRange: [0, 1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: width / 2,
              top: height * 0.42,
              width: p.w,
              height: p.round ? p.w : p.h,
              borderRadius: p.round ? p.w : 2,
              backgroundColor: p.color,
              opacity: o,
              transform: [{ translateX: tx }, { translateY: ty }, { rotate: r }],
            }}
          />
        );
      })}
    </View>
  );
}

/**
 * Full-screen medal reveal. Show one award at a time.
 * With `medalId` (web), the new medal arrives live in 3D: the still shows at once, then it spins in
 * and settles, and it can be spun. Without it (or on native) the still flips in.
 */
export function Celebration({
  visible,
  image,
  title,
  detail,
  kicker = 'New medal',
  onDone,
  medalId,
  earnedAt,
}: {
  visible: boolean;
  image?: ImageSource;
  title: string;
  detail?: string;
  kicker?: string;
  onDone: () => void;
  /** Award id, for the live 3D medal. */
  medalId?: string;
  /** When it was earned (ms), engraved on the back. */
  earnedAt?: number;
}) {
  const reduce = useReduceMotion();
  const fire = visible && !reduce ? 1 : 0;
  const s = useSpringValue(visible ? 1 : 0, 'bouncy', 0);
  const spin = useSpringValue(visible ? 0 : 1, 'smooth', 1);
  useEffect(() => {
    if (visible) haptic.success();
  }, [visible]);
  if (!visible) return null;
  const live = !!medalId && Platform.OS === 'web';
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDone} statusBarTranslucent>
      <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
        <Confetti fire={fire} seed={title.length + 1} />
        <View style={styles.center}>
          <Txt v="subhead" color={C.tint} weight="700">
            {kicker}
          </Txt>
          {image ? (
            <View
              style={{
                // the live medal does its own spin; the still flips in
                transform: [{ perspective: 800 }, { scale: 0.4 + s * 0.6 }, { rotateY: `${live ? 0 : spin * 160}deg` }],
                marginVertical: S.lg,
              }}>
              {medalId ? (
                <Medal3D
                  id={medalId}
                  image={image}
                  size={220}
                  back={{ title, line: earnedAt ? engraveDate(earnedAt) : kicker }}
                  label={`${title} medal`}
                  intro="celebrate"
                />
              ) : (
                <Image source={image} style={{ width: 220, height: 220 }} contentFit="contain" />
              )}
            </View>
          ) : null}
          <Txt v="title1" align="center">
            {title}
          </Txt>
          {detail ? (
            <Txt v="body" color={C.label2} align="center" style={{ maxWidth: 300 }}>
              {detail}
            </Txt>
          ) : null}
          <View style={{ height: S.xl }} />
          <Button title="Nice" onPress={onDone} full={false} style={{ minWidth: 180 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.88)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.xxl, gap: S.sm },
});
