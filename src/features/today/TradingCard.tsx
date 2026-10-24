/**
 * Trading today, compact: trades used, net R, walked away. The Journal holds the detail.
 * When the limit is hit the card turns red and says so, calmly.
 */
import { router } from 'expo-router';
import { NotebookPen, OctagonX, ShieldCheck } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { C, S } from '@/constants/theme';
import { fmtR, type TradingToday } from '@/lib/derive';
import { Card, Divider, IconWell, ListRow, Section, Stat, Txt } from '@/ui';

import { mix } from './visuals';

export function TradingCard({ trading, maxTrades, showGate }: { trading: TradingToday; maxTrades: number; showGate: boolean }) {
  const { taken, skipped, open, netR, limitHit } = trading;
  const netColor = netR > 0 ? C.win : netR < 0 ? C.loss : C.label;
  const reason = limitHit?.replace(/\s*Done for today\.?$/, '');
  const openN = open.length;

  return (
    <Section title="Trading">
      <Card padding={0} style={[{ gap: 0 }, limitHit ? { backgroundColor: mix(C.card, C.red, 0.16) } : null]}>
        {limitHit ? (
          <>
            <View style={styles.limit}>
              <IconWell icon={OctagonX} color={C.red} size={40} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt v="headline" color={C.red}>
                  Done trading for today.
                </Txt>
                <Txt v="footnote" color={C.label2}>
                  {reason}
                </Txt>
              </View>
            </View>
            <Divider inset={S.lg} />
          </>
        ) : null}

        <View style={styles.stats}>
          <Stat value={`${taken.length}/${maxTrades}`} label="Trades" size={24} />
          <Stat value={fmtR(netR)} label="Net" color={netColor} size={24} />
          <Stat value={String(skipped)} label="Walked away" color={skipped > 0 ? C.green : C.label} size={24} />
        </View>

        {openN ? (
          <>
            <Divider inset={58} />
            <ListRow
              icon={NotebookPen}
              iconColor={C.blue}
              title="Log result"
              subtitle={`${openN} open ${openN === 1 ? 'trade' : 'trades'}`}
              chevron
              onPress={() => router.push(`/trade/${open[0].id}`)}
            />
          </>
        ) : null}

        {showGate && !limitHit ? (
          <>
            <Divider inset={58} />
            <ListRow icon={ShieldCheck} iconColor={C.tint} title="Check before you trade" chevron onPress={() => router.push('/gate')} />
          </>
        ) : null}
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  limit: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg },
  stats: { flexDirection: 'row', gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.lg },
});
