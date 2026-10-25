/**
 * Streak: an evolving flame and the big number, freezes in the bank, and this week Mon–Sun.
 * The flame turns blue at 21 days and purple at 66. Missed days are a neutral grey dot, never red.
 */
import { router } from 'expo-router';
import { Flame, Moon, Snowflake } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { C, S, SYS, tint } from '@/constants/theme';
import type { StreakDay } from '@/lib/engage';
import { haptic } from '@/lib/haptics';
import { Card, Divider, MiniRing, Num, Pressy, Section, Txt } from '@/ui';

import { StreakFlame, flameStage } from './StreakFlame';

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MARK = 34;

export function WeekStreak({
  days,
  todayKey,
  streak,
  freezes,
}: {
  days: StreakDay[];
  todayKey: string;
  streak: number;
  freezes: number;
}) {
  const [info, setInfo] = useState(false);
  const on = streak > 0;
  const stage = flameStage(streak);
  const next = stage.next;
  const hint = !on
    ? 'Check in or keep a promise to start one.'
    : next
      ? `${next.at - streak} ${next.at - streak === 1 ? 'day' : 'days'} to a ${next.name} flame`
      : 'Purple flame. It’s a habit now.';

  return (
    <Section title="Streak" action={{ label: 'Medals', onPress: () => router.push('/awards') }}>
      <Card padding={S.lg} style={{ gap: S.lg }}>
        <View style={styles.top}>
          <View style={styles.big}>
            <View style={{ marginBottom: 6 }}>
              <StreakFlame streak={streak} size={40} />
            </View>
            <Num size={44} weight="800" color={on ? stage.text : C.label3}>
              {streak}
            </Num>
            <Txt v="subhead" color={C.label2} style={{ marginBottom: 6 }}>
              {streak === 1 ? 'day' : 'days'}
            </Txt>
          </View>
          <Pressy
            accessibilityRole="button"
            accessibilityLabel={`Freezes: ${freezes}. What is a freeze?`}
            accessibilityState={{ expanded: info }}
            scaleTo={0.94}
            onPress={() => {
              haptic.tap();
              setInfo((x) => !x);
            }}
            style={styles.freeze}>
            <Snowflake size={15} color={SYS.cyan} strokeWidth={2.4} />
            <Txt v="footnote" weight="600" color={SYS.cyan}>
              Freezes: {freezes}
            </Txt>
          </Pressy>
        </View>

        <Txt v="footnote" color={C.label2} style={{ marginTop: -S.sm }}>
          {info ? 'A freeze protects your streak if you miss a day. You earn one every 7 days.' : hint}
        </Txt>

        <Divider />

        <View style={styles.week} accessibilityRole="summary">
          {days.map((d) => {
            const today = d.key === todayKey;
            return (
              <View key={d.key} style={styles.day} accessible accessibilityLabel={`${d.date.toDateString()}: ${describe(d.state)}`}>
                <View style={[styles.letter, today && { backgroundColor: C.tint }]}>
                  <Txt v="caption1" weight={today ? '700' : '600'} color={today ? C.onTint : C.label2}>
                    {LETTERS[d.date.getDay()]}
                  </Txt>
                </View>
                <DayMark day={d} flame={stage.outer} />
              </View>
            );
          })}
        </View>
      </Card>
    </Section>
  );
}

function describe(s: StreakDay['state']) {
  return s === 'done' ? 'showed up' : s === 'frozen' ? 'protected by a freeze' : s === 'rest' ? 'rest day' : s === 'today' ? 'today' : s === 'future' ? 'coming up' : 'missed';
}

function DayMark({ day, flame }: { day: StreakDay; flame: string }) {
  switch (day.state) {
    case 'done':
      return (
        <MiniRing value={Math.min(1, day.rings.promises)} size={MARK} stroke={4.5}>
          <Flame size={13} color={flame} fill={flame} strokeWidth={2} />
        </MiniRing>
      );
    case 'today':
      return <MiniRing value={Math.min(1, day.rings.promises)} size={MARK} stroke={4.5} />;
    case 'frozen':
      return (
        <View style={[styles.disc, { backgroundColor: tint(SYS.cyan, 0.18) }]}>
          <Snowflake size={16} color={SYS.cyan} strokeWidth={2.4} />
        </View>
      );
    case 'rest':
      return (
        <View style={[styles.disc, { backgroundColor: C.fill4 }]}>
          <Moon size={15} color={C.label3} strokeWidth={2.4} />
        </View>
      );
    case 'missed':
      return (
        <View style={styles.disc}>
          <View style={[styles.dot, { backgroundColor: C.fill }]} />
        </View>
      );
    default:
      return (
        <View style={styles.disc}>
          <View style={[styles.dot, { backgroundColor: C.fill4 }]} />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md },
  big: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  freeze: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: tint(SYS.cyan, 0.14),
  },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { flex: 1, alignItems: 'center', gap: 8 },
  letter: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  disc: { width: MARK, height: MARK, borderRadius: MARK / 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
