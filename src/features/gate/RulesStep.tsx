import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { S, toneColor } from '@/constants/theme';
import type { State } from '@/lib/store';
import { Body, Button, CheckRow, Divider, Hero, Row, Screen, Section, Small, Sub, Surface } from '@/ui';

import { todayFacts } from './logic';

export function RulesStep({
  state,
  now,
  checked,
  onToggle,
  onBack,
  onCheck,
}: {
  state: State;
  now: number;
  checked: boolean[];
  onToggle: (index: number) => void;
  onBack: () => void;
  onCheck: () => void;
}) {
  const rules = state.settings.rules;
  const ticked = rules.filter((_, i) => checked[i]).length;
  const facts = todayFacts(state, now);

  return (
    <Screen>
      <Hero context="Your checklist" title="Every box, honestly." />

      {rules.length ? (
        <View style={{ gap: S.sm }}>
          <Surface style={{ gap: 0, paddingVertical: S.xs }}>
            {rules.map((rule, i) => (
              <View key={`${i}-${rule}`}>
                {i > 0 ? <Divider /> : null}
                <CheckRow label={rule} checked={!!checked[i]} onPress={() => onToggle(i)} />
              </View>
            ))}
          </Surface>
          <Small style={{ paddingHorizontal: S.xs }}>
            {ticked === rules.length
              ? `All ${rules.length} ticked.`
              : `${ticked} of ${rules.length} ticked. Leave a box empty and the gate says stop.`}
          </Small>
        </View>
      ) : (
        <Surface>
          <Body>No rules yet.</Body>
          <Sub>Add your pre-trade checklist in Settings. The gate checks every box before it clears you.</Sub>
          <Button kind="secondary" label="Open settings" onPress={() => router.push('/settings')} />
        </Surface>
      )}

      <Section title="Today">
        <Surface style={{ gap: S.sm }}>
          {facts.map((f) => (
            <Sub key={f.text} color={f.tone === 'neutral' ? undefined : toneColor(f.tone)}>
              {f.text}
            </Sub>
          ))}
        </Surface>
      </Section>

      <Row gap={S.md}>
        <Button kind="secondary" label="Back" onPress={onBack} style={{ flex: 1 }} />
        <Button label="Check me" onPress={onCheck} disabled={!rules.length} style={{ flex: 2 }} />
      </Row>
    </Screen>
  );
}
