import { router } from 'expo-router';
import { ChartSpline, Hourglass, NotebookPen, Plus, ShieldCheck } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { View } from 'react-native';

import { C, S } from '@/constants/theme';
import { bestR, count, equityCurve, groupByDay, rColor, sinceLabel } from '@/features/journal/format';
import {
  CostInsight,
  DayCard,
  DisciplineLines,
  EmotionCostCard,
  HeroBody,
  HeroFooter,
  HintRow,
  OpenTradeCard,
  RulesComparison,
  StepRow,
} from '@/features/journal/parts';
import { fmtR, journalStats } from '@/lib/derive';
import { useStore } from '@/lib/store';
import { ArtCard, Button, Card, Display, Divider, Hero, IconBadge, IconButton, Screen, Section, Sub } from '@/ui/legacy';

const toGate = () => router.push('/gate');
const openTrade = (id: string) => router.push(`/trade/${id}`);

export default function JournalScreen() {
  const state = useStore();
  const { trades } = state;

  const stats = useMemo(() => journalStats(state), [state]);
  const open = useMemo(() => trades.filter((t) => t.taken && !t.result).sort((a, b) => b.ts - a.ts), [trades]);
  const days = useMemo(() => groupByDay(trades), [trades]);
  const curve = useMemo(() => equityCurve(trades), [trades]);
  const best = useMemo(() => bestR(trades), [trades]);
  const first = useMemo(() => (trades.length ? Math.min(...trades.map((t) => t.ts)) : undefined), [trades]);

  const hasTaken = trades.some((t) => t.taken);
  const title = stats.closed ? fmtR(stats.netR) : hasTaken ? 'No results yet' : 'No trades taken';
  const titleColor = stats.closed ? rColor(stats.netR) : C.mist;
  const line = stats.closed
    ? `Net across ${count(stats.closed, 'closed trade')}`
    : hasTaken
      ? 'Log a result and your curve starts here.'
      : 'Walking away counts. It shows up below.';

  const emotionBuckets = stats.byEmotion.filter((b) => b.n >= 1);
  const worst = emotionBuckets[0];
  const showCost = stats.closed > 0;
  const showRules = stats.followed.n > 0 || stats.broke.n > 0;
  const showDiscipline = stats.overrides.n > 0 || stats.skipped > 0;

  return (
    <Screen>
      <Hero
        context="Your trades"
        title="Journal"
        right={<IconButton icon={Plus} label="Check before you trade" onPress={toGate} />}
      />

      {trades.length === 0 ? (
        <EmptyJournal />
      ) : (
        <ArtCard
          art="gold"
          footer={<HeroFooter winRate={stats.winRate} avgR={stats.avgR} skipped={stats.skipped} closed={stats.closed} />}>
          <HeroBody
            since={first !== undefined ? sinceLabel(first) : undefined}
            best={best}
            title={title}
            titleColor={titleColor}
            line={line}
            curve={curve}
          />
        </ArtCard>
      )}

      {open.length ? (
        <Section title="Open trades" aside={open.length > 1 ? `${open.length} waiting` : 'Waiting for a result'}>
          {open.map((t) => (
            <OpenTradeCard key={t.id} trade={t} onLog={() => openTrade(t.id)} />
          ))}
        </Section>
      ) : null}

      {showCost ? (
        <Section title="What your emotions cost" aside={count(stats.closed, 'closed trade')}>
          {stats.closed < 3 ? <HintRow icon={Hourglass}>Patterns get clearer after 10 trades.</HintRow> : null}
          {stats.closed >= 3 && worst && worst.avgR < 0 ? <CostInsight worst={worst} /> : null}
          {emotionBuckets.length ? <EmotionCostCard buckets={emotionBuckets} /> : null}
        </Section>
      ) : null}

      {showRules || showDiscipline ? (
        <Section title="Followed rules vs broke rules">
          {showRules ? <RulesComparison followed={stats.followed} broke={stats.broke} /> : null}
          <DisciplineLines overrides={stats.overrides} skipped={stats.skipped} />
        </Section>
      ) : null}

      {days.length ? (
        <Section title="History" aside={count(trades.length, 'entry', 'entries')}>
          {days.map((d) => (
            <DayCard key={d.key} group={d} onOpen={openTrade} />
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}

function EmptyJournal() {
  return (
    <>
      <ArtCard art="gold">
        <IconBadge icon={ShieldCheck} color={C.mist} bg="rgba(242,245,251,0.16)" size={52} />
        <View style={{ gap: S.sm }}>
          <Display size={26}>{'Every trade starts\nat the gate.'}</Display>
          <Sub color="rgba(242,245,251,0.8)">
            Name what you feel, tick your rules, then decide. The result comes back here.
          </Sub>
        </View>
        <Button kind="accent" icon={ShieldCheck} label="Check before you trade" onPress={toGate} style={{ marginTop: S.xs }} />
      </ArtCard>

      <Section title="How your journal fills">
        <Card style={{ gap: S.md }}>
          <StepRow n={1} icon={ShieldCheck} title="Check in at the gate" detail="Feelings and rules, before every entry" />
          <Divider />
          <StepRow n={2} icon={NotebookPen} title="Log the result" detail="Win, loss or break-even, in R" />
          <Divider />
          <StepRow n={3} icon={ChartSpline} title="See what each feeling costs" detail="Your win rate and R, by emotion" />
        </Card>
      </Section>
    </>
  );
}
