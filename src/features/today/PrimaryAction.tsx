/**
 * Today's one primary action, driven by stageOf(): check in, the gate during the day, close the
 * day, or a calm done state. Trading lives here too, folded into one line under the action
 * ("0 of 3 trades · Window 14:31–18:51 · Walked away 1"), so there's no separate trading card.
 * When a limit is hit, the gate button turns into a calm "Done trading for today".
 */
import { router } from 'expo-router';
import { ChevronRight, Flame, Moon, MoonStar, NotebookPen, OctagonX, ShieldCheck, Sun } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { C, FONT, S, SYS, VALENCE, tint } from '@/constants/theme';
import type { TradingToday } from '@/lib/derive';
import type { Stage } from '@/lib/engage';
import { haptic } from '@/lib/haptics';
import { clockLabel, type Schedule } from '@/lib/sleep';
import { tradeWindows, type SleepEdge } from '@/lib/sleepEdge';
import type { CheckIn, DayClose } from '@/lib/store';
import { useNow } from '@/lib/useNow';
import { Badge, Button, Card, Divider, IconWell, ListRow, Group, Pressy, Txt } from '@/ui';

import { RATINGS } from './CloseSheet';
import { JellyShape } from './JellyShape';
import { moodImage } from './visuals';

// Non-breaking spaces keep "6.5 h sleep" together when the line wraps on narrow phones.
const fmtHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)} h sleep`;

export interface TradeInfo {
  trading: TradingToday;
  maxTrades: number;
  maxLossStreak: number;
  sched: Schedule;
  edge: SleepEdge;
}

export function PrimaryAction({
  stage,
  checkin,
  close,
  streak,
  trade,
  onCheckIn,
  onCloseDay,
}: {
  stage: Stage;
  checkin?: CheckIn;
  close?: DayClose;
  streak: number;
  trade: TradeInfo;
  onCheckIn: () => void;
  onCloseDay: () => void;
}) {
  if (stage === 'checkin') {
    return (
      <View style={styles.cta}>
        <Button title="Check in" icon={Sun} onPress={onCheckIn} />
        <Txt v="footnote" color={C.label2} align="center">
          30 seconds. Sets up your day.
        </Txt>
        <LogResult trade={trade} />
      </View>
    );
  }

  if (stage === 'close') {
    return (
      <View style={styles.cta}>
        <Button title="Close the day" icon={Moon} color={C.indigo} onPress={onCloseDay} />
        <Txt v="footnote" color={C.label2} align="center">
          Rate the day and keep one good thing.
        </Txt>
        <EveningGate trade={trade} />
        <LogResult trade={trade} />
      </View>
    );
  }

  if (stage === 'done') {
    return <DoneCard close={close} streak={streak} onEdit={onCloseDay} />;
  }

  const limit = trade.trading.limitHit;
  return (
    <View style={{ gap: S.md }}>
      {checkin ? <IntentionCard checkin={checkin} onEdit={onCheckIn} /> : null}
      <View style={styles.cta}>
        {limit ? (
          <View style={styles.limit} accessible accessibilityRole="text" accessibilityLabel={`Done trading for today. ${limit}`}>
            <OctagonX size={20} color={C.stop} strokeWidth={2.4} />
            <Text style={styles.limitText}>Done trading for today</Text>
          </View>
        ) : (
          <Button title="Check before you trade" icon={ShieldCheck} onPress={() => router.navigate('/gate')} />
        )}
        <TradeLine trade={trade} />
        <LogResult trade={trade} />
      </View>
    </View>
  );
}

type Part = { text: string; color?: string };

/** The trading state in a few words: trades used, the window, walk-aways, and how close the limits are. */
function tradeParts(trade: TradeInfo, now: number, withWindow = true): Part[] {
  const { trading, maxTrades, maxLossStreak, sched, edge } = trade;
  const parts: Part[] = [];
  if (trading.limitHit) {
    parts.push({ text: trading.limitHit.replace(/\s*Done for today\.?$/, '').replace(/\.$/, '') });
  } else {
    parts.push({ text: `${trading.taken.length} of ${maxTrades} trades` });
    if (withWindow) {
      const w = tradeWindows(sched, edge, now).windows[0];
      if (w) parts.push({ text: w.open ? `Window open until ${clockLabel(w.end)}` : `Window ${clockLabel(w.start)}–${clockLabel(w.end)}` });
    }
    if (maxLossStreak > 1 && trading.lossStreak === maxLossStreak - 1) parts.push({ text: 'One loss from your limit', color: C.wait });
    else if (trading.taken.length === maxTrades - 1) parts.push({ text: 'Last trade today', color: C.wait });
  }
  if (trading.skipped > 0) parts.push({ text: `Walked away ${trading.skipped}`, color: SYS.green });
  return parts;
}

function Line({ parts }: { parts: Part[] }) {
  return (
    <Text style={styles.line}>
      {parts.map((p, i) => (
        <Text key={p.text} style={p.color ? { color: p.color } : null}>
          {i > 0 ? ' · ' : ''}
          {p.text}
        </Text>
      ))}
    </Text>
  );
}

/** Minute clock in a small leaf, so "Window open" flips on time without re-rendering Today. */
function TradeLine({ trade }: { trade: TradeInfo }) {
  const [now] = useNow(60_000);
  return <Line parts={tradeParts(trade, now)} />;
}

/** Evening: the gate stays one tap away while a trade window is still open today. */
function EveningGate({ trade }: { trade: TradeInfo }) {
  const [now] = useNow(60_000);
  if (trade.trading.limitHit) return null;
  const w = tradeWindows(trade.sched, trade.edge, now).windows[0];
  if (!w) return null;
  // Short enough for one line: trades used and how long the window stays open.
  const used = `${trade.trading.taken.length} of ${trade.maxTrades} trades`;
  const until = w.open ? `Window until ${clockLabel(w.end)}` : `Window ${clockLabel(w.start)}–${clockLabel(w.end)}`;
  return (
    <Group style={{ marginTop: S.xs }}>
      <ListRow
        icon={ShieldCheck}
        iconColor={C.tint}
        title="Check before you trade"
        subtitle={`${used} · ${until}`}
        chevron
        onPress={() => router.navigate('/gate')}
      />
    </Group>
  );
}

function LogResult({ trade }: { trade: TradeInfo }) {
  const open = trade.trading.open;
  if (!open.length) return null;
  return (
    <Button
      title={open.length === 1 ? 'Log result' : `Log ${open.length} results`}
      icon={NotebookPen}
      kind="tinted"
      size="small"
      color={C.blue}
      full={false}
      style={{ alignSelf: 'center' }}
      onPress={() => router.push(`/trade/${open[0].id}`)}
    />
  );
}

/** The morning's check-in, quietly: a mood shape you can poke, the intention, and a way back in. */
function IntentionCard({ checkin, onEdit }: { checkin: CheckIn; onEdit: () => void }) {
  const v = checkin.valence;
  const mood = v ? VALENCE[v - 1] : undefined;
  const meta = [mood?.label, checkin.sleepHours !== undefined ? fmtHours(checkin.sleepHours) : undefined].filter(Boolean) as string[];
  const intention = checkin.intention?.trim();

  return (
    <Card padding={S.md} style={styles.intention}>
      {v ? <JellyShape source={moodImage(v)} size={60} kick={v} label={`Your mood shape: ${mood?.label ?? ''}`} /> : null}
      {/* Pressy styles its inner view, so the flex lives on a wrapper. */}
      <View style={{ flex: 1 }}>
      <Pressy
        accessibilityRole="button"
        accessibilityLabel={`${intention ? `Today's intention: ${intention}` : 'Checked in'}. Edit check-in`}
        scaleTo={0.98}
        onPress={() => {
          haptic.tap();
          onEdit();
        }}
        style={styles.intentionText}>
        <View style={{ flex: 1, gap: 1 }}>
          <Txt v="footnote" color={C.label2} weight="600">
            {intention ? 'Today’s intention' : 'Checked in'}
          </Txt>
          <Txt v="headline" numberOfLines={2}>
            {intention || (mood ? `Feeling ${mood.label.toLowerCase()}` : 'Ready for the day')}
          </Txt>
          {meta.length ? (
            <Txt v="footnote" color={C.label2} numberOfLines={1}>
              {meta.join(' · ')}
            </Txt>
          ) : null}
        </View>
        <ChevronRight size={18} color={C.label3} strokeWidth={2.6} />
      </Pressy>
      </View>
    </Card>
  );
}

/** Evening, after closing: calm, with tomorrow's streak to look forward to. */
function DoneCard({ close, streak, onEdit }: { close?: DayClose; streak: number; onEdit: () => void }) {
  const r = close?.rating ? RATINGS[close.rating - 1] : undefined;
  const note = close?.win ? close.win : r ? `You called today ${r.label.toLowerCase()}.` : undefined;
  return (
    <Card padding={S.lg} style={{ gap: S.md }}>
      <View style={styles.introRow}>
        <IconWell icon={MoonStar} color={C.indigo} size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="headline">Day closed. See you tomorrow.</Txt>
          {note ? (
            <Txt v="subhead" color={C.label2} numberOfLines={2}>
              {note}
            </Txt>
          ) : null}
        </View>
      </View>
      <Divider />
      <View style={styles.metaRow}>
        <View style={{ flex: 1 }}>
          <Badge icon={Flame} color={SYS.orange} label={`Day ${streak + 1} tomorrow`} />
        </View>
        <Button title="Edit" kind="gray" size="small" full={false} onPress={onEdit} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cta: { gap: 10 },
  line: { fontFamily: FONT.system, fontSize: 13, lineHeight: 18, color: C.label2, textAlign: 'center', fontVariant: ['tabular-nums'] },
  limit: {
    height: 52,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: tint(C.stop, 0.16),
  },
  limitText: { fontFamily: FONT.system, fontSize: 17, fontWeight: '600', color: C.stop },
  intention: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingLeft: S.md },
  intentionText: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
});
