/**
 * Today: Apple Fitness Summary for discipline.
 * Rings are the hero, then one primary action by stage, then promises, the streak and trading.
 */
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { S } from '@/constants/theme';
import { CheckInSheet } from '@/features/today/CheckInSheet';
import { CloseSheet } from '@/features/today/CloseSheet';
import { CoachCard } from '@/features/today/CoachCard';
import { ProfileButton, WhyCard } from '@/features/today/Header';
import { HeroRings } from '@/features/today/HeroRings';
import { PrimaryAction } from '@/features/today/PrimaryAction';
import { Promises } from '@/features/today/Promises';
import { TradingCard } from '@/features/today/TradingCard';
import { appleDate, useHourClock } from '@/features/today/useToday';
import { WeekStreak } from '@/features/today/WeekStreak';
import { SleepGlance } from '@/features/sleep/parts';
import { coach as coachFor } from '@/lib/coach';
import { sleepSummary } from '@/lib/sleep';
import { tradingToday } from '@/lib/derive';
import { isPerfect, ringDetails, ringsFor, stageOf, streak, weekStrip } from '@/lib/engage';
import { dayKey, useStore } from '@/lib/store';
import { Screen } from '@/ui';

type SheetName = 'checkin' | 'close' | null;

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

  return (
    <Screen title="Today" caption={appleDate(now)} accessory={<ProfileButton name={settings.name} />}>
      <View style={{ gap: S.md }}>
        <HeroRings details={details} perfect={perfect} />
        <PrimaryAction
          stage={stage}
          checkin={day?.checkin}
          close={day?.close}
          streak={streakNow}
          limitHit={!!trading.limitHit}
          onCheckIn={() => setSheet('checkin')}
          onCloseDay={() => setSheet('close')}
        />
      </View>

      <CoachCard coach={coach} dayKey={key} />

      <SleepGlance sum={sleepSummary(state, now.getTime())} now={now.getTime()} />

      <Promises dayKey={key} promises={settings.promises} kept={day?.promises ?? {}} />

      <WeekStreak days={weekStrip(state, now)} todayKey={key} streak={streakNow} freezes={settings.freezes} />

      <TradingCard trading={trading} maxTrades={settings.maxTrades} showGate={stage !== 'day'} />

      {why ? <WhyCard why={why} /> : null}

      <CheckInSheet visible={sheet === 'checkin'} onClose={() => setSheet(null)} checkin={day?.checkin} />
      <CloseSheet visible={sheet === 'close'} onClose={() => setSheet(null)} close={day?.close} intention={day?.checkin?.intention} />
    </Screen>
  );
}
