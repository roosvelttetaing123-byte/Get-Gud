/**
 * Step 3, "Your rules": every rule is a real iOS switch in an inset group,
 * with a ring that fills as you tick them.
 */
import { router } from 'expo-router';
import { ListChecks } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { C, RING, S } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { Empty, Group, Num, ProgressRing, ToggleRow, Txt } from '@/ui';

import { RULE_COLORS, ruleIcon } from './look';

export function RulesStep({
  rules,
  checked,
  onToggle,
}: {
  rules: string[];
  checked: boolean[];
  onToggle: (index: number, on: boolean) => void;
}) {
  const ticked = rules.filter((_, i) => checked[i]).length;
  const all = rules.length > 0 && ticked === rules.length;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="title1">Your rules</Txt>
          <Txt v="subhead" color={C.label2}>
            {all ? 'All ticked. Run the check.' : 'Tick only what’s true right now.'}
          </Txt>
        </View>
        {rules.length ? (
          <View accessible accessibilityLabel={`${ticked} of ${rules.length} rules ticked`}>
            <ProgressRing
              value={rules.length ? ticked / rules.length : 0}
              size={68}
              stroke={8}
              from={all ? C.green : RING.discipline.from}
              to={all ? C.mint : RING.discipline.to}
              track="rgba(255,255,255,0.12)">
              <View style={{ alignItems: 'center' }}>
                <Num size={22} weight="700" color={all ? C.green : C.label}>
                  {ticked}
                </Num>
                <Txt v="caption2" color={C.label2} style={{ marginTop: -3 }}>
                  {`of ${rules.length}`}
                </Txt>
              </View>
            </ProgressRing>
          </View>
        ) : null}
      </View>

      {rules.length ? (
        <Group footer="An unticked rule means Stop.">
          {rules.map((rule, i) => (
            <ToggleRow
              key={`${i}-${rule}`}
              icon={ruleIcon(rule)}
              iconColor={RULE_COLORS[i % RULE_COLORS.length]}
              title={rule}
              value={!!checked[i]}
              onChange={(on) => {
                if (on && ticked === rules.length - 1) haptic.success();
                onToggle(i, on);
              }}
            />
          ))}
        </Group>
      ) : (
        <Empty
          icon={ListChecks}
          title="No rules yet"
          message="Add your checklist. The gate checks it every time."
          action={{ label: 'Open settings', onPress: () => router.push('/settings') }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: S.xl,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: S.margin,
    paddingTop: S.sm,
    paddingBottom: S.xxxl,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.lg },
});
