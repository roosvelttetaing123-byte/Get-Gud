import { router } from 'expo-router';
import { BookOpen, Plus } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { C, S } from '@/constants/theme';
import { useNow } from '@/features/journal/bits';
import { EntryDay } from '@/features/journal/Entries';
import { FeelingCosts } from '@/features/journal/FeelingCosts';
import { groupByDay } from '@/features/journal/format';
import { HighlightCard } from '@/features/journal/Highlight';
import { chartSeries, pickHighlight, type Range } from '@/features/journal/insight';
import { RChart } from '@/features/journal/RChart';
import { RulesSummary } from '@/features/journal/RulesSummary';
import { journalStats } from '@/lib/derive';
import { useStore } from '@/lib/store';
import { Button, Empty, IconButton, Screen, Section } from '@/ui';

const PAGE = 60;
const toGate = () => router.push('/gate');
const openTrade = (id: string) => router.push(`/trade/${id}`);

export default function JournalScreen() {
  const state = useStore();
  const { trades } = state;
  const now = useNow();
  const [range, setRange] = useState<Range>('week');
  const [limit, setLimit] = useState(PAGE);

  const stats = useMemo(() => journalStats(state), [state]);
  const highlight = useMemo(() => pickHighlight(stats), [stats]);
  const series = useMemo(() => chartSeries(trades, range, now), [trades, range, now]);

  // Newest first, capped, then grouped by day.
  const sorted = useMemo(() => [...trades].sort((a, b) => b.ts - a.ts), [trades]);
  const days = useMemo(() => groupByDay(sorted.slice(0, limit)), [sorted, limit]);

  const accessory = <IconButton icon={Plus} label="Check before you trade" onPress={toGate} />;

  if (!trades.length) {
    return (
      <Screen title="Journal" accessory={accessory}>
        <Empty
          icon={BookOpen}
          title="Every trade starts at the gate."
          message="Name the feeling, tick your rules, then decide."
          action={{ label: 'Check before you trade', onPress: toGate }}
        />
      </Screen>
    );
  }

  const feelings = stats.byEmotion;
  const hasRules = stats.followed.n + stats.broke.n + stats.overrides.n + stats.skipped > 0;

  return (
    <Screen title="Journal" accessory={accessory}>
      <HighlightCard highlight={highlight} closed={stats.closed} />

      <RChart series={series} range={range} onRange={setRange} />

      {feelings.length ? (
        <Section title="What each feeling costs" footer="Average R per trade, worst first.">
          <FeelingCosts buckets={feelings} />
        </Section>
      ) : null}

      {hasRules ? (
        <Section title="By the rules">
          <RulesSummary
            followed={stats.followed}
            broke={stats.broke}
            overrides={stats.overrides}
            skipped={stats.skipped}
          />
        </Section>
      ) : null}

      <Section title="Entries">
        <View style={{ gap: S.lg }}>
          {days.map((d) => (
            <EntryDay key={d.key} group={d} now={now} onOpen={openTrade} />
          ))}
        </View>
        {sorted.length > limit ? (
          <Button
            title="Show more"
            kind="gray"
            size="medium"
            color={C.tint}
            onPress={() => setLimit((l) => l + PAGE)}
            style={{ marginTop: S.sm }}
          />
        ) : null}
      </Section>
    </Screen>
  );
}
