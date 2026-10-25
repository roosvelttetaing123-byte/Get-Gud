/**
 * One day, opened from "Your days": how the morning felt, the night before, the trades,
 * the promises and how the evening closed. Missed promises are neutral grey, never red.
 */
import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Annoyed,
  Battery,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BedDouble,
  Circle,
  CircleCheck,
  Frown,
  Laugh,
  Meh,
  Smile,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { C, R, S, SYS, VALENCE, tint } from '@/constants/theme';
import { clockLabel, fmtDur, keyOf } from '@/lib/sleep';
import { useStore } from '@/lib/store';
import { Divider, IconSquare, Num, Row, Section, Sheet, Txt } from '@/ui';

import { dayDetail, dayTitle } from './calendar';
import { EntryRow } from './Entries';
import { count, fmtRx, rColor } from './format';

const MOOD_IMAGES: ImageSource[] = [
  require('@/assets/3d/mood-1.webp'),
  require('@/assets/3d/mood-2.webp'),
  require('@/assets/3d/mood-3.webp'),
  require('@/assets/3d/mood-4.webp'),
  require('@/assets/3d/mood-5.webp'),
  require('@/assets/3d/mood-6.webp'),
  require('@/assets/3d/mood-7.webp'),
];

/** Same words and colours as the morning check-in and the evening close on Today. */
const ENERGY: { label: string; icon: LucideIcon; color: string }[] = [
  { label: 'Drained', icon: Battery, color: SYS.indigo },
  { label: 'Low', icon: BatteryLow, color: SYS.blue },
  { label: 'Okay', icon: BatteryMedium, color: SYS.teal },
  { label: 'Good', icon: BatteryFull, color: SYS.green },
  { label: 'Charged', icon: Zap, color: SYS.yellow },
];
const RATINGS: { label: string; icon: LucideIcon; color: string }[] = [
  { label: 'Rough', icon: Frown, color: SYS.red },
  { label: 'Meh', icon: Annoyed, color: SYS.orange },
  { label: 'Okay', icon: Meh, color: SYS.yellow },
  { label: 'Good', icon: Smile, color: SYS.mint },
  { label: 'Great', icon: Laugh, color: SYS.green },
];

export function DaySheet({
  dayKey,
  visible,
  onClose,
  now,
  onOpenTrade,
}: {
  dayKey: string | null;
  visible: boolean;
  onClose: () => void;
  now: number;
  onOpenTrade: (id: string) => void;
}) {
  const today = dayKey === keyOf(now);
  return (
    <Sheet visible={visible} onClose={onClose} title={dayKey ? (today ? 'Today' : dayTitle(dayKey)) : ' '} detent="large">
      {dayKey ? <DayBody dayKey={dayKey} today={today} onOpenTrade={onOpenTrade} /> : null}
    </Sheet>
  );
}

function DayBody({ dayKey, today, onOpenTrade }: { dayKey: string; today: boolean; onOpenTrade: (id: string) => void }) {
  const state = useStore();
  const d = dayDetail(state, dayKey);
  const closed = d.trades.filter((t) => t.taken && t.result);
  const net = closed.reduce((a, t) => a + (t.r ?? 0), 0);
  const kept = d.promises.filter((p) => p.kept).length;

  return (
    <>
      <MoodHero valence={d.valence} energy={d.checkin?.energy} intention={d.checkin?.intention} checkedIn={!!d.checkin} />

      {d.sleep ? (
        <View style={styles.group}>
          <View style={styles.row}>
            <IconSquare icon={BedDouble} color={SYS.indigo} />
            <View style={{ flex: 1, gap: 1 }}>
              <Txt v="body" weight="600">
                {`${fmtDur(d.sleep.hours)} asleep`}
              </Txt>
              <Txt v="footnote" color={C.label2}>
                {`${clockLabel(d.sleep.bed)} to ${clockLabel(d.sleep.wake)}${d.sleep.naps ? ` · ${fmtDur(d.sleep.naps)} nap` : ''}`}
              </Txt>
            </View>
            <Txt v="footnote" color={C.label3}>
              Night before
            </Txt>
          </View>
        </View>
      ) : null}

      {d.trades.length ? (
        <Section title="Trades">
          <View style={{ gap: S.sm }}>
            {closed.length ? (
              <Row gap={6} style={{ paddingHorizontal: 4, marginTop: -S.xs }}>
                <Num size={17} weight="700" color={rColor(net)}>
                  {fmtRx(net)}
                </Num>
                <Txt v="subhead" color={C.label2}>
                  {`from ${count(closed.length, 'trade')}`}
                </Txt>
              </Row>
            ) : null}
            <View style={styles.group}>
              {d.trades.map((t, i) => (
                <React.Fragment key={t.id}>
                  {i > 0 ? <Divider inset={68} /> : null}
                  <EntryRow trade={t} onPress={t.taken ? () => onOpenTrade(t.id) : undefined} />
                </React.Fragment>
              ))}
            </View>
          </View>
        </Section>
      ) : null}

      {d.promises.length ? (
        <Section title="Promises">
          <View style={styles.group}>
            <View style={[styles.row, { paddingVertical: 10 }]}>
              <Txt v="subhead" weight="600" color={kept ? SYS.orange : C.label2} style={{ flex: 1 }}>
                {`${kept} of ${d.promises.length} kept`}
              </Txt>
            </View>
            {d.promises.map((p) => (
              <React.Fragment key={p.name}>
                <Divider inset={S.lg} />
                <View style={styles.row} accessible accessibilityLabel={`${p.name}: ${p.kept ? 'kept' : 'not kept'}`}>
                  {p.kept ? (
                    <CircleCheck size={24} color={SYS.green} strokeWidth={2.4} />
                  ) : (
                    <Circle size={24} color={C.label3} strokeWidth={2} />
                  )}
                  <Txt v="body" color={p.kept ? C.label : C.label2} style={{ flex: 1 }}>
                    {p.name}
                  </Txt>
                </View>
              </React.Fragment>
            ))}
          </View>
        </Section>
      ) : null}

      {d.urges.logged ? (
        <View style={styles.group}>
          <View style={styles.row}>
            <IconSquare icon={Wind} color={SYS.cyan} />
            <Txt v="body" style={{ flex: 1 }}>
              {d.urges.riddenOut === d.urges.logged
                ? `${count(d.urges.logged, 'urge')} ridden out`
                : `${d.urges.riddenOut} of ${count(d.urges.logged, 'urge')} ridden out`}
            </Txt>
          </View>
        </View>
      ) : null}

      {d.close ? <Evening rating={d.close.rating} win={d.close.win} lesson={d.close.lesson} /> : null}

      {d.empty ? (
        <View style={[styles.group, { padding: S.xl, alignItems: 'center', gap: 4 }]}>
          <Txt v="headline">Nothing logged</Txt>
          <Txt v="subhead" color={C.label2} align="center">
            {today ? 'Check in on Today to start this day.' : 'A quiet day. Rest counts too.'}
          </Txt>
        </View>
      ) : null}
    </>
  );
}

function MoodHero({
  valence,
  energy,
  intention,
  checkedIn,
}: {
  valence?: number;
  energy?: number;
  intention?: string;
  checkedIn: boolean;
}) {
  if (!checkedIn) {
    return (
      <View style={[styles.group, styles.row, { paddingVertical: S.lg }]}>
        <View style={styles.noMood} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="headline" color={C.label2}>
            No check-in
          </Txt>
          <Txt v="footnote" color={C.label3}>
            The square stays grey on days without one.
          </Txt>
        </View>
      </View>
    );
  }
  const mood = valence ? VALENCE[valence - 1] : undefined;
  const e = energy ? ENERGY[energy - 1] : undefined;
  return (
    <View style={[styles.hero, { borderColor: mood ? tint(mood.color, 0.35) : 'transparent' }]}>
      {mood ? (
        <LinearGradient colors={[tint(mood.color, 0.32), tint(mood.color, 0.06)]} style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={styles.heroTop}>
        {valence ? <Image source={MOOD_IMAGES[valence - 1]} style={styles.shape} contentFit="contain" /> : null}
        <View style={{ flex: 1, gap: S.xs }}>
          <Txt v="footnote" weight="600" color={C.label2}>
            Morning
          </Txt>
          <Txt v="title2" rounded color={mood?.color ?? C.label}>
            {mood?.label ?? 'Checked in'}
          </Txt>
          {e ? (
            <Row gap={6}>
              <e.icon size={17} color={e.color} strokeWidth={2.4} />
              <Txt v="subhead" weight="600" color={e.color}>
                {`${e.label} energy`}
              </Txt>
            </Row>
          ) : null}
        </View>
      </View>
      {intention ? (
        <Txt v="body" style={{ fontStyle: 'italic' }}>
          {`“${intention}”`}
        </Txt>
      ) : null}
    </View>
  );
}

function Evening({ rating, win, lesson }: { rating?: number; win?: string; lesson?: string }) {
  const r = rating ? RATINGS[rating - 1] : undefined;
  return (
    <Section title="Evening">
      <View style={styles.group}>
        {r ? (
          <View style={styles.row}>
            <IconSquare icon={r.icon} color={r.color} />
            <Txt v="body" weight="600" style={{ flex: 1 }}>
              {`${r.label} day`}
            </Txt>
          </View>
        ) : null}
        {win ? (
          <>
            {r ? <Divider inset={S.lg} /> : null}
            <Line label="Went well" text={win} />
          </>
        ) : null}
        {lesson ? (
          <>
            {r || win ? <Divider inset={S.lg} /> : null}
            <Line label="Lesson" text={lesson} />
          </>
        ) : null}
        {!r && !win && !lesson ? (
          <View style={styles.row}>
            <Txt v="body" color={C.label2}>
              Day closed
            </Txt>
          </View>
        ) : null}
      </View>
    </Section>
  );
}

function Line({ label, text }: { label: string; text: string }) {
  return (
    <View style={[styles.row, { flexDirection: 'column', alignItems: 'flex-start', gap: 2 }]}>
      <Txt v="footnote" weight="600" color={C.label2}>
        {label}
      </Txt>
      <Txt v="body">{text}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { backgroundColor: C.card2, borderRadius: R.inner + 6, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: 12, minHeight: 52 },
  hero: { backgroundColor: C.card2, borderRadius: R.card, padding: S.lg, gap: S.md, overflow: 'hidden', borderWidth: 1 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: S.lg },
  shape: { width: 96, height: 96 },
  noMood: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.fill3 },
});
