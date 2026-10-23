import Constants from 'expo-constants';
import { Image, type ImageSource } from 'expo-image';
import { router } from 'expo-router';
import {
  Flame,
  ListOrdered,
  Lock,
  ShieldCheck,
  Target,
  Timer,
  Trash2,
  TrendingDown,
  Wind,
  type LucideIcon,
} from 'lucide-react-native';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { C, F, S, type PastelName } from '@/constants/theme';
import { useConfirm } from '@/features/settings/confirm';
import { CardNote, DoneButton, InsetDivider, NumberBadge, PastelBadge, SettingRow } from '@/features/settings/parts';
import { EditableList } from '@/features/today/EditableList';
import { useToday } from '@/features/today/useToday';
import { pastelAt, promiseIcon } from '@/features/today/visuals';
import { promiseStreak } from '@/lib/derive';
import { actions, useStore, type Settings } from '@/lib/store';
import { ArtCard, Avatar, Button, Card, Display, Field, Hero, Row, Screen, Section, Small, Stepper } from '@/ui';

type NumberKey = 'maxTrades' | 'maxLossStreak' | 'cooldownMin' | 'urgeMinutes';

const LIMITS: {
  key: NumberKey;
  label: string;
  detail: string;
  icon: LucideIcon;
  pastel: PastelName;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}[] = [
  {
    key: 'maxTrades',
    label: 'Max trades',
    detail: 'Trades per day. After the last one, the gate says stop until tomorrow.',
    icon: ListOrdered,
    pastel: 'sky',
    min: 1,
    max: 10,
  },
  {
    key: 'maxLossStreak',
    label: 'Max losses',
    detail: 'Losses in a row before the day is done.',
    icon: TrendingDown,
    pastel: 'rose',
    min: 1,
    max: 5,
  },
  {
    key: 'cooldownMin',
    label: 'Cool-down',
    detail: 'Minutes to wait after a loss before the gate clears you again.',
    icon: Timer,
    pastel: 'butter',
    min: 0,
    max: 120,
    step: 5,
    suffix: 'm',
  },
  {
    key: 'urgeMinutes',
    label: 'Urge timer',
    detail: 'How long you sit with an urge before you decide.',
    icon: Wind,
    pastel: 'lilac',
    min: 1,
    max: 30,
    suffix: 'm',
  },
];

const VERSION = Constants.expoConfig?.version ?? '1.0.0';
const APP_ICON = require('@/assets/images/icon.png') as ImageSource;

/** Labels and placeholders that sit on the profile artwork. */
const ON_ART = 'rgba(242,245,251,0.78)';
const ART_PLACEHOLDER = 'rgba(242,245,251,0.45)';

const update = (patch: Partial<Settings>) => actions.updateSettings(patch);

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** "3 rules"; nothing when the list is empty, since the card already says so. */
const count = (n: number, word: string) => (n ? `${n} ${word}${n === 1 ? '' : 's'}` : undefined);

export default function SettingsScreen() {
  const state = useStore();
  const { settings } = state;
  const { now } = useToday();
  const { confirm, dialog } = useConfirm();

  const streak = promiseStreak(state, now);
  const tradesTaken = state.trades.filter((t) => t.taken).length;
  const resisted = state.urges.filter((u) => u.outcome === 'resisted').length;

  const confirmErase = () =>
    confirm({
      title: 'Erase everything?',
      message: "Trades, check-ins, urges and settings will be deleted from this phone. This can't be undone.",
      confirmLabel: 'Erase everything',
      cancelLabel: 'Cancel',
      icon: Trash2,
      onConfirm: () => {
        actions.resetAll();
        close();
      },
    });

  return (
    <>
      <Screen modal>
        <Hero context="Changes save as you go" title="Settings" right={<DoneButton onPress={close} />} />

        <ArtCard
          art="dawn"
          footer={
            <>
              <FooterStat value={String(streak)} label="Day streak" color={streak > 0 ? C.gold : C.mist} icon={Flame} />
              <View style={styles.footerRule} />
              <FooterStat value={String(tradesTaken)} label="Trades taken" />
              <View style={styles.footerRule} />
              <FooterStat value={String(resisted)} label="Urges resisted" />
            </>
          }>
          <Row gap={S.lg} style={{ alignItems: 'flex-end' }}>
            <Avatar name={settings.name} size={64} />
            <View style={{ flex: 1, gap: 6 }}>
              <Small color={ON_ART}>Name</Small>
              <Field
                value={settings.name}
                onChangeText={(name) => update({ name })}
                placeholder="Your name"
                placeholderTextColor={ART_PLACEHOLDER}
                accessibilityLabel="Name"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                style={[styles.artField, styles.nameField]}
              />
            </View>
          </Row>
          <View style={{ gap: 6, marginTop: S.xs }}>
            <Small color={ON_ART}>Your why</Small>
            <Field
              value={settings.why}
              onChangeText={(why) => update({ why })}
              placeholder="Pass the next payout without breaking a rule. Build a life I'm proud of."
              placeholderTextColor={ART_PLACEHOLDER}
              accessibilityLabel="Your why"
              multiline
              style={styles.artField}
            />
            <Small color={ON_ART}>Shown at the top of Today. Write it for the night you want to break a rule.</Small>
          </View>
        </ArtCard>

        <Section title="Limits" aside="The gate enforces these">
          <Card style={styles.group}>
            {LIMITS.map((l, i) => (
              <Fragment key={l.key}>
                {i > 0 ? <InsetDivider /> : null}
                <SettingRow
                  badge={<PastelBadge icon={l.icon} pastel={l.pastel} />}
                  label={l.label}
                  detail={l.detail}
                  control={
                    <Stepper
                      value={settings[l.key]}
                      onChange={(v) => update({ [l.key]: v })}
                      min={l.min}
                      max={l.max}
                      step={l.step}
                      suffix={l.suffix}
                    />
                  }
                />
              </Fragment>
            ))}
          </Card>
        </Section>

        <Section title="Trading rules" aside={count(settings.rules.length, 'rule')}>
          <EditableList
            items={settings.rules}
            onChange={(rules) => update({ rules })}
            noun="rule"
            placeholder="Wait for the 15m close"
            empty="No rules yet. Add the conditions a trade must meet before you take it."
            emptyIcon={ShieldCheck}
            removeNote="The gate will stop asking for it."
            badge={(_, i) => <NumberBadge n={i + 1} pastel="sky" />}
            confirm={confirm}
          />
          <CardNote>Every rule must be ticked before the gate clears you.</CardNote>
        </Section>

        <Section title="Daily promises" aside={count(settings.promises.length, 'promise')}>
          <EditableList
            items={settings.promises}
            onChange={(promises) => update({ promises })}
            noun="promise"
            placeholder="Read 20 pages"
            empty="No promises yet. Add the few things that make a good day: sleep, training, work, study."
            emptyIcon={Target}
            removeNote="Your streak is counted against the promises on this list."
            badge={(item, i) => <PastelBadge icon={promiseIcon(item)} pastel={pastelAt(i)} />}
            confirm={confirm}
          />
          <CardNote>Keep it to a few you can actually keep. Changing the list changes how your streak is counted.</CardNote>
        </Section>

        <Section title="Data">
          <Card style={{ gap: S.lg }}>
            <SettingRow
              badge={<PastelBadge icon={Lock} pastel="mint" />}
              label="Stored only on this phone"
              detail="No account and no cloud. Nothing you log leaves this device."
              style={{ paddingVertical: 0 }}
            />
            <Button kind="danger" icon={Trash2} label="Erase everything" onPress={confirmErase} />
          </Card>
        </Section>

        <View style={styles.footer}>
          <Image source={APP_ICON} style={styles.appIcon} contentFit="cover" accessibilityIgnoresInvertColors />
          <Small color={C.haze} style={{ fontFamily: F.bold, marginTop: S.sm }}>
            Get Gud
          </Small>
          <Small color={C.faint}>Version {VERSION}</Small>
        </View>
      </Screen>
      {dialog}
    </>
  );
}

function FooterStat({
  value,
  label,
  color = C.mist,
  icon: I,
}: {
  value: string;
  label: string;
  color?: string;
  icon?: LucideIcon;
}) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Row gap={4}>
        {I ? <I size={16} color={color} strokeWidth={2.4} /> : null}
        <Display size={18} color={color}>
          {value}
        </Display>
      </Row>
      <Small color="rgba(242,245,251,0.7)" numberOfLines={1}>
        {label}
      </Small>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 0, paddingVertical: S.xs },
  artField: {
    backgroundColor: 'rgba(10,16,32,0.45)',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  nameField: { height: 48, paddingVertical: 0, fontFamily: F.bold, fontSize: 18 },
  footerRule: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  footer: { alignItems: 'center', gap: 2, paddingTop: S.sm },
  appIcon: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: C.line },
});
