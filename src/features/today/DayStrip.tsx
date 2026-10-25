/**
 * "Your day": a Weather-style hourly strip of today's moments, from sleep debt through to bed.
 * It scrolls sideways (with snap) and opens on now. Past moments dim, done rituals get a check,
 * and a gold line fills the timeline up to a "now" playhead. Each moment taps through to where
 * it lives: the Gate, the Sleep tab, or the check-in / close sheets.
 */
import { router } from 'expo-router';
import {
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BedDouble,
  Check,
  CloudSun,
  Coffee,
  Moon,
  Mountain,
  ShieldCheck,
  Smartphone,
  Smile,
  Sun,
  type LucideIcon,
} from 'lucide-react-native';
import React, { useRef } from 'react';
import { Platform, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';

import { C, RING, S, SYS, tint } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { clockLabel, fmtDebt, type SleepSummary } from '@/lib/sleep';
import type { SleepEdge } from '@/lib/sleepEdge';
import type { DayLog } from '@/lib/store';
import { useNow } from '@/lib/useNow';
import { Card, Pressy, Section, Txt, isLight } from '@/ui';

import { dayMoments, momentState, nowIndex, wantsNightLog, type Moment, type MomentKind, type MomentState } from './moments';

const LOOK: Record<MomentKind, { icon: LucideIcon; color: string }> = {
  checkin: { icon: Smile, color: SYS.orange },
  light: { icon: Sun, color: SYS.yellow },
  peak: { icon: Mountain, color: SYS.teal },
  dip: { icon: CloudSun, color: SYS.cyan },
  window: { icon: ShieldCheck, color: SYS.green },
  caffeine: { icon: Coffee, color: SYS.brown },
  close: { icon: Moon, color: SYS.indigo },
  screens: { icon: Smartphone, color: SYS.blue },
  bed: { icon: BedDouble, color: RING.mind.to },
};

const DEBT: Record<'low' | 'moderate' | 'high', { icon: LucideIcon; color: string }> = {
  low: { icon: BatteryFull, color: SYS.green },
  moderate: { icon: BatteryMedium, color: SYS.yellow },
  high: { icon: BatteryLow, color: SYS.orange },
};

// Fixed geometry, so the timeline and the auto-scroll need no measuring.
const PAD = 12; // inside the card
const DEBT_W = 76;
const COL_W = 70;
const NOW_W = 50;
const TOP_H = 20;
const DOT = 36;
const GAP = 8;
const AXIS_Y = TOP_H + GAP + DOT / 2;

// Web-only CSS: native-feeling scroll snap, the page still scrolls vertically over the strip, and
// columns cut by the card's edges fade out instead of showing as clipped fragments.
const web = (s: object) => (Platform.OS === 'web' ? s : null);
const FADE = `linear-gradient(to right, transparent 0, #000 ${PAD + 4}px, #000 calc(100% - ${PAD + 4}px), transparent 100%)`;
const SNAP_X = web({
  scrollSnapType: 'x mandatory',
  scrollPaddingLeft: PAD,
  touchAction: 'pan-x pan-y',
  WebkitMaskImage: FADE,
  maskImage: FADE,
});
const SNAP_START = web({ scrollSnapAlign: 'start' });

export function DayStrip({
  sum,
  edge,
  day,
  habitsDone,
  onCheckIn,
  onCloseDay,
}: {
  sum: SleepSummary;
  edge: SleepEdge;
  /** The schedule's day (keyOf(sched.wakeAt)). */
  day?: DayLog;
  habitsDone: string[];
  onCheckIn: () => void;
  onCloseDay: () => void;
}) {
  // Minute clock: states and the playhead move on their own; the schedule itself comes in from above.
  const [now] = useNow(60_000);
  const { sched, debt, phase } = sum;
  const moments = dayMoments(sched, edge, day, habitsDone);
  const bedAt = moments.find((m) => m.kind === 'bed')?.at;
  const ni = nowIndex(moments, now);

  const scroller = useRef<ScrollViewInstance>(null);
  const opened = useRef(false);
  // Open on now, with one moment of context to its left. Once per mount, so it never fights a swipe.
  const openOnNow = () => {
    if (opened.current) return;
    opened.current = true;
    const x = ni >= 2 ? DEBT_W + (ni - 1) * COL_W : 0;
    if (x > 0) scroller.current?.scrollTo({ x, animated: false });
  };

  const go = (m: Moment) => {
    haptic.tap();
    if (m.go === 'checkin') onCheckIn();
    else if (m.go === 'close') onCloseDay();
    else router.navigate(m.go === 'gate' ? '/gate' : '/sleep');
  };

  const nightLog = wantsNightLog(sched, debt.lastNight, now);
  // Where your body clock is now, in the Sleep tab's words ("First peak until 14:31").
  const headline = nightLog
    ? 'Log last night to update your day'
    : phase
      ? `${phase.label} until ${clockLabel(phase.end)}`
      : `Day starts ${clockLabel(sched.wakeAt)}`;

  // Timeline geometry: from the first moment's centre to the last, gold up to the playhead.
  const firstX = PAD + DEBT_W + COL_W / 2;
  const nowX = PAD + DEBT_W + ni * COL_W + NOW_W / 2;
  const lastX = PAD + DEBT_W + moments.length * COL_W + NOW_W - COL_W / 2;
  // Native snap points: every column start (the playhead column is narrower).
  const snaps = [0, ...moments.map((_, i) => DEBT_W + i * COL_W + (i >= ni ? NOW_W : 0)), DEBT_W + ni * COL_W].sort((a, b) => a - b);

  return (
    <Section title="Your day" action={{ label: 'Sleep', onPress: () => router.navigate('/sleep') }}>
      <Card padding={0} style={{ gap: 0 }}>
        <Pressy
          accessibilityRole="button"
          accessibilityLabel={debt.known ? `${headline}. Sleep debt ${fmtDebt(debt.hours)} hours` : headline}
          scaleTo={0.98}
          onPress={() => {
            haptic.tap();
            router.navigate('/sleep');
          }}
          style={styles.head}>
          <Txt v="subhead" weight="600" color={nightLog ? SYS.indigo : C.label2} numberOfLines={1} style={{ flex: 1 }}>
            {headline}
          </Txt>
          {/* The debt chip scrolls away once the day moves on, so the number stays up here too. */}
          {debt.known ? (
            <Txt v="subhead" weight="700" rounded tabular color={DEBT[debt.zone].color} numberOfLines={1}>
              {`${fmtDebt(debt.hours)} h debt`}
            </Txt>
          ) : null}
        </Pressy>
        <View style={styles.rule} />
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToOffsets={snaps}
          decelerationRate="fast"
          onContentSizeChange={openOnNow}
          style={SNAP_X}
          contentContainerStyle={styles.track}>
          {/* The timeline sits behind the icons. */}
          <View pointerEvents="none" style={[styles.axis, { left: firstX, width: Math.max(0, lastX - firstX) }]} />
          <View pointerEvents="none" style={[styles.axis, styles.axisDone, { left: firstX, width: Math.max(0, nowX - firstX) }]} />

          <DebtColumn hours={debt.known ? debt.hours : undefined} zone={debt.zone} />
          {moments.map((m, i) => (
            <React.Fragment key={m.key}>
              {i === ni ? <NowColumn now={now} /> : null}
              <MomentColumn m={m} state={momentState(m, now, bedAt)} onPress={() => go(m)} />
            </React.Fragment>
          ))}
          {ni === moments.length ? <NowColumn now={now} /> : null}
        </ScrollView>
      </Card>
    </Section>
  );
}

function DebtColumn({ hours, zone }: { hours?: number; zone: 'low' | 'moderate' | 'high' }) {
  const look = DEBT[zone];
  const known = hours !== undefined;
  const label = known ? `Sleep debt ${fmtDebt(hours)} hours` : 'Sleep debt: no data yet';
  return (
    <Pressy
      accessibilityRole="button"
      accessibilityLabel={label}
      scaleTo={0.94}
      onPress={() => {
        haptic.tap();
        router.navigate('/sleep');
      }}
      style={[styles.col, { width: DEBT_W }, SNAP_START]}>
      <Txt v="subhead" weight="700" rounded tabular color={known ? look.color : C.label3} numberOfLines={1}>
        {known ? `${fmtDebt(hours)} h` : '–'}
      </Txt>
      <View style={[styles.dot, { backgroundColor: tint(known ? look.color : SYS.gray, 0.2) }]}>
        <look.icon size={19} color={known ? look.color : C.label3} strokeWidth={2.3} />
      </View>
      <Txt v="caption1" color={C.label2} align="center" numberOfLines={2}>
        Sleep debt
      </Txt>
      <View pointerEvents="none" style={styles.split} />
    </Pressy>
  );
}

function MomentColumn({ m, state, onPress }: { m: Moment; state: MomentState; onPress: () => void }) {
  const { icon: I, color } = LOOK[m.kind];
  const lit = state === 'now' || state === 'due';
  const fg = lit ? (isLight(color) ? '#000000' : '#FFFFFF') : color;
  const time = clockLabel(m.at);
  const label =
    m.end !== undefined
      ? `${m.label}, ${time} to ${clockLabel(m.end)}`
      : `${m.label}, ${time}${m.done ? ', done' : state === 'due' ? ', to do' : ''}`;
  return (
    <Pressy
      accessibilityRole="button"
      accessibilityLabel={label}
      scaleTo={0.92}
      onPress={onPress}
      style={[styles.col, { width: COL_W, opacity: state === 'past' ? 0.42 : 1 }, SNAP_START]}>
      <Txt v="subhead" weight="600" rounded tabular color={lit ? color : C.label} numberOfLines={1}>
        {time}
      </Txt>
      <View style={[styles.dot, { backgroundColor: lit ? color : tint(color, 0.2) }]}>
        <I size={18} color={fg} strokeWidth={2.3} />
        {m.done ? (
          <View style={styles.check}>
            <Check size={10} color="#000000" strokeWidth={3.6} />
          </View>
        ) : null}
      </View>
      <Txt v="caption1" weight={lit ? '600' : '400'} color={lit ? C.label : C.label2} align="center" numberOfLines={2}>
        {m.label}
      </Txt>
    </Pressy>
  );
}

/** The playhead: where you are in the day. */
function NowColumn({ now }: { now: number }) {
  return (
    <View style={[styles.col, { width: NOW_W }]} accessible accessibilityLabel={`Now, ${clockLabel(now)}`}>
      <Txt v="subhead" weight="700" color={C.tint} numberOfLines={1}>
        Now
      </Txt>
      <View style={styles.dot}>
        <View style={styles.playhead} />
        <View style={styles.nowDot} />
      </View>
      <Txt v="caption1" weight="600" rounded tabular color={C.tint} numberOfLines={1}>
        {clockLabel(now)}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingTop: 14, paddingBottom: 12 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: C.separator, marginHorizontal: S.lg },
  track: { paddingHorizontal: PAD, paddingTop: 14, paddingBottom: 14 },
  col: { alignItems: 'center', gap: GAP },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: 'center', justifyContent: 'center' },
  check: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: SYS.green,
    borderWidth: 2,
    borderColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  split: { position: 'absolute', right: 0, top: 6, bottom: 6, width: StyleSheet.hairlineWidth, backgroundColor: C.separator },
  axis: { position: 'absolute', top: 14 + AXIS_Y - 1, height: 2, borderRadius: 1, backgroundColor: C.fill3 },
  axisDone: { backgroundColor: tint(C.tint, 0.55) },
  playhead: { position: 'absolute', top: -2, bottom: -2, width: 2.5, borderRadius: 2, backgroundColor: C.tint },
  nowDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.tint,
    borderWidth: 2.5,
    borderColor: C.card,
  },
});
