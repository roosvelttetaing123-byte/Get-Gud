/**
 * Today: Apple Fitness Summary for discipline.
 * First screen: the rings and one primary action by stage (trading folded into it), then the day
 * at a glance. Below: one coach card, promises, the streak, and the why as a quiet quote.
 */
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { S } from '@/constants/theme';
import { CheckInSheet } from '@/features/today/CheckInSheet';
import { CloseSheet } from '@/features/today/CloseSheet';
import { CoachCard } from '@/features/today/CoachCard';
import { DayStrip } from '@/features/today/DayStrip';
import { ProfileButton, WhyQuote } from '@/features/today/Header';
import { HeroRings } from '@/features/today/HeroRings';
import { PrimaryAction } from '@/features/today/PrimaryAction';
import { Promises } from '@/features/today/Promises';
import { RingsSheet } from '@/features/today/RingsSheet';
import { appleDate, useHourClock } from '@/features/today/useToday';
import { WeekStreak } from '@/features/today/WeekStreak';
import { coach as coachFor } from '@/lib/coach';
import { tradingToday } from '@/lib/derive';
import { isPerfect, ringDetails, ringsFor, stageOf, streak, weekStrip } from '@/lib/engage';
import { keyOf, sleepSummary } from '@/lib/sleep';
import { sleepEdge } from '@/lib/sleepEdge';
import { dayKey, useStore } from '@/lib/store';
import { Screen } from '@/ui';

type SheetName = 'rings' | 'checkin' | 'close' | null;

export default function TodayScreen() {
  const state = useStore();
  const now = useHourClock();
  const key = dayKey(now);
  const [sheet, setSheet] = useState<SheetName>(null);

  const { settings } = state;
  const day = state.days[key];
  const details = ringDetails(state, key);
  const perfect = isPerfect(ringsFor(state, key));
  const stage = stageOf(state, now);
  const trading = tradingToday(state, now.getTime());
  const why = settings.why.trim();
  const streakNow = streak(state, now);
  // The learning engine: recomputed when your data changes or the hour ticks over.
  const coach = useMemo(() => coachFor(state, now.getTime()), [state, now]);
  // The sleep engine: today's schedule, and what tiredness costs you (it picks the trade windows).
  const sum = useMemo(() => sleepSummary(state, now.getTime()), [state, now]);
  const edge = useMemo(() => sleepEdge(state), [state]);
  // The strip follows the schedule's day (after midnight it's still last night until you wake).
  const stripKey = keyOf(sum.sched.wakeAt);
  const todays = state.trades.filter((t) => dayKey(t.ts) === key);

  const openCheckIn = () => setSheet('checkin');
  const openClose = () => setSheet('close');

  return (
    <Screen backdrop="today" title="Today" caption={appleDate(now)} accessory={<ProfileButton name={settings.name} />}>
      <View style={{ gap: S.md }}>
        <HeroRings details={details} perfect={perfect} evening={stage === 'close'} onPress={() => setSheet('rings')} />
        <PrimaryAction
          stage={stage}
          checkin={day?.checkin}
          close={day?.close}
          streak={streakNow}
          trade={{ trading, maxTrades: settings.maxTrades, maxLossStreak: settings.maxLossStreak, sched: sum.sched, edge }}
          onCheckIn={openCheckIn}
          onCloseDay={openClose}
        />
      </View>

      <DayStrip
        sum={sum}
        edge={edge}
        day={state.days[stripKey]}
        habitsDone={state.sleepHabits?.[stripKey] ?? []}
        onCheckIn={openCheckIn}
        onCloseDay={openClose}
      />

      <CoachCard coach={coach} dayKey={key} />

      <Promises dayKey={key} promises={settings.promises} kept={day?.promises ?? {}} />

      <WeekStreak days={weekStrip(state, now)} todayKey={key} streak={streakNow} freezes={settings.freezes} />

      {/* The Journal's "Week in review" card goes here, between the streak and the why. */}

      {why ? <WhyQuote why={why} /> : null}

      <RingsSheet
        visible={sheet === 'rings'}
        onClose={() => setSheet(null)}
        details={details}
        perfect={perfect}
        dayKey={key}
        promises={settings.promises}
        kept={day?.promises ?? {}}
        checkin={day?.checkin}
        close={day?.close}
        closeFrom={day?.checkin ? 17 : 18}
        canClose={stage === 'close' || stage === 'done'}
        trades={todays}
        limitHit={trading.limitHit}
        onCheckIn={openCheckIn}
        onCloseDay={openClose}
      />
      <CheckInSheet visible={sheet === 'checkin'} onClose={() => setSheet(null)} checkin={day?.checkin} />
      <CloseSheet visible={sheet === 'close'} onClose={() => setSheet(null)} close={day?.close} intention={day?.checkin?.intention} />
    </Screen>
  );
}
