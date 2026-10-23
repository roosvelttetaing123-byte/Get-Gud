import { router, useLocalSearchParams } from 'expo-router';
import {
  Calculator,
  Check,
  Minus,
  NotebookPen,
  OctagonX,
  SearchX,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { View } from 'react-native';

import { C, S, T, type PastelName } from '@/constants/theme';
import { alpha, parseR, rColor, signR } from '@/features/journal/format';
import { HintRow, ToneBadge, TradeRecap } from '@/features/journal/parts';
import { SheetScreen } from '@/features/journal/SheetScreen';
import { useConfirm } from '@/features/settings/confirm';
import { AFTER_EMOTIONS, fmtR, tradingToday } from '@/lib/derive';
import { haptic } from '@/lib/haptics';
import { actions, getState, isToday, useStore, type Result, type Trade } from '@/lib/store';
import {
  Body,
  Button,
  Card,
  Chip,
  Display,
  Field,
  Grid,
  Hero,
  IconBadge,
  Pill,
  Row,
  Screen,
  Section,
  Small,
  Sub,
  Tile,
} from '@/ui';

const RESULTS: { value: Result; label: string; hint: string; pastel: PastelName; icon: LucideIcon }[] = [
  { value: 'win', label: 'Win', hint: 'Above 0R', pastel: 'mint', icon: TrendingUp },
  { value: 'loss', label: 'Loss', hint: 'Below 0R', pastel: 'rose', icon: TrendingDown },
  // Two words so the narrow tile wraps between them, not at a hyphen.
  { value: 'be', label: 'Break even', hint: 'Around 0R', pastel: 'sky', icon: Minus },
];

type YesNo = 'yes' | 'no';
const RULES: { value: YesNo; label: string; hint: string; pastel: PastelName; icon: LucideIcon }[] = [
  { value: 'yes', label: 'Yes', hint: 'Every rule kept', pastel: 'mint', icon: ShieldCheck },
  { value: 'no', label: 'No', hint: 'Broke at least one', pastel: 'rose', icon: ShieldAlert },
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
        <IconBadge icon={SearchX} size={56} color={C.haze} />
        <View style={{ gap: S.sm }}>
          <Display size={T.hero}>Trade not found</Display>
          <Body color={C.haze}>It may have been deleted.</Body>
        </View>
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
  // System alert on iOS; an in-app dialog on web, where react-native-web's Alert does nothing.
  const { confirm, dialog } = useConfirm();

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
    actions.closeTrade(trade.id, {
      result,
      r: parsed !== undefined ? signR(parsed, result) : result === 'be' ? 0 : undefined,
      followedRules: followed === undefined ? undefined : followed === 'yes',
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
      confirmLabel: 'Delete trade',
      cancelLabel: 'Keep trade',
      icon: Trash2,
      onConfirm: onDelete,
    });

  if (limit) {
    const reason = limit.replace(/\s*Done for today\.?$/, '') || limit;
    return (
      <SheetScreen>
        <Pill icon={Check} label="Result saved" tone="jade" />
        <Card tone="coral" style={{ gap: S.lg, padding: S.xl }}>
          <IconBadge icon={OctagonX} color={C.coral} bg={alpha(C.coral, 0.18)} size={56} />
          <View style={{ gap: S.sm }}>
            <Display size={T.hero} color={C.coral}>
              Done for today.
            </Display>
            <Body>{reason}</Body>
          </View>
          <Sub color={C.mist}>Stopping now is the trade that protects your account. The setups come back tomorrow.</Sub>
          <Button label="Close the charts" onPress={close} style={{ marginTop: S.xs }} />
        </Card>
      </SheetScreen>
    );
  }

  // What will be saved: the signed R, or 0R for a break-even with nothing typed.
  const shown = invalid ? undefined : (preview ?? (result === 'be' ? 0 : undefined));
  const readoutCaption = invalid
    ? 'Use a number, like 2 or -1.'
    : shown === undefined
      ? 'Type it or tap a quick value'
      : result
        ? `Saved as a ${result === 'be' ? 'break-even' : result}`
        : 'Choose a result to save';

  return (
    <SheetScreen>
      <Hero
        context={editing ? 'Closed trade' : 'Open trade'}
        title={editing ? 'Edit result' : 'Log result'}
        right={<Button label="Cancel" kind="ghost" onPress={close} />}
      />

      <TradeRecap trade={trade} />

      <Section title="Result">
        <Grid columns={3} gap={S.sm}>
          {RESULTS.map((o) => (
            <Tile
              key={o.value}
              title={o.label}
              subtitle={o.hint}
              icon={o.icon}
              pastel={o.pastel}
              selected={result === o.value}
              accessibilityRole="radio"
              onPress={() => setResult(o.value)}
            />
          ))}
        </Grid>
      </Section>

      <Section title="R multiple">
        <Card style={{ gap: S.lg }}>
          <Row gap={S.md}>
            <View style={{ flex: 1, gap: 2 }}>
              <Display
                size={44}
                color={shown === undefined ? C.faint : rColor(shown)}
                style={{ letterSpacing: -1.2 }}>
                {shown === undefined ? '0R' : fmtR(shown)}
              </Display>
              <Small color={invalid ? C.tangerine : C.haze}>{readoutCaption}</Small>
            </View>
            {shown === undefined ? (
              <ToneBadge icon={Calculator} tone="neutral" size={52} />
            ) : (
              <ToneBadge
                icon={shown > 0 ? TrendingUp : shown < 0 ? TrendingDown : Minus}
                tone={shown > 0 ? 'jade' : shown < 0 ? 'coral' : 'neutral'}
                size={52}
              />
            )}
          </Row>
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
                label={`${quickLabel(v)}R`}
                tone={v < 0 ? 'coral' : 'jade'}
                selected={preview === v}
                onPress={() => pickR(v)}
              />
            ))}
          </Row>
          {flipped ? (
            <Small>{result === 'loss' ? 'Losses are saved as negative R.' : 'Wins are saved as positive R.'}</Small>
          ) : null}
        </Card>
      </Section>

      <Section title="Did you follow your rules?">
        <Grid gap={S.md}>
          {RULES.map((o) => (
            <Tile
              key={o.value}
              title={o.label}
              subtitle={o.hint}
              icon={o.icon}
              pastel={o.pastel}
              selected={followed === o.value}
              accessibilityRole="radio"
              onPress={() => setFollowed(o.value)}
            />
          ))}
        </Grid>
        {followed === 'no' ? <HintRow icon={NotebookPen}>Logged, not judged. This is what the journal is for.</HintRow> : null}
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
        <Button kind="accent" icon={Check} label="Save result" onPress={save} disabled={!canSave} />
        {!result ? (
          <Small color={C.faint} style={{ textAlign: 'center' }}>
            Choose win, loss or break-even to save.
          </Small>
        ) : null}
      </View>

      <Button label="Delete trade" kind="danger" icon={Trash2} onPress={confirmDelete} style={{ marginTop: S.sm }} />
      {dialog}
    </SheetScreen>
  );
}
