/**
 * Journal: one story, top to bottom. Your week (Sunday evening to Tuesday), anything waiting for
 * a result, the one insight, R by day (scrub it), your days in colour, what moves your results,
 * then the entries themselves.
 */
import { router } from 'expo-router';
import { BookOpen, Plus } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';

import { useNow } from '@/features/journal/bits';
import { DaySheet } from '@/features/journal/DaySheet';
import { Entries, NeedsResult } from '@/features/journal/Entries';
import { HighlightCard } from '@/features/journal/Highlight';
import { chartSeries, pickHighlight, type Range } from '@/features/journal/insight';
import { MoodCalendar } from '@/features/journal/MoodCalendar';
import { Patterns } from '@/features/journal/Patterns';
import { RChart } from '@/features/journal/RChart';
import { useLatestReview, WeekReviewCard } from '@/features/review/WeekReviewCard';
import { WeekStory } from '@/features/review/WeekStory';
import { journalStats } from '@/lib/derive';
import { sleepEdge } from '@/lib/sleepEdge';
import { useStore } from '@/lib/store';
import { Empty, IconButton, Screen, Section } from '@/ui';

const toGate = () => router.push('/gate');
const openTrade = (id: string) => router.push(`/trade/${id}`);

export default function JournalScreen() {
  const state = useStore();
  const { trades } = state;
  const now = useNow();
  const [range, setRange] = useState<Range>('7d');
  const [day, setDay] = useState<{ key: string; open: boolean } | null>(null);
  const [story, setStory] = useState(false);
  const latest = useLatestReview(now);

  const stats = useMemo(() => journalStats(state), [state]);
  const highlight = useMemo(() => pickHighlight(stats), [stats]);
  const edge = useMemo(() => sleepEdge(state), [state]);
  const series = useMemo(() => chartSeries(trades, range, now), [trades, range, now]);

  const closeDay = () => setDay((d) => (d ? { ...d, open: false } : d));

  return (
    <Screen
      backdrop="journal"
      title="Journal"
      accessory={<IconButton icon={Plus} label="Check before you trade" onPress={toGate} />}>
      <WeekReviewCard now={now} />
      <NeedsResult trades={trades} now={now} onOpen={openTrade} />

      {trades.length ? (
        <>
          <HighlightCard highlight={highlight} closed={stats.closed} />
          <RChart series={series} range={range} onRange={setRange} />
        </>
      ) : (
        <Empty
          icon={BookOpen}
          title="Every trade starts at the gate."
          message="Name the feeling, tick your rules, then decide."
          action={{ label: 'Check before you trade', onPress: toGate }}
        />
      )}

      <Section
        title="Your days"
        action={latest.review.empty ? undefined : { label: 'Week in review', onPress: () => setStory(true) }}>
        <MoodCalendar state={state} now={now} onOpenDay={(key) => setDay({ key, open: true })} />
      </Section>

      {trades.length ? <Patterns stats={stats} edge={edge} /> : null}
      {trades.length ? <Entries trades={trades} now={now} onOpen={openTrade} /> : null}

      <DaySheet
        dayKey={day?.key ?? null}
        visible={!!day?.open}
        onClose={closeDay}
        now={now}
        onOpenTrade={(id) => {
          closeDay();
          // Let the sheet get out of the way before the trade slides up.
          setTimeout(() => openTrade(id), 320);
        }}
      />
      <WeekStory visible={story} now={now} onClose={() => setStory(false)} />
    </Screen>
  );
}
