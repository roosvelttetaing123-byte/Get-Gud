/**
 * Evening ritual: rate the day (five faces, red to green), tick today's promises, one good
 * thing, an optional lesson. Promises save as you flip them, like the rows on Today.
 */
import { Annoyed, Frown, Laugh, Meh, Smile, type LucideIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { C, S, SYS, tint } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { actions, dayKey, useStore, type DayClose } from '@/lib/store';
import { Button, Field, Group, Pressy, Sheet, ToggleRow, Txt, isLight, useSpringValue } from '@/ui';

import { SheetCard } from './parts';
import { setPromise } from './Promises';
import { promiseColor, promiseIcon } from './visuals';

export const RATINGS: { label: string; icon: LucideIcon; color: string }[] = [
  { label: 'Rough', icon: Frown, color: SYS.red },
  { label: 'Meh', icon: Annoyed, color: SYS.orange },
  { label: 'Okay', icon: Meh, color: SYS.yellow },
  { label: 'Good', icon: Smile, color: SYS.mint },
  { label: 'Great', icon: Laugh, color: SYS.green },
];

export function CloseSheet({
  visible,
  onClose,
  close,
  intention,
}: {
  visible: boolean;
  onClose: () => void;
  close?: DayClose;
  /** This morning's intention, shown as a prompt. */
  intention?: string;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Close the day" detent="large">
      <CloseForm close={close} intention={intention} onDone={onClose} />
    </Sheet>
  );
}

function CloseForm({ close, intention, onDone }: { close?: DayClose; intention?: string; onDone: () => void }) {
  const [rating, setRating] = useState<number | undefined>(close?.rating);
  const [win, setWin] = useState(close?.win ?? '');
  const [lesson, setLesson] = useState(close?.lesson ?? '');

  const save = () => {
    actions.closeDay(dayKey(), { rating, win: win.trim() || undefined, lesson: lesson.trim() || undefined });
    haptic.success();
    onDone();
  };

  const r = rating ? RATINGS[rating - 1] : undefined;

  return (
    <>
      <SheetCard
        title="How did today go?"
        aside={
          r ? (
            <Txt v="subhead" weight="600" color={r.color}>
              {r.label}
            </Txt>
          ) : null
        }>
        {intention ? (
          <Txt v="footnote" color={C.label2} numberOfLines={2}>
            This morning: {intention}
          </Txt>
        ) : null}
        <View style={styles.faces}>
          {RATINGS.map((x, i) => (
            <Face key={x.label} {...x} selected={rating === i + 1} dim={rating !== undefined && rating !== i + 1} onPress={() => setRating(i + 1)} />
          ))}
        </View>
      </SheetCard>

      <DayPromises />

      <View style={{ gap: S.md }}>
        <Field label="One good thing" value={win} onChangeText={setWin} placeholder="Something you did well today" maxLength={120} />
        <Field label="One lesson (optional)" value={lesson} onChangeText={setLesson} placeholder="What you'd do differently" maxLength={120} />
      </View>

      <Button title="Close the day" onPress={save} color={C.indigo} />
    </>
  );
}

/** Today's promises as switch rows, so closing the day can close the Promises ring too. */
function DayPromises() {
  const { settings, days } = useStore();
  const key = dayKey();
  const promises = settings.promises;
  const kept = days[key]?.promises ?? {};
  if (!promises.length) return null;
  const n = promises.filter((p) => kept[p]).length;
  return (
    <Group header="Promises kept" footer={n === promises.length ? `All ${n} kept. Ring closed.` : `${n} of ${promises.length} kept`}>
      {promises.map((p, i) => (
        <ToggleRow
          key={p}
          icon={promiseIcon(p)}
          iconColor={promiseColor(i)}
          title={p}
          value={!!kept[p]}
          onChange={(v) => setPromise(key, promises, kept, p, v)}
        />
      ))}
    </Group>
  );
}

function Face({
  label,
  icon: I,
  color,
  selected,
  dim,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  color: string;
  selected: boolean;
  dim: boolean;
  onPress: () => void;
}) {
  const grow = useSpringValue(selected ? 1.1 : 1, 'bouncy');
  const fg = selected ? (isLight(color) ? '#000000' : '#FFFFFF') : color;
  return (
    <View style={styles.face}>
      <Pressy
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        scaleTo={0.9}
        onPress={() => {
          haptic.tap();
          onPress();
        }}
        style={{ opacity: dim ? 0.5 : 1, paddingVertical: 4 }}>
        <View style={[styles.faceDisc, { backgroundColor: selected ? color : tint(color, 0.18), transform: [{ scale: grow }] }]}>
          <I size={28} color={fg} strokeWidth={2.1} />
        </View>
      </Pressy>
    </View>
  );
}

const styles = StyleSheet.create({
  faces: { flexDirection: 'row', justifyContent: 'space-between', gap: S.xs },
  face: { flex: 1, alignItems: 'center' },
  faceDisc: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
});
