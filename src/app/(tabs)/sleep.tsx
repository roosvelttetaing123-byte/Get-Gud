/**
 * Sleep: Rise-style, read top to bottom.
 *   On the night sky: sleep debt and the one action (start sleep mode, or log last night).
 *   Then the last 14 nights (scrub them), today's body clock as a dial (scrub it), when to
 *   trade, tonight's habits, your nights, and the settings behind it all.
 */
import { useFocusEffect } from 'expo-router';
import { Heart, Moon, Plus, Sparkles, Target } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { C, S } from '@/constants/theme';
import { TimePill } from '@/features/settings/TimePill';
import { DebtHero } from '@/features/sleep/DebtHero';
import { EnergyCard } from '@/features/sleep/EnergyCard';
import { compactDur } from '@/features/sleep/format';
import { HEALTH_PINK, HealthSheet, importFromClipboard, resultLine } from '@/features/sleep/HealthSheet';
import { LogSheet } from '@/features/sleep/LogSheet';
import { SLEEP_TINT } from '@/features/sleep/look';
import { NightBars } from '@/features/sleep/NightBars';
import { NightsList } from '@/features/sleep/NightsList';
import { Habits } from '@/features/sleep/parts';
import { openSleepMode } from '@/features/sleep/SleepMode';
import { TradeWindows } from '@/features/sleep/TradeWindows';
import { haptic } from '@/lib/haptics';
import { FIT_MIN, modelFit, type FitLevel } from '@/lib/modelFit';
import { clockLabel, keyOf, sleepSummary } from '@/lib/sleep';
import { sleepEdge, tradeWindows } from '@/lib/sleepEdge';
import { learnNeed, needSuggestion } from '@/lib/sleepNeed';
import { actions, useStore, type SleepLog } from '@/lib/store';
import { useNow } from '@/lib/useNow';
import { Button, Group, IconButton, ListRow, Screen, Section, Stepper, Txt } from '@/ui';

const FIT_WORD: Record<FitLevel, string> = { learning: 'Learning', good: 'Good', fair: 'Fair', weak: 'Weak' };

export default function SleepScreen() {
  const state = useStore();
  const [now, refresh] = useNow(60_000);
  useFocusEffect(useCallback(() => refresh(), [refresh]));
  const [sheet, setSheet] = useState<{ log?: SleepLog } | null>(null);
  const [health, setHealth] = useState(false);
  const [note, setNote] = useState<string | undefined>();
  const linked = state.settings.healthImport;
  const quickImport = () => {
    importFromClipboard().then((r) => {
      setNote(resultLine(r));
      if (r.ok) haptic.success();
      else setHealth(true);
    });
  };

  const sum = useMemo(() => sleepSummary(state, now), [state, now]);
  const { debt, sched, phase, need } = sum;
  const edge = useMemo(() => sleepEdge(state), [state]);
  // Every trade window today, past ones too: the dial marks them all.
  const windows = useMemo(() => tradeWindows(sched, edge, -Infinity).windows, [sched, edge]);
  const fit = useMemo(() => modelFit(state), [state]);
  const learned = useMemo(() => learnNeed(state.sleeps ?? [], state.settings, now), [state, now]);
  const suggest = needSuggestion(learned, need);
  const logs = state.sleeps ?? [];
  const todayKey = keyOf(sched.wakeAt);
  const done = state.sleepHabits?.[todayKey] ?? [];
  const evening = phase && ['winddown', 'melatonin', 'sleep'].includes(phase.id);
  const needsLog = debt.lastNight === undefined && now < sched.wakeAt + 8 * 3_600_000;

  return (
    <Screen
      backdrop="sleep"
      title="Sleep"
      caption={`Tonight ${clockLabel(sched.melatonin.start)}–${clockLabel(sched.melatonin.end)}`}
      accessory={<IconButton icon={Plus} label="Log sleep" onPress={() => setSheet({})} />}>
      <View style={{ gap: S.xl }}>
        <DebtHero debt={debt} need={need} />
        <View style={{ gap: S.sm }}>
          {needsLog && !evening && linked ? (
            <Button title="Import from Health" icon={Heart} color={HEALTH_PINK} textColor="#FFFFFF" onPress={quickImport} />
          ) : needsLog && !evening ? (
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
          {note ? (
            <Txt v="footnote" color={C.label2} align="center">
              {note}
            </Txt>
          ) : null}
        </View>
      </View>

      <NightBars logs={logs} need={need} now={now} />

      <Section title="Energy">
        <EnergyCard sched={sched} now={now} phase={phase} windows={windows} />
      </Section>

      <Section title="Trade windows">
        <TradeWindows sched={sched} edge={edge} now={now} />
      </Section>

      <Section title="Habits">
        <Habits sched={sched} done={done} dayKey={todayKey} now={now} />
      </Section>

      <Section title="Nights" action={{ label: 'Add', onPress: () => setSheet({}) }}>
        <NightsList logs={logs} onOpen={(l) => setSheet({ log: l })} />
      </Section>

      <Group
        header="Your sleep"
        footer={`${linked ? 'Health replaces manual logs for the same night. ' : ''}Most adults need 7–9 h. Learned need uses your rest days, model fit your morning check-ins. Wake goal applies until 3 nights are logged.`}>
        <ListRow
          icon={Heart}
          iconColor={HEALTH_PINK}
          title="Apple Health"
          subtitle={state.settings.healthGist ? 'Auto sync on' : linked ? 'Garmin, Apple Watch' : 'Import Garmin or Apple Watch sleep'}
          chevron
          onPress={() => setHealth(true)}
        />
        <ListRow
          title="Sleep need"
          accessory={
            <Stepper
              value={need}
              min={6}
              max={10}
              step={0.25}
              format={compactDur}
              onChange={(v) => actions.updateSettings({ sleepNeed: v })}
            />
          }
        />
        {suggest !== undefined ? (
          <ListRow
            icon={Sparkles}
            iconColor={SLEEP_TINT}
            title="Learned need"
            subtitle={`From ${learned.nights} rest-day nights`}
            accessory={
              <Button
                title={`Use ${compactDur(suggest)}`}
                kind="tinted"
                size="small"
                color={SLEEP_TINT}
                full={false}
                onPress={() => {
                  haptic.success();
                  actions.updateSettings({ sleepNeed: suggest });
                }}
              />
            }
          />
        ) : null}
        <ListRow
          title="Wake goal"
          accessory={
            <TimePill value={state.settings.wakeGoal || '07:00'} onChange={(t) => actions.updateSettings({ wakeGoal: t })} label="Wake goal" />
          }
        />
        <ListRow
          icon={Target}
          iconColor={C.teal}
          title="Model fit"
          subtitle={fit.level === 'learning' ? `${Math.min(fit.days, FIT_MIN)} of ${FIT_MIN} check-ins with energy` : `Curve vs ${fit.days} check-ins`}
          value={FIT_WORD[fit.level]}
        />
      </Group>

      <HealthSheet visible={health} onClose={() => setHealth(false)} />
      <LogSheet visible={!!sheet} onClose={() => setSheet(null)} log={sheet?.log} />
    </Screen>
  );
}
