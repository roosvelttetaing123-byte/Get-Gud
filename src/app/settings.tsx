import { router } from 'expo-router';
import { Fragment } from 'react';
import { Alert, View } from 'react-native';

import { S, T } from '@/constants/theme';
import { EditableList } from '@/features/today/EditableList';
import { actions, useStore, type Settings } from '@/lib/store';
import { Body, Button, Display, Divider, Field, Row, Screen, Section, Small, Stepper, Surface } from '@/ui';

type NumberKey = 'maxTrades' | 'maxLossStreak' | 'cooldownMin' | 'urgeMinutes';

const LIMITS: {
  key: NumberKey;
  label: string;
  detail: string;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}[] = [
  {
    key: 'maxTrades',
    label: 'Trades per day',
    detail: 'After this many, the gate says stop for the rest of the day.',
    min: 1,
    max: 10,
  },
  {
    key: 'maxLossStreak',
    label: 'Losses in a row',
    detail: 'Stop after this many losses in a row. The day is done.',
    min: 1,
    max: 5,
  },
  {
    key: 'cooldownMin',
    label: 'Cool-down',
    detail: 'Minutes to wait after a loss before the gate will clear you.',
    min: 0,
    max: 120,
    step: 5,
    suffix: 'm',
  },
  {
    key: 'urgeMinutes',
    label: 'Urge timer',
    detail: 'How long you sit with an urge before you decide.',
    min: 1,
    max: 30,
    suffix: 'm',
  },
];

const update = (patch: Partial<Settings>) => actions.updateSettings(patch);

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function confirmErase() {
  Alert.alert(
    'Erase everything?',
    "Trades, check-ins, urges and settings will be deleted from this phone. This can't be undone.",
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Erase everything',
        style: 'destructive',
        onPress: () => {
          actions.resetAll();
          close();
        },
      },
    ],
  );
}

export default function SettingsScreen() {
  const { settings } = useStore();

  return (
    <Screen modal>
      <Row style={{ justifyContent: 'space-between' }}>
        <Display size={T.hero}>Settings</Display>
        <Button kind="ghost" label="Done" onPress={close} />
      </Row>

      <Section title="You">
        <Field
          label="Name"
          value={settings.name}
          onChangeText={(name) => update({ name })}
          placeholder="What should this app call you"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
        />
        <Field
          label="Your why"
          value={settings.why}
          onChangeText={(why) => update({ why })}
          placeholder="Pass the next FTMO payout without breaking a rule. Build a life I'm proud of."
          multiline
        />
        <Small>Shown at the top of Today. Write it for the night you want to break a rule.</Small>
      </Section>

      <Section title="Trading rules">
        <EditableList
          items={settings.rules}
          onChange={(rules) => update({ rules })}
          noun="rule"
          placeholder="Only trade the New York session"
          empty="No rules yet. Add the conditions a trade must meet before you take it."
          removeNote="The gate will stop asking for it."
        />
        <Small>Every rule must be ticked before the gate clears you.</Small>
      </Section>

      <Section title="Daily promises">
        <EditableList
          items={settings.promises}
          onChange={(promises) => update({ promises })}
          noun="promise"
          placeholder="Read 20 pages"
          empty="No promises yet. Add the few things that make a good day: sleep, training, work, study."
          removeNote="Your streak is counted against the promises on this list."
        />
        <Small>Keep it to a few you can actually keep. Changing the list changes how your streak is counted.</Small>
      </Section>

      <Section title="Limits">
        <Surface style={{ gap: 0, paddingVertical: S.xs }}>
          {LIMITS.map((l, i) => (
            <Fragment key={l.key}>
              {i > 0 ? <Divider /> : null}
              <View style={{ gap: S.xs, paddingVertical: S.md }}>
                <Row gap={S.md}>
                  <Body style={{ flex: 1 }}>{l.label}</Body>
                  <Stepper
                    value={settings[l.key]}
                    onChange={(v) => update({ [l.key]: v })}
                    min={l.min}
                    max={l.max}
                    step={l.step}
                    suffix={l.suffix}
                  />
                </Row>
                <Small>{l.detail}</Small>
              </View>
            </Fragment>
          ))}
        </Surface>
      </Section>

      <Section title="Data">
        <Button kind="danger" label="Erase everything" onPress={confirmErase} />
        <Small>Everything is stored only on this phone.</Small>
      </Section>
    </Screen>
  );
}
