import { router } from 'expo-router';
import { ArrowLeft, ListChecks, Settings, ShieldCheck } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { C, S, Tint } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import type { State } from '@/lib/store';
import { Button, Card, Display, IconBadge, Row, Screen, Section, Sub } from '@/ui';

import { todayFacts } from './logic';
import { ChecklistProgress, FactsCard, RuleCard, StepHeader } from './parts';

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

  const toggle = (i: number) => {
    if (!checked[i] && ticked === rules.length - 1) haptic.success();
    onToggle(i);
  };

  return (
    <Screen>
      <StepHeader context="Your checklist" title="Every box, honestly." step={2} />

      {rules.length ? (
        <>
          <ChecklistProgress ticked={ticked} total={rules.length} />
          <View style={{ gap: S.md }}>
            {rules.map((rule, i) => (
              <RuleCard key={`${i}-${rule}`} rule={rule} index={i} checked={!!checked[i]} onPress={() => toggle(i)} />
            ))}
          </View>
        </>
      ) : (
        <Card>
          <Row gap={S.md}>
            <IconBadge icon={ListChecks} color={C.accent} bg={Tint.accent} />
            <Display size={20} weight="bold" style={{ flex: 1 }}>
              No rules yet.
            </Display>
          </Row>
          <Sub>Add your pre-trade checklist in Settings. The gate checks every box before it clears you.</Sub>
          <Button kind="secondary" icon={Settings} label="Open settings" onPress={() => router.push('/settings')} />
        </Card>
      )}

      <Section title="Today" aside="What the gate sees">
        <FactsCard facts={facts} />
      </Section>

      <Row gap={S.md}>
        <Button kind="secondary" icon={ArrowLeft} label="Back" onPress={onBack} style={{ flex: 1 }} />
        <Button
          kind="accent"
          icon={ShieldCheck}
          label="Check me"
          onPress={onCheck}
          disabled={!rules.length}
          style={{ flex: 1.6 }}
        />
      </Row>
    </Screen>
  );
}
