import { router } from 'expo-router';
import { Fragment } from 'react';
import { View } from 'react-native';

import { C, S, T } from '@/constants/theme';
import { WeekStrip } from '@/features/today/WeekStrip';
import { formatDay, useToday } from '@/features/today/useToday';
import { fmtR, lastDays, promiseStreak, tradingToday } from '@/lib/derive';
import { haptic } from '@/lib/haptics';
import { actions, useStore } from '@/lib/store';
import {
  Body,
  Button,
  CheckRow,
  Display,
  Divider,
  Field,
  Hero,
  IconButton,
  Row,
  Scale,
  Screen,
  Section,
  Segmented,
  Small,
  Stat,
  Sub,
  Surface,
} from '@/ui';

type Slept = 'yes' | 'no';

const SLEPT_OPTIONS: { value: Slept; label: string; tone: 'jade' | 'coral' }[] = [
  { value: 'yes', label: 'Yes', tone: 'jade' },
  { value: 'no', label: 'No', tone: 'coral' },
];

const openSettings = () => router.push('/settings');

export default function TodayScreen() {
  const state = useStore();
  const { now, key } = useToday();

  const { settings } = state;
  const day = state.days[key];
  const kept = day?.promises ?? {};
  const promises = settings.promises;
  const keptCount = promises.filter((p) => kept[p]).length;
  const allKept = promises.length > 0 && keptCount === promises.length;

  const streak = promiseStreak(state, now);
  const week = lastDays(state, 7, now);
  const trading = tradingToday(state);
  const why = settings.why.trim();

  const title = !promises.length ? 'No promises yet' : allKept ? 'All kept' : `${keptCount} of ${promises.length} kept`;

  const toggle = (p: string) => {
    const completesDay = !kept[p] && promises.every((x) => x === p || kept[x]);
    actions.togglePromise(key, p);
    if (completesDay) haptic.success();
  };

  const slept: Slept | undefined = day?.sleptWell === undefined ? undefined : day.sleptWell ? 'yes' : 'no';

  return (
    <Screen>
      <Hero
        context={formatDay(now)}
        title={title}
        right={<IconButton glyph="⚙︎" label="Settings" onPress={openSettings} />}
      />

      {why ? (
        <Surface style={{ gap: S.sm }}>
          <Small>Why you&apos;re doing this</Small>
          <Row gap={S.md} style={{ alignItems: 'stretch' }}>
            <View style={{ width: 3, borderRadius: 2, backgroundColor: C.raised }} />
            <Body style={{ flex: 1 }}>{why}</Body>
          </Row>
        </Surface>
      ) : (
        <Surface style={{ gap: S.xs }}>
          <Body>Write down why you&apos;re doing this</Body>
          <Sub>On a bad night it is the first thing you will read here.</Sub>
          <Button kind="ghost" label="Add your why" onPress={openSettings} style={{ alignSelf: 'flex-start' }} />
        </Surface>
      )}

      <Surface style={{ gap: S.lg }}>
        <Row gap={S.xl} style={{ alignItems: 'flex-end' }}>
          <View accessible accessibilityLabel={`${streak} day streak`} style={{ gap: 2, minWidth: 64 }}>
            <Display size={T.hero} color={streak > 0 ? C.gold : C.mist}>
              {streak}
            </Display>
            <Small>day streak</Small>
          </View>
          <WeekStrip days={week} todayKey={key} />
        </Row>
        {promises.length && !allKept ? (
          <Small>A day counts once every promise is kept.</Small>
        ) : null}
      </Surface>

      <Section title="Check in">
        <Surface style={{ gap: S.lg }}>
          <View style={{ gap: S.sm }}>
            <Sub>Mood</Sub>
            <Scale value={day?.mood} onChange={(mood) => actions.updateDay(key, { mood })} low="Rough" high="Great" />
          </View>
          <View style={{ gap: S.sm }}>
            <Sub>Energy</Sub>
            <Scale
              value={day?.energy}
              onChange={(energy) => actions.updateDay(key, { energy })}
              low="Drained"
              high="Charged"
            />
          </View>
          <View style={{ gap: S.sm }}>
            <Sub>Slept well?</Sub>
            <Segmented
              options={SLEPT_OPTIONS}
              value={slept}
              onChange={(v) => actions.updateDay(key, { sleptWell: v === 'yes' })}
            />
          </View>
        </Surface>

        {promises.length ? (
          <Surface style={{ gap: 0, paddingVertical: S.sm }}>
            {promises.map((p, i) => (
              <Fragment key={p}>
                {i > 0 ? <Divider /> : null}
                <CheckRow label={p} checked={!!kept[p]} onPress={() => toggle(p)} />
              </Fragment>
            ))}
          </Surface>
        ) : (
          <Surface style={{ gap: S.xs }}>
            <Body>Set your daily promises</Body>
            <Sub>Two to four things that make a good day: sleep, training, work, study. Tick them off here.</Sub>
            <Button kind="ghost" label="Add promises" onPress={openSettings} style={{ alignSelf: 'flex-start' }} />
          </Surface>
        )}

        <Field
          label="One line about today"
          placeholder="What went well, what pulled at you"
          multiline
          value={day?.note ?? ''}
          onChangeText={(note) => actions.updateDay(key, { note })}
        />
      </Section>

      <Section title="Trading">
        {trading.limitHit ? (
          <Surface tone="coral" style={{ gap: S.sm }}>
            <Display size={T.title} color={C.coral}>
              Done for today.
            </Display>
            <Body>{trading.limitHit.replace(/\s*Done for today\.?$/, '')}</Body>
            <Sub>Close the charts. Tomorrow is a new session.</Sub>
          </Surface>
        ) : (
          <Surface style={{ gap: S.md }}>
            <Row gap={S.md} style={{ alignItems: 'flex-start' }}>
              <Stat value={`${trading.taken.length} of ${settings.maxTrades}`} label="trades taken" />
              <Stat
                value={fmtR(trading.netR)}
                label="net R"
                tone={trading.netR > 0 ? 'jade' : trading.netR < 0 ? 'coral' : 'neutral'}
              />
              <Stat
                value={String(trading.skipped)}
                label="times walked away"
                tone={trading.skipped > 0 ? 'jade' : 'neutral'}
              />
            </Row>
            {trading.taken.length === 0 && trading.skipped === 0 ? (
              <Small>No trades yet today. Run the check before the first one.</Small>
            ) : null}
          </Surface>
        )}

        {trading.open.length ? (
          <Button
            kind="secondary"
            label={`Log result for ${trading.open.length} open ${trading.open.length === 1 ? 'trade' : 'trades'}`}
            onPress={() => router.push(`/trade/${trading.open[0].id}`)}
          />
        ) : null}
      </Section>

      <View style={{ gap: S.sm }}>
        <Button label="Check before you trade" onPress={() => router.push('/gate')} />
        <Button kind="secondary" label="I feel an urge" onPress={() => router.push('/urge')} />
      </View>
    </Screen>
  );
}
