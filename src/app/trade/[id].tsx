import { router, useLocalSearchParams } from 'expo-router';
import { SearchX, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, S } from '@/constants/theme';
import { useNow } from '@/features/journal/bits';
import { rForResult, stepR } from '@/features/journal/format';
import { afterLook } from '@/features/journal/look';
import { LimitCard, NavBar, quickPick, Recap, RPicker, savedR } from '@/features/journal/ResultParts';
import { useConfirm } from '@/features/settings/confirm';
import { AFTER_EMOTIONS, tradingToday } from '@/lib/derive';
import { haptic } from '@/lib/haptics';
import { actions, getState, isToday, useStore, type Result, type Trade } from '@/lib/store';
import { Chip, Empty, Field, Group, ListRow, Screen, Section, ToggleRow } from '@/ui';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/journal');
}

export default function TradeResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trades } = useStore();
  // Keeps the sheet's content in place while it animates away after a delete.
  const [removed, setRemoved] = useState<Trade | null>(null);
  const trade = trades.find((t) => t.id === id) ?? removed;

  if (!trade) {
    return (
      <Screen modal>
        <Empty
          icon={SearchX}
          color={C.gray}
          title="Trade not found"
          message="It may have been deleted."
          action={{ label: 'Done', onPress: close }}
        />
      </Screen>
    );
  }

  return (
    <ResultForm
      key={trade.id}
      trade={trade}
      onDelete={() => {
        setRemoved(trade);
        actions.deleteTrade(trade.id);
        close();
      }}
    />
  );
}

/** Screen modal with a fixed nav bar and its own scroll view, so Save stays in reach. */
function Sheet({ bar, children }: { bar: React.ReactNode; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const below = insets.bottom + S.xxxl; // the padding Screen leaves under a non-scrolling column
  return (
    <Screen modal scroll={false} gap={S.sm} contentStyle={{ flex: 1 }}>
      {bar}
      <ScrollView
        style={{ flex: 1, marginBottom: -below, marginHorizontal: -S.margin }}
        contentContainerStyle={{ paddingHorizontal: S.margin, paddingTop: S.sm, paddingBottom: below + S.lg, gap: S.xl }}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        {children}
      </ScrollView>
    </Screen>
  );
}

function ResultForm({ trade, onDelete }: { trade: Trade; onDelete: () => void }) {
  const editing = !!trade.result;
  const now = useNow();
  const [result, setResult] = useState<Result | undefined>(trade.result);
  const [r, setR] = useState<number>(() =>
    trade.result ? (trade.r ?? rForResult(0, trade.result)) : 0,
  );
  const [followed, setFollowed] = useState<boolean>(trade.followedRules ?? !trade.overridden);
  const [after, setAfter] = useState<string[]>(trade.emotionsAfter ?? []);
  const [note, setNote] = useState(trade.note ?? '');
  const [limit, setLimit] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const pickResult = (v: Result) => {
    setResult(v);
    setR((prev) => rForResult(prev, v));
  };

  const step = (dir: 1 | -1) => {
    const next = stepR(r, dir, result);
    setR(next.r);
    setResult(next.result);
  };

  const quick = (q: number) => {
    const next = quickPick(q);
    setR(next.r);
    setResult(next.result);
  };

  const toggleAfter = (e: string) =>
    setAfter((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));

  const save = () => {
    if (!result) return;
    const wasLoss = trade.result === 'loss';
    actions.closeTrade(trade.id, {
      result,
      r: savedR(r, result),
      followedRules: followed,
      emotionsAfter: after,
      note: note.trim() || undefined,
    });

    // A new loss on today's trade that ends the day gets a stop instead of a quiet close.
    if (result === 'loss' && !wasLoss && isToday(trade.ts)) {
      const hit = tradingToday(getState()).limitHit;
      if (hit) {
        haptic.warning();
        setLimit(hit);
        return;
      }
    }
    haptic.success();
    close();
  };

  const confirmDelete = () =>
    confirm({
      title: 'Delete this trade?',
      message: 'It comes out of your journal and your stats. This can’t be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      icon: Trash2,
      onConfirm: onDelete,
    });

  if (limit) {
    const reason = limit.replace(/\s*Done for today\.?$/, '') || limit;
    return (
      <Sheet bar={<NavBar title="Result saved" right={{ label: 'Done', onPress: close }} />}>
        <LimitCard reason={reason} onClose={close} />
      </Sheet>
    );
  }

  return (
    <Sheet
      bar={
        <NavBar
          title={editing ? 'Edit result' : 'Log result'}
          left={{ label: 'Cancel', onPress: close }}
          right={{ label: 'Save', onPress: save, disabled: !result }}
        />
      }>
      <Recap trade={trade} now={now} />

      <Section title="Result">
        <RPicker r={r} result={result} onResult={pickResult} onStep={step} onQuick={quick} />
      </Section>

      <Group>
        <ToggleRow
          icon={followed ? ShieldCheck : ShieldAlert}
          iconColor={followed ? C.green : C.orange}
          title="Followed your rules?"
          subtitle={followed ? 'Every rule kept' : 'Logged, not judged'}
          value={followed}
          onChange={setFollowed}
        />
      </Group>

      <Section title="How do you feel now?">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
          {AFTER_EMOTIONS.map((e) => {
            const look = afterLook(e);
            return (
              <Chip
                key={e}
                label={e}
                icon={look.icon}
                color={look.color}
                selected={after.includes(e)}
                onPress={() => toggleAfter(e)}
              />
            );
          })}
        </View>
      </Section>

      <Field
        label="Note"
        multiline
        value={note}
        onChangeText={setNote}
        placeholder="What did you learn?"
        accessibilityLabel="Note"
      />

      <Group>
        <ListRow icon={Trash2} iconColor={C.red} title="Delete trade" destructive onPress={confirmDelete} />
      </Group>
      {dialog}
    </Sheet>
  );
}
