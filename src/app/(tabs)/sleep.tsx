/**
 * Sleep: Rise-style. Sleep debt is the hero, then today's energy schedule from your
 * body clock, timed habits for tonight, and your nights. "Start sleep mode" is the one action.
 */
import { useFocusEffect } from 'expo-router';
import { Moon, Plus } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { C, S } from '@/constants/theme';
import { TimePill } from '@/features/settings/TimePill';
import { DebtCard } from '@/features/sleep/DebtCard';
import { EnergyCard } from '@/features/sleep/EnergyCard';
import { LogSheet } from '@/features/sleep/LogSheet';
import { SLEEP_TINT } from '@/features/sleep/look';
import { Habits } from '@/features/sleep/parts';
import { openSleepMode } from '@/features/sleep/SleepMode';
import { asleepHours, clockLabel, fmtDur, isNap, keyOf, sleepSummary } from '@/lib/sleep';
import { actions, useStore, type SleepLog } from '@/lib/store';
import { useNow } from '@/lib/useNow';
import { Button, Group, IconButton, ListRow, Screen, Section, Stepper, Txt } from '@/ui';

const DAY = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

export default function SleepScreen() {
  const state = useStore();
  const [now, refresh] = useNow(60_000);
  useFocusEffect(useCallback(() => refresh(), [refresh]));
  const [sheet, setSheet] = useState<{ log?: SleepLog } | null>(null);

  const sum = useMemo(() => sleepSummary(state, now), [state, now]);
  const { debt, sched, phase, need } = sum;
  const logs = state.sleeps ?? [];
  const todayKey = keyOf(sched.wakeAt);
  const done = state.sleepHabits?.[todayKey] ?? [];
  const evening = phase && ['winddown', 'melatonin', 'sleep'].includes(phase.id);
  const needsLog = debt.lastNight === undefined && now < sched.wakeAt + 8 * 3_600_000;

  return (
    <Screen
      title="Sleep"
      caption={`Tonight ${clockLabel(sched.melatonin.start)}–${clockLabel(sched.melatonin.end)}`}
      accessory={<IconButton icon={Plus} label="Log sleep" onPress={() => setSheet({})} />}>
      <View style={{ gap: S.md }}>
        <DebtCard debt={debt} need={need} logs={logs} now={now} />
        {needsLog && !evening ? (
          <Button title="Log last night" icon={Plus} color={SLEEP_TINT} textColor="#FFFFFF" onPress={() => setSheet({})} />
        ) : (
          <Button
            title="Start sleep mode"
            icon={Moon}
            kind={evening ? 'filled' : 'tinted'}
            color={SLEEP_TINT}
            textColor={evening ? '#FFFFFF' : undefined}
            onPress={openSleepMode}
          />
        )}
      </View>

      <Section title="Energy">
        <EnergyCard sched={sched} now={now} phase={phase} />
      </Section>

      <Section title="Today">
        <Habits sched={sched} done={done} dayKey={todayKey} now={now} />
      </Section>

      <Section title="Nights" action={{ label: 'Add', onPress: () => setSheet({}) }}>
        {logs.length ? (
          <Group>
            {logs.slice(0, 7).map((l) => (
              <ListRow
                key={l.id}
                title={isNap(l) ? `Nap, ${DAY.format(l.wake)}` : DAY.format(l.wake)}
                subtitle={`${clockLabel(l.bed)}–${clockLabel(l.wake)}`}
                value={fmtDur(asleepHours(l))}
                chevron
                onPress={() => setSheet({ log: l })}
              />
            ))}
          </Group>
        ) : (
          <Txt v="subhead" color={C.label2} style={{ paddingHorizontal: S.lg }}>
            Use sleep mode tonight, or add a night by hand.
          </Txt>
        )}
      </Section>

      <Group
        header="Your sleep"
        footer="Most adults need 7–9 h. If you feel tired with low debt, raise your need. Wake goal is used until 3 nights are logged.">
        <ListRow
          title="Sleep need"
          accessory={
            <Stepper
              value={need}
              min={6}
              max={10}
              step={0.25}
              format={(v) => fmtDur(v).replace(/ /g, '')}
              onChange={(v) => actions.updateSettings({ sleepNeed: v })}
            />
          }
        />
        <ListRow
          title="Wake goal"
          accessory={
            <TimePill value={state.settings.wakeGoal || '07:00'} onChange={(t) => actions.updateSettings({ wakeGoal: t })} label="Wake goal" />
          }
        />
      </Group>

      <LogSheet visible={!!sheet} onClose={() => setSheet(null)} log={sheet?.log} />
    </Screen>
  );
}
