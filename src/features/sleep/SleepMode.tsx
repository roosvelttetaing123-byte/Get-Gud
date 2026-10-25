/**
 * Sleep mode. Full screen, near black, shown over everything.
 *   wind-down: slow breathing bloom and tonight's melatonin window, then "Good night".
 *   asleep:    a dim clock. Stays up until you tap "I'm up", even across app restarts.
 *   morning:   how long you slept, how long it took to drop off, how rested you feel. Save.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useInsets } from '@/ui/insets';

import { C, S } from '@/constants/theme';
import { Bloom } from '@/features/urge/Bloom';
import { useBreath } from '@/features/urge/hooks';
import { haptic } from '@/lib/haptics';
import { DEFAULT_LATENCY, clockLabel, fmtDebt, fmtDur, sleepSummary } from '@/lib/sleep';
import { actions, getState, useStore } from '@/lib/store';
import { Button, Chip, Num, Row, Txt, useReduceMotion } from '@/ui';

import { LogSheet } from './LogSheet';
import { NIGHT_BG, SLEEP_TINT } from './look';

/* ---------- open the wind-down from anywhere ---------- */

let windDownOpen = false;
const subs = new Set<() => void>();
export function openSleepMode() {
  windDownOpen = true;
  subs.forEach((f) => f());
}
function closeWindDown() {
  windDownOpen = false;
  subs.forEach((f) => f());
}
const useWindDown = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => windDownOpen,
    () => false,
  );

const H = 3_600_000;
const LATENCY = [5, 15, 30, 60];
const QUALITY = ['Groggy', 'Tired', 'Okay', 'Rested', 'Great'];

export function SleepMode() {
  const { sleepSession } = useStore();
  const windDown = useWindDown();
  const [manual, setManual] = useState(false);
  const visible = windDown || !!sleepSession;

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => closeWindDown()}>
        {sleepSession ? <Asleep bed={sleepSession.bed} onManual={() => setManual(true)} /> : windDown ? <WindDown /> : null}
      </Modal>
      <LogSheet visible={manual} onClose={() => setManual(false)} />
    </>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const insets = useInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + S.xl, paddingBottom: insets.bottom + S.xl }]}>{children}</View>
  );
}

function useTick(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/* ---------- wind-down ---------- */

function WindDown() {
  const [startAt] = useState(() => Date.now());
  const breath = useBreath(startAt, true);
  const reduce = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const now = useTick(30_000);
  const { sched, debt } = sleepSummary(getState(), now);
  const mel = sched.melatonin;
  const size = Math.round(Math.min(width - 96, height * 0.36, 300));
  const early = now < mel.start - 20 * 60_000;
  const late = now > mel.end;

  return (
    <Frame>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Txt v="footnote" color={C.label2}>
          Melatonin window
        </Txt>
        <Txt v="title2" rounded tabular>
          {clockLabel(mel.start)}–{clockLabel(mel.end)}
        </Txt>
        <Txt v="subhead" color={C.label2} align="center">
          {early ? 'A little early. Dim the lights and breathe.' : late ? 'Past your window. Sleep now, skip the screen.' : 'Your window is open. Best time to fall asleep.'}
        </Txt>
      </View>

      <View style={{ alignItems: 'center', gap: S.lg }}>
        <Bloom fullness={breath.fullness} size={size} reduce={reduce} />
        <Txt v="title3" color={C.label2}>
          {breath.word}
        </Txt>
      </View>

      <View style={{ gap: S.sm, alignSelf: 'stretch' }}>
        {debt.known > 0 ? (
          <Txt v="footnote" color={C.label3} align="center">
            {debt.hours < 5 ? `Sleep debt ${fmtDebt(debt.hours)} h. Keep it there.` : `Sleep debt ${fmtDebt(debt.hours)} h. Every early night pays it down.`}
          </Txt>
        ) : null}
        <Button
          title="Good night"
          color={SLEEP_TINT}
          textColor="#FFFFFF"
          onPress={() => {
            haptic.heavy();
            actions.startSleep();
            closeWindDown();
          }}
        />
        <Button title="Not yet" kind="plain" color={C.label2} onPress={closeWindDown} />
      </View>
    </Frame>
  );
}

/* ---------- asleep, then morning ---------- */

function Asleep({ bed, onManual }: { bed: number; onManual: () => void }) {
  const now = useTick(15_000);
  const [review, setReview] = useState(false);
  const d = new Date(now);
  const clock = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const stale = now - bed > 16 * H;
  const morning = now - bed > 3 * H;

  if (review) return <Review bed={bed} onBack={() => setReview(false)} />;

  return (
    <Frame>
      <View />
      <View style={{ alignItems: 'center', gap: S.sm }}>
        <Num size={88} weight="400" color={morning ? C.label : C.label4}>
          {clock}
        </Num>
        <Txt v="subhead" color={morning ? C.label2 : C.label4}>
          {stale ? 'Sleep mode was left on.' : `Asleep since ${clockLabel(bed)}`}
        </Txt>
      </View>
      <View style={{ gap: S.sm, alignSelf: 'stretch' }}>
        {stale ? (
          <>
            <Button
              title="Log it by hand"
              color={SLEEP_TINT}
              textColor="#FFFFFF"
              onPress={() => {
                actions.cancelSleep();
                onManual();
              }}
            />
            <Button title="Discard" kind="plain" color={C.label2} onPress={() => actions.cancelSleep()} />
          </>
        ) : (
          <>
            <Button
              title={morning ? 'I’m up' : 'I’m awake'}
              kind={morning ? 'filled' : 'gray'}
              color={morning ? C.tint : undefined}
              onPress={() => {
                haptic.press();
                setReview(true);
              }}
            />
            {!morning ? (
              <Button title="Cancel sleep mode" kind="plain" color={C.label3} onPress={() => actions.cancelSleep()} />
            ) : null}
          </>
        )}
      </View>
    </Frame>
  );
}

function Review({ bed, onBack }: { bed: number; onBack: () => void }) {
  const [wake] = useState(() => Date.now());
  const [latency, setLatency] = useState(DEFAULT_LATENCY);
  const [quality, setQuality] = useState<number | undefined>();
  const hours = Math.max(0, (wake - bed) / H - latency / 60);
  const need = getState().settings.sleepNeed || 8;
  const short = need - hours;
  const nap = wake - bed < 3 * H;

  return (
    <Frame>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Txt v="footnote" color={C.label2}>
          {nap ? 'Nap' : 'Good morning'}
        </Txt>
        <Num size={56} weight="700">
          {fmtDur(hours)}
        </Num>
        <Txt v="subhead" color={C.label2} align="center">
          {nap
            ? 'Short naps still pay debt down.'
            : short <= 0.25
              ? 'You met your sleep need.'
              : `${fmtDur(short)} under your need. Protect tonight’s window.`}
        </Txt>
      </View>

      <View style={{ gap: S.xl, alignSelf: 'stretch' }}>
        <View style={{ gap: S.sm }}>
          <Txt v="headline">Fell asleep in</Txt>
          <Row gap={S.sm} style={{ flexWrap: 'wrap' }}>
            {LATENCY.map((m) => (
              <Chip key={m} label={m >= 60 ? '1 h+' : `${m} min`} selected={latency === m} color={SLEEP_TINT} onPress={() => setLatency(m)} />
            ))}
          </Row>
        </View>
        <View style={{ gap: S.sm }}>
          <Txt v="headline">How do you feel</Txt>
          <Row gap={S.sm} style={{ flexWrap: 'wrap' }}>
            {QUALITY.map((q, i) => (
              <Chip key={q} label={q} selected={quality === i + 1} color={SLEEP_TINT} onPress={() => setQuality(i + 1)} />
            ))}
          </Row>
        </View>
      </View>

      <View style={{ gap: S.sm, alignSelf: 'stretch' }}>
        <Button
          title="Save"
          color={C.tint}
          onPress={() => {
            actions.saveSleep({ bed, wake, latencyMin: latency, quality, source: 'mode' });
            haptic.success();
          }}
        />
        <Button title="Back" kind="plain" color={C.label2} onPress={onBack} />
      </View>
    </Frame>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: NIGHT_BG,
    paddingHorizontal: S.xl,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
