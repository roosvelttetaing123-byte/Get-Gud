/**
 * Morning check-in: four short cards on one scroll (mood, energy, sleep, intention).
 * About 30 seconds. Pre-fills from today's check-in when editing.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Battery, BatteryFull, BatteryLow, BatteryMedium, Zap, type LucideIcon } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { C, S, SPRING, SYS, VALENCE } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { actions, dayKey, type CheckIn } from '@/lib/store';
import { Button, Field, Num, Sheet, Stepper, Txt, useReduceMotion } from '@/ui';

import { MoodSlider, VALENCE_COLORS } from './MoodSlider';
import { OptionTile, SheetCard } from './parts';
import { along, moodImage } from './visuals';

export const ENERGY: { label: string; icon: LucideIcon; color: string }[] = [
  { label: 'Drained', icon: Battery, color: SYS.indigo },
  { label: 'Low', icon: BatteryLow, color: SYS.blue },
  { label: 'Okay', icon: BatteryMedium, color: SYS.teal },
  { label: 'Good', icon: BatteryFull, color: SYS.green },
  { label: 'Charged', icon: Zap, color: SYS.yellow },
];

const GLOW = 320;
const SHAPE = 160;
const SLEEP_PICKS = [5, 6, 7, 8, 9];
const fmtHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)} h`;

export function CheckInSheet({ visible, onClose, checkin }: { visible: boolean; onClose: () => void; checkin?: CheckIn }) {
  return (
    <Sheet visible={visible} onClose={onClose} title={checkin ? 'Edit check-in' : 'Check in'} detent="large">
      <CheckInForm checkin={checkin} onDone={onClose} />
    </Sheet>
  );
}

/** Mounted fresh each time the sheet opens, so it always starts from what's saved. */
function CheckInForm({ checkin, onDone }: { checkin?: CheckIn; onDone: () => void }) {
  const [valence, setValence] = useState(checkin?.valence ?? 4);
  const [dragPos, setDragPos] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | undefined>(checkin?.energy);
  const [sleep, setSleep] = useState<number | undefined>(checkin?.sleepHours);
  const [intention, setIntention] = useState(checkin?.intention ?? '');

  const save = () => {
    actions.checkIn(dayKey(), {
      valence,
      energy,
      sleepHours: sleep,
      intention: intention.trim() || undefined,
    });
    haptic.success();
    onDone();
  };

  const e = energy ? ENERGY[energy - 1] : undefined;

  return (
    <>
      <MoodCard valence={valence} pos={dragPos} onChange={setValence} onPosition={setDragPos} />

      <SheetCard
        title="Energy"
        aside={
          e ? (
            <Txt v="subhead" weight="600" color={e.color}>
              {e.label}
            </Txt>
          ) : (
            <Txt v="subhead" color={C.label3}>
              Pick one
            </Txt>
          )
        }>
        <View style={styles.row}>
          {ENERGY.map((x, i) => (
            <OptionTile
              key={x.label}
              icon={x.icon}
              label={x.label}
              color={x.color}
              selected={energy === i + 1}
              onPress={() => setEnergy(i + 1)}
            />
          ))}
        </View>
      </SheetCard>

      <SheetCard
        title="Sleep"
        aside={
          sleep === undefined ? (
            <Txt v="subhead" color={C.label3}>
              Pick one
            </Txt>
          ) : (
            // Fine-tune in half hours once there's a value.
            <Stepper value={sleep} min={0} max={12} step={0.5} onChange={setSleep} format={fmtHours} />
          )
        }>
        <View style={styles.row}>
          {SLEEP_PICKS.map((h) => (
            <OptionTile
              key={h}
              label={h === 9 ? '9 hours or more' : `${h} hours`}
              text={h === 9 ? '9+' : String(h)}
              color={SYS.cyan}
              height={46}
              selected={sleep !== undefined && (h === 9 ? sleep >= 9 : sleep === h)}
              onPress={() => setSleep(h)}
            />
          ))}
        </View>
        {sleep !== undefined ? (
          <Txt v="footnote" color={C.label2}>
            {sleep < 6 ? 'Short night. Be picky with trades today.' : sleep >= 7 ? 'Well rested.' : 'A little short. Go steady.'}
          </Txt>
        ) : null}
      </SheetCard>

      <SheetCard title="Today's intention">
        <Field
          value={intention}
          onChangeText={setIntention}
          placeholder="One thing that would make today a win"
          maxLength={90}
          returnKeyType="done"
          style={{ backgroundColor: C.fill4 }}
        />
      </SheetCard>

      <Button title="Save check-in" onPress={save} />
    </>
  );
}

/** Health State of Mind: the shape, its name, and the slider. The card takes the mood's colour. */
function MoodCard({
  valence,
  pos,
  onChange,
  onPosition,
}: {
  valence: number;
  pos: number | null;
  onChange: (v: number) => void;
  onPosition: (f: number | null) => void;
}) {
  // While dragging, the colour follows the finger continuously; otherwise it sits on the step.
  const t = pos ?? (valence - 1) / (VALENCE.length - 1);
  const glow = along(VALENCE_COLORS, t);
  const top = along(VALENCE_COLORS, t, 0.22);
  const bottom = along(VALENCE_COLORS, t, 0.06);

  const reduce = useReduceMotion();
  const pop = useSharedValue(1);
  const shown = useRef(valence);
  useEffect(() => {
    // Pop the shape when it changes (not when the sheet first opens).
    if (shown.current === valence) return;
    shown.current = valence;
    if (!reduce) pop.set(withSequence(withTiming(0.9, { duration: 70 }), withSpring(1, SPRING.bouncy)));
  }, [valence, reduce, pop]);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  return (
    <SheetCard style={{ paddingBottom: S.lg }}>
      <LinearGradient colors={[top, bottom]} style={StyleSheet.absoluteFill} />
      <Txt v="headline">How do you feel?</Txt>
      <View style={styles.mood}>
        {/* Health-style glow: the mood's colour radiates from behind the shape. */}
        <Svg width={GLOW} height={GLOW} style={styles.glow} pointerEvents="none">
          <Defs>
            <RadialGradient id="moodGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={glow} stopOpacity={0.85} />
              <Stop offset="0.45" stopColor={glow} stopOpacity={0.35} />
              <Stop offset="1" stopColor={glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill="url(#moodGlow)" />
        </Svg>
        <Animated.View style={popStyle}>
          <Image source={moodImage(valence)} style={styles.shape} contentFit="contain" transition={120} />
        </Animated.View>
        <Num size={26} weight="700" style={{ textAlign: 'center' }}>
          {VALENCE[valence - 1].label}
        </Num>
      </View>
      <MoodSlider value={valence} onChange={onChange} onPosition={onPosition} />
    </SheetCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: S.sm },
  mood: { alignItems: 'center', gap: S.sm, paddingTop: S.xs, paddingBottom: S.xs },
  glow: { position: 'absolute', top: S.xs + SHAPE / 2 - GLOW / 2, left: '50%', marginLeft: -GLOW / 2 },
  shape: { width: SHAPE, height: SHAPE },
});
