import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';

import { C, S, T, toneColor, type Tone } from '@/constants/theme';
import { AFTER_EMOTIONS, fmtR, timeAgo, tradingToday } from '@/lib/derive';
import { haptic } from '@/lib/haptics';
import { actions, getState, isToday, useStore, type Result, type Trade } from '@/lib/store';
import { Body, Button, Chip, Display, Divider, Field, Row, Screen, Section, Segmented, Small, Sub, Surface } from '@/ui';
import { clock, parseR, rColor, signR, VERDICT } from '@/features/journal/format';
import { EmotionTags } from '@/features/journal/parts';
import { SheetScreen } from '@/features/journal/SheetScreen';

const RESULTS: { value: Result; label: string; tone: Tone }[] = [
  { value: 'win', label: 'Win', tone: 'jade' },
  { value: 'loss', label: 'Loss', tone: 'coral' },
  { value: 'be', label: 'Break-even', tone: 'neutral' },
];

type YesNo = 'yes' | 'no';
const RULES: { value: YesNo; label: string; tone: Tone }[] = [
  { value: 'yes', label: 'Yes', tone: 'jade' },
  { value: 'no', label: 'No', tone: 'coral' },
];

const QUICK_R = [-1, 1, 2, 3];
const quickLabel = (v: number) => `${v > 0 ? '+' : ''}${v}`;

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
        <Display size={T.hero}>Trade not found</Display>
        <Body color={C.haze}>It may have been deleted.</Body>
        <Button label="Done" onPress={close} />
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

function ResultForm({ trade, onDelete }: { trade: Trade; onDelete: () => void }) {
  const editing = !!trade.result;
  const [result, setResult] = useState<Result | undefined>(trade.result);
  const [rText, setRText] = useState(trade.r !== undefined ? String(trade.r) : '');
  const [followed, setFollowed] = useState<YesNo | undefined>(
    trade.followedRules === undefined ? undefined : trade.followedRules ? 'yes' : 'no',
  );
  const [after, setAfter] = useState<string[]>(trade.emotionsAfter ?? []);
  const [note, setNote] = useState(trade.note ?? '');
  const [limit, setLimit] = useState<string | null>(null);

  const parsed = parseR(rText);
  const invalid = rText.trim() !== '' && parsed === undefined;
  const preview = parsed === undefined ? undefined : result ? signR(parsed, result) : parsed;
  const flipped = parsed !== undefined && preview !== undefined && preview !== parsed;
  const canSave = !!result && !invalid;

  // Quick chips are signed, so they also set the matching result.
  const pickR = (v: number) => {
    setRText(quickLabel(v));
    setResult(v < 0 ? 'loss' : 'win');
  };

  const toggleAfter = (e: string) =>
    setAfter((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));

  const save = () => {
    if (!result || invalid) return;
    const wasLoss = trade.result === 'loss';
    actions.updateTrade(trade.id, {
      result,
      r: parsed !== undefined ? signR(parsed, result) : result === 'be' ? 0 : undefined,
      followedRules: followed === undefined ? undefined : followed === 'yes',
      emotionsAfter: after,
      note: note.trim() || undefined,
      // Editing an old result keeps its close time so loss streaks and cool-downs stay true.
      closedTs: trade.closedTs ?? Date.now(),
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
    Alert.alert(
      'Delete this trade?',
      'It comes out of your journal and your stats. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete trade', style: 'destructive', onPress: onDelete },
      ],
      { userInterfaceStyle: 'dark' },
    );

  if (limit) {
    const reason = limit.replace(/\s*Done for today\.?$/, '') || limit;
    return (
      <SheetScreen>
        <Sub>Result saved</Sub>
        <Surface tone="coral" style={{ gap: S.lg, paddingVertical: S.xl }}>
          <Display size={T.hero} color={C.coral}>
            Done for today.
          </Display>
          <Body>{reason}</Body>
          <Sub color={C.mist}>Stopping now is the trade that protects your account. The setups come back tomorrow.</Sub>
          <Button label="Close the charts" onPress={close} style={{ marginTop: S.sm }} />
        </Surface>
      </SheetScreen>
    );
  }

  const verdict = VERDICT[trade.verdict];

  return (
    <SheetScreen>
      <Row style={{ justifyContent: 'space-between' }} gap={S.md}>
        <Display size={T.hero} style={{ flex: 1 }} numberOfLines={1}>
          {editing ? 'Edit result' : 'Log result'}
        </Display>
        <Button label="Cancel" kind="ghost" onPress={close} />
      </Row>

      <Surface>
        <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Display size={T.stat}>{clock(trade.ts)}</Display>
          <Sub>{timeAgo(trade.ts)}</Sub>
        </Row>
        <Divider />
        <RecapLine label="Gate said">
          <Display size={T.h2} color={toneColor(verdict.tone)}>
            {verdict.word}
          </Display>
          {trade.overridden ? <Small color={C.coral}>You took it through a stop.</Small> : null}
        </RecapLine>
        <RecapLine label="You felt">
          <View style={{ paddingTop: 2 }}>
            <EmotionTags emotions={trade.emotions} />
          </View>
        </RecapLine>
        <RecapLine label="Plan">
          {trade.plan ? <Body>{trade.plan}</Body> : <Sub color={C.faint}>No plan written</Sub>}
        </RecapLine>
      </Surface>

      <Section title="Result">
        <Segmented options={RESULTS} value={result} onChange={setResult} />
      </Section>

      <Section
        title="R multiple"
        aside={
          preview !== undefined ? (
            <Display size={T.h2} color={rColor(preview)}>
              {fmtR(preview)}
            </Display>
          ) : undefined
        }>
        <Field
          value={rText}
          onChangeText={setRText}
          placeholder="e.g. 2 or -1"
          keyboardType="numbers-and-punctuation"
          returnKeyType="done"
          accessibilityLabel="R multiple"
        />
        <Row gap={S.sm} style={{ flexWrap: 'wrap' }}>
          {QUICK_R.map((v) => (
            <Chip
              key={v}
              label={quickLabel(v)}
              tone={v < 0 ? 'coral' : 'jade'}
              selected={preview === v}
              onPress={() => pickR(v)}
            />
          ))}
        </Row>
        {invalid ? (
          <Small color={C.tangerine}>Use a number, like 2 or -1.</Small>
        ) : flipped ? (
          <Small>{result === 'loss' ? 'Losses are saved as negative R.' : 'Wins are saved as positive R.'}</Small>
        ) : null}
      </Section>

      <Section title="Did you follow your rules?">
        <Segmented options={RULES} value={followed} onChange={setFollowed} />
        {followed === 'no' ? <Small>Logged, not judged. This is what the journal is for.</Small> : null}
      </Section>

      <Section title="How do you feel now?">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
          {AFTER_EMOTIONS.map((e) => (
            <Chip key={e} label={e} selected={after.includes(e)} onPress={() => toggleAfter(e)} />
          ))}
        </View>
      </Section>

      <Section title="What did you learn?">
        <Field
          multiline
          value={note}
          onChangeText={setNote}
          placeholder="One thing to keep or change next time"
          accessibilityLabel="What did you learn?"
        />
      </Section>

      <View style={{ gap: S.md }}>
        <Button label="Save result" onPress={save} disabled={!canSave} />
        {!result ? (
          <Small color={C.faint} style={{ textAlign: 'center' }}>
            Choose win, loss or break-even to save.
          </Small>
        ) : null}
      </View>

      <Button label="Delete trade" kind="danger" onPress={confirmDelete} style={{ marginTop: S.lg }} />
    </SheetScreen>
  );
}

function RecapLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Row gap={S.md} style={{ alignItems: 'flex-start' }}>
      <Sub style={{ width: 84 }}>{label}</Sub>
      <View style={{ flex: 1, gap: S.xs }}>{children}</View>
    </Row>
  );
}
