/**
 * The account at a glance, prop-firm style (target, daily loss, max loss, trading days),
 * under Today's primary action. The balance is the hero; the limits read as room left, in
 * orange, never red: a limit is a fact to respect, not a failure. Tap for the Journal's stats.
 * With no account set up, one quiet row asks for it.
 */
import { router } from 'expo-router';
import { ChevronRight, Wallet } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { C, R, S, SYS, tint } from '@/constants/theme';
import { fmtMoney, fmtPct, type AccountStatus, type Objective } from '@/lib/account';
import { haptic } from '@/lib/haptics';
import { Card, IconSquare, Num, Txt, useSpringValue } from '@/ui';

const BAR: Record<Objective['key'], string> = {
  target: SYS.green,
  days: SYS.teal,
  daily: SYS.orange,
  max: SYS.orange,
};

export function AccountCard({ acct, onSetUp }: { acct: AccountStatus; onSetUp: () => void }) {
  if (!acct.set) {
    return (
      <Card
        padding={S.md}
        onPress={() => {
          haptic.tap();
          onSetUp();
        }}
        accessibilityLabel="Set up your account. Track the target, daily loss and max loss">
        <View style={styles.setup}>
          <IconSquare icon={Wallet} color={C.tint} />
          <View style={{ flex: 1 }}>
            <Txt v="headline">Set up your account</Txt>
            <Txt v="footnote" color={C.label2}>
              Target and loss limits, from your R.
            </Txt>
          </View>
          <ChevronRight size={18} color={C.label3} strokeWidth={2.4} />
        </View>
      </Card>
    );
  }

  const balancePct = acct.totalPct;
  const lossLine = Number.isFinite(acct.lossesLeft)
    ? acct.lossesLeft === 0
      ? 'No room for another full loss today.'
      : `${acct.lossesLeft} full ${acct.lossesLeft === 1 ? 'loss' : 'losses'} before a limit.`
    : null;
  const label = `Account ${fmtMoney(acct.size, 100 + balancePct)}, ${fmtPct(balancePct)}. ${acct.objectives
    .map((o) => `${o.label}: ${o.detail}`)
    .join('. ')}. ${lossLine ?? ''} Show stats`;

  return (
    <Card
      onPress={() => {
        haptic.tap();
        router.navigate('/journal');
      }}
      accessibilityLabel={label}>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="footnote" weight="600" color={C.label2}>
            Account
          </Txt>
          <View style={styles.balance}>
            <Num size={30} weight="700" numberOfLines={1}>
              {fmtMoney(acct.size, 100 + balancePct)}
            </Num>
            <Txt v="subhead" weight="600" rounded tabular color={balancePct > 0 ? SYS.green : C.label2}>
              {fmtPct(balancePct)}
            </Txt>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Txt v="footnote" weight="600" color={C.label2}>
            Today
          </Txt>
          <Txt v="headline" rounded tabular color={acct.todayPct > 0 ? SYS.green : acct.todayPct < 0 ? SYS.orange : C.label}>
            {fmtPct(acct.todayPct)}
          </Txt>
        </View>
      </View>

      <View style={styles.grid}>
        {acct.objectives.map((o) => (
          <ObjectiveBar key={o.key} o={o} />
        ))}
      </View>

      {lossLine ? (
        <Txt v="footnote" color={acct.lossesLeft <= 1 ? SYS.orange : C.label2}>
          {lossLine}
        </Txt>
      ) : null}
    </Card>
  );
}

/** One objective: label and detail over a slim bar that springs to its value. */
function ObjectiveBar({ o }: { o: Objective }) {
  const color = o.done && (o.key === 'target' || o.key === 'days') ? C.tint : BAR[o.key];
  const fill = useSpringValue(o.used, 'smooth', 0);
  return (
    <View style={styles.cell}>
      <View style={styles.cellHead}>
        <Txt v="footnote" weight="600" numberOfLines={1} style={{ flexShrink: 1 }}>
          {o.label}
        </Txt>
      </View>
      <View style={[styles.track, { backgroundColor: tint(color, 0.2) }]}>
        <View style={[styles.fill, { backgroundColor: color, width: `${Math.max(0, Math.min(1, fill)) * 100}%` }]} />
      </View>
      <Txt v="caption1" rounded tabular color={C.label2} numberOfLines={1}>
        {o.detail}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  setup: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md },
  balance: { flexDirection: 'row', alignItems: 'baseline', gap: S.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: S.md, columnGap: S.lg },
  cell: { width: '46%', flexGrow: 1, gap: 6 },
  cellHead: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: R.pill, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: R.pill },
});
