import { router } from 'expo-router';
import { Flame, NotebookPen, OctagonX, Settings, ShieldCheck, Wind } from 'lucide-react-native';
import { View } from 'react-native';

import { C, S } from '@/constants/theme';
import { MoodPicker, WeekRings, pastelAt, promiseIcon } from '@/features/today/visuals';
import { formatDay, useToday } from '@/features/today/useToday';
import { fmtR, lastDays, promiseStreak, tradingToday } from '@/lib/derive';
import { haptic } from '@/lib/haptics';
import { actions, useStore } from '@/lib/store';
import {
  ArtCard,
  Body,
  Button,
  Card,
  Display,
  Field,
  Greeting,
  Grid,
  IconBadge,
  IconButton,
  Pill,
  Row,
  Scale,
  Screen,
  Section,
  Segmented,
  Small,
  Stat,
  Sub,
  Tile,
} from '@/ui/legacy';

type Slept = 'yes' | 'no';

const SLEPT_OPTIONS: { value: Slept; label: string; tone: 'jade' | 'coral' }[] = [
  { value: 'yes', label: 'Slept well', tone: 'jade' },
  { value: 'no', label: 'Slept badly', tone: 'coral' },
];

const openSettings = () => router.push('/settings');

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 5) return 'Up late,';
  if (h < 12) return 'Good morning,';
  if (h < 18) return 'Good afternoon,';
  return 'Good evening,';
}

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
  const name = settings.name.trim() || 'Trader';

  const toggle = (p: string) => {
    const completesDay = !kept[p] && promises.every((x) => x === p || kept[x]);
    actions.togglePromise(key, p);
    if (completesDay) haptic.success();
  };

  const slept: Slept | undefined = day?.sleptWell === undefined ? undefined : day.sleptWell ? 'yes' : 'no';
  const netTone = trading.netR > 0 ? C.jade : trading.netR < 0 ? C.coral : C.mist;

  return (
    <Screen>
      <Greeting
        name={name}
        line={greeting(now)}
        title={`${name}. ${allKept ? 'Day won.' : 'Stay sharp.'}`}
        right={<IconButton icon={Settings} label="Settings" onPress={openSettings} />}
      />

      <ArtCard
        art="dawn"
        footer={
          <>
            <FooterStat value={promises.length ? `${keptCount}/${promises.length}` : '–'} label="Promises" />
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <FooterStat value={`${trading.taken.length}/${settings.maxTrades}`} label="Trades" />
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <FooterStat value={fmtR(trading.netR)} label="Today" color={netTone} />
          </>
        }>
        <Row style={{ justifyContent: 'space-between' }}>
          <Small color="rgba(242,245,251,0.8)">{formatDay(now)}</Small>
          <Pill icon={Flame} label={`${streak} day streak`} tone="gold" solid={streak > 0} />
        </Row>
        {why ? (
          <>
            <Sub color="rgba(242,245,251,0.75)">Why you&apos;re doing this</Sub>
            <Display size={23} weight="extra">
              {why}
            </Display>
          </>
        ) : (
          <>
            <Display size={23}>Write down why you&apos;re doing this.</Display>
            <Sub color="rgba(242,245,251,0.8)">On a bad night it&apos;s the first thing you&apos;ll read.</Sub>
            <Button kind="primary" label="Add your why" onPress={openSettings} style={{ alignSelf: 'flex-start' }} />
          </>
        )}
      </ArtCard>

      <Grid gap={S.md}>
        <Tile
          title="Check before you trade"
          subtitle="Feelings and rules"
          icon={ShieldCheck}
          pastel="sky"
          onPress={() => router.push('/gate')}
        />
        <Tile
          title="I feel an urge"
          subtitle="Ride it out"
          icon={Wind}
          pastel="lilac"
          onPress={() => router.push('/urge')}
        />
      </Grid>

      <Section title="Today's promises" aside={promises.length ? `${keptCount} of ${promises.length} kept` : undefined}>
        {promises.length ? (
          <Grid>
            {promises.map((p, i) => (
              <Tile
                key={p}
                title={p}
                subtitle={kept[p] ? 'Kept' : 'Tap when done'}
                icon={promiseIcon(p)}
                pastel={pastelAt(i)}
                selected={!!kept[p]}
                check
                accessibilityRole="checkbox"
                onPress={() => toggle(p)}
              />
            ))}
          </Grid>
        ) : (
          <Card>
            <Body>Set your daily promises</Body>
            <Sub>Two to four things that make a good day: sleep, training, work, study.</Sub>
            <Button kind="secondary" label="Add promises" onPress={openSettings} />
          </Card>
        )}
      </Section>

      <Section title="This week" aside={streak > 0 ? `${streak} day streak` : 'Keep every promise to start a streak'}>
        <Card style={{ paddingVertical: S.lg }}>
          <WeekRings days={week} todayKey={key} />
        </Card>
      </Section>

      <Section title="Check in">
        <Card style={{ gap: S.lg }}>
          <View style={{ gap: S.sm }}>
            <Sub>How do you feel?</Sub>
            <MoodPicker value={day?.mood} onChange={(mood) => actions.updateDay(key, { mood })} />
          </View>
          <View style={{ gap: S.sm }}>
            <Sub>Energy</Sub>
            <Scale value={day?.energy} onChange={(energy) => actions.updateDay(key, { energy })} low="Drained" high="Charged" />
          </View>
          <View style={{ gap: S.sm }}>
            <Sub>Last night</Sub>
            <Segmented
              options={SLEPT_OPTIONS}
              value={slept}
              onChange={(v) => actions.updateDay(key, { sleptWell: v === 'yes' })}
            />
          </View>
          <Field
            label="One line about today"
            placeholder="What went well, what pulled at you"
            multiline
            value={day?.note ?? ''}
            onChangeText={(note) => actions.updateDay(key, { note })}
          />
        </Card>
      </Section>

      <Section title="Trading">
        {trading.limitHit ? (
          <Card tone="coral">
            <Row gap={S.md}>
              <IconBadge icon={OctagonX} color={C.coral} bg="rgba(255,107,120,0.18)" />
              <Display size={22} color={C.coral} style={{ flex: 1 }}>
                Done for today.
              </Display>
            </Row>
            <Body>{trading.limitHit.replace(/\s*Done for today\.?$/, '')}</Body>
            <Sub>Close the charts. Tomorrow is a new session.</Sub>
          </Card>
        ) : (
          <Card>
            <Row gap={S.md} style={{ alignItems: 'flex-start' }}>
              <Stat value={`${trading.taken.length} of ${settings.maxTrades}`} label="trades taken" />
              <Stat
                value={fmtR(trading.netR)}
                label="net R"
                tone={trading.netR > 0 ? 'jade' : trading.netR < 0 ? 'coral' : 'neutral'}
              />
              <Stat value={String(trading.skipped)} label="walked away" tone={trading.skipped > 0 ? 'jade' : 'neutral'} />
            </Row>
            {trading.taken.length === 0 && trading.skipped === 0 ? (
              <Small>No trades yet today. Run the check before the first one.</Small>
            ) : null}
          </Card>
        )}
        {trading.open.length ? (
          <Button
            kind="secondary"
            icon={NotebookPen}
            label={`Log result for ${trading.open.length} open ${trading.open.length === 1 ? 'trade' : 'trades'}`}
            onPress={() => router.push(`/trade/${trading.open[0].id}`)}
          />
        ) : null}
      </Section>
    </Screen>
  );
}

function FooterStat({ value, label, color = C.mist }: { value: string; label: string; color?: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Display size={18} color={color}>
        {value}
      </Display>
      <Small color="rgba(242,245,251,0.7)">{label}</Small>
    </View>
  );
}
