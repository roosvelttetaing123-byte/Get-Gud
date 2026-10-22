import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { View } from 'react-native';

import { C, S, T } from '@/constants/theme';
import { fmtR, journalStats } from '@/lib/derive';
import { useStore } from '@/lib/store';
import { Body, Button, Display, Divider, Row, Screen, Section, Small, Sub, Surface } from '@/ui';
import { count, dayLabel, groupByDay, pct, rColor } from '@/features/journal/format';
import {
  CostHeadline,
  DisciplineLines,
  EmotionCostRow,
  OpenTrade,
  RulesComparison,
  TradeRow,
} from '@/features/journal/parts';

export default function JournalScreen() {
  const state = useStore();
  const { trades } = state;

  const stats = useMemo(() => journalStats(state), [state]);
  const open = useMemo(() => trades.filter((t) => t.taken && !t.result).sort((a, b) => b.ts - a.ts), [trades]);
  const days = useMemo(() => groupByDay(trades), [trades]);

  const openTrade = (id: string) => router.push(`/trade/${id}`);

  const hasTaken = trades.some((t) => t.taken);
  const title = stats.closed ? fmtR(stats.netR) : hasTaken ? 'No results yet' : 'No trades yet';
  const titleColor = stats.closed ? rColor(stats.netR) : C.mist;

  const emotionBuckets = stats.byEmotion.filter((b) => b.n >= 1);
  const maxAbs = Math.max(0, ...emotionBuckets.map((b) => Math.abs(b.avgR)));
  const worst = emotionBuckets[0];
  const showCost = stats.closed > 0 || stats.skipped > 0;
  const showRules = stats.followed.n > 0 || stats.broke.n > 0;

  return (
    <Screen>
      {/* Hero: net R carries its own meaning colour, so it's built here rather than with <Hero>. */}
      <View accessibilityRole="header">
        <Sub>Your trades</Sub>
        <Display size={T.hero} color={titleColor} style={{ marginTop: 2 }}>
          {title}
        </Display>
        {stats.closed ? (
          <Sub style={{ marginTop: S.xs }}>
            {`Net across ${count(stats.closed, 'closed trade')}, ${pct(stats.winRate)} win rate`}
          </Sub>
        ) : null}
      </View>

      {trades.length === 0 ? (
        <Surface>
          <Body>Every trade starts at the gate.</Body>
          <Sub>Name what you feel, tick your rules, then decide. The result comes back here.</Sub>
          <Button label="Check before you trade" onPress={() => router.push('/gate')} style={{ marginTop: S.xs }} />
        </Surface>
      ) : null}

      {open.length ? (
        <Section title="Open trades" aside={open.length > 1 ? `${open.length} waiting` : undefined}>
          <Surface tone="tangerine" style={{ gap: S.lg }}>
            {open.map((t, i) => (
              <React.Fragment key={t.id}>
                {i > 0 ? <Divider /> : null}
                <OpenTrade trade={t} onLog={() => openTrade(t.id)} />
              </React.Fragment>
            ))}
          </Surface>
        </Section>
      ) : null}

      {showCost ? (
        <Section title="What your emotions cost" aside={stats.closed ? count(stats.closed, 'closed trade') : undefined}>
          {stats.closed < 3 ? <Small>Patterns get clearer after 10 trades.</Small> : null}
          {stats.closed >= 3 && worst && worst.avgR < 0 ? <CostHeadline worst={worst} /> : null}
          {emotionBuckets.length ? (
            <Surface style={{ gap: S.lg }}>
              {emotionBuckets.map((b, i) => (
                <React.Fragment key={b.label}>
                  {i > 0 ? <Divider /> : null}
                  <EmotionCostRow bucket={b} max={maxAbs} />
                </React.Fragment>
              ))}
            </Surface>
          ) : null}
          {showRules ? <RulesComparison followed={stats.followed} broke={stats.broke} /> : null}
          <DisciplineLines overrides={stats.overrides} skipped={stats.skipped} />
        </Section>
      ) : null}

      {days.length ? (
        <Section title="History" aside={count(trades.length, 'entry', 'entries')}>
          <View style={{ gap: S.xl }}>
            {days.map((d) => (
              <View key={d.key} style={{ gap: S.sm }}>
                <Row style={{ justifyContent: 'space-between', paddingHorizontal: S.xs }}>
                  <Sub color={C.mist} style={{ fontWeight: '600' }}>
                    {dayLabel(d.ts)}
                  </Sub>
                  {d.closed ? (
                    <Small color={rColor(d.netR)} style={{ fontWeight: '600' }}>
                      {fmtR(d.netR)}
                    </Small>
                  ) : null}
                </Row>
                <Surface>
                  {d.trades.map((t, i) => (
                    <React.Fragment key={t.id}>
                      {i > 0 ? <Divider /> : null}
                      <TradeRow trade={t} onPress={() => openTrade(t.id)} />
                    </React.Fragment>
                  ))}
                </Surface>
              </View>
            ))}
          </View>
        </Section>
      ) : null}
    </Screen>
  );
}
