/**
 * Today's one primary action, driven by stageOf(): check in, the day itself, close the day, done.
 */
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Flame, Moon, MoonStar, ShieldCheck, Sun } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { C, S, SYS, VALENCE } from '@/constants/theme';
import type { Stage } from '@/lib/engage';
import type { CheckIn, DayClose } from '@/lib/store';
import { Badge, Button, Card, Divider, IconWell, Txt } from '@/ui';

import { RATINGS } from './CloseSheet';
import { moodImage } from './visuals';

// Non-breaking spaces keep "6.5 h sleep" together when the line wraps on narrow phones.
const fmtHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)}\u00a0h\u00a0sleep`;

export function PrimaryAction({
  stage,
  checkin,
  close,
  streak,
  limitHit,
  onCheckIn,
  onCloseDay,
}: {
  stage: Stage;
  checkin?: CheckIn;
  close?: DayClose;
  streak: number;
  /** Trading limit reached: the gate would only say stop, so don't offer it. */
  limitHit?: boolean;
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
      </View>
    );
  }

  if (stage === 'done') {
    return <DoneCard close={close} streak={streak} onEdit={onCloseDay} />;
  }

  return (
    <View style={{ gap: S.md }}>
      {checkin ? <IntentionCard checkin={checkin} onEdit={onCheckIn} /> : null}
      {limitHit ? null : <Button title="Check before you trade" icon={ShieldCheck} onPress={() => router.push('/gate')} />}
    </View>
  );
}

/** The morning's check-in, quietly: mood shape, intention, and a way back in. */
function IntentionCard({ checkin, onEdit }: { checkin: CheckIn; onEdit: () => void }) {
  const v = checkin.valence;
  const mood = v ? VALENCE[v - 1] : undefined;
  const meta = [mood?.label, checkin.sleepHours !== undefined ? fmtHours(checkin.sleepHours) : undefined].filter(
    Boolean,
  ) as string[];
  const intention = checkin.intention?.trim();

  return (
    <Card padding={S.lg} style={{ gap: S.md }}>
      <View style={styles.introRow}>
        {v ? <Image source={moodImage(v)} style={styles.moodThumb} contentFit="contain" /> : null}
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="footnote" color={C.label2} weight="600">
            {intention ? "Today's intention" : 'Checked in'}
          </Txt>
          <Txt v="body" weight="600" numberOfLines={3}>
            {intention || (mood ? `Feeling ${mood.label.toLowerCase()}` : 'Ready for the day')}
          </Txt>
        </View>
      </View>
      <Divider />
      <View style={styles.metaRow}>
        <Txt v="footnote" color={C.label2} numberOfLines={2} style={{ flex: 1 }}>
          {meta.join(' · ')}
        </Txt>
        <Button title="Edit check-in" kind="gray" size="small" full={false} onPress={onEdit} />
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
  introRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  moodThumb: { width: 52, height: 52 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
});
