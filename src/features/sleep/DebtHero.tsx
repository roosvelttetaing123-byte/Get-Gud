/**
 * Hero, straight on the night sky (no card, so the stars show): sleep debt as one big number,
 * a slim zone meter like Weather's UV index, and last night against your need.
 */
import { StyleSheet, View } from 'react-native';

import { C, S, tint } from '@/constants/theme';
import { fmtDebt, fmtDur, type Debt } from '@/lib/sleep';
import { Num, Row, Txt, useSpringValue } from '@/ui';

import { DEBT_LOOK } from './look';

const ZONES: Debt['zone'][] = ['low', 'moderate', 'high'];
/** Hours at the right end of the meter: three zones of 5 h each. */
const METER_MAX = 15;
const METER_W = 240;
const KNOB = 14;

export function DebtHero({ debt, need }: { debt: Debt; need: number }) {
  const look = DEBT_LOOK[debt.zone];
  const empty = debt.known === 0;
  const shown = useSpringValue(debt.hours, 'smooth', 0);
  const fill = useSpringValue(Math.min(1, debt.hours / METER_MAX), 'smooth', 0);
  const meta = [debt.lastNight !== undefined ? `Last night ${fmtDur(debt.lastNight)}` : undefined, `Need ${fmtDur(need)}`]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <View
      style={styles.hero}
      accessible
      accessibilityLabel={
        empty ? 'Sleep debt, no nights logged yet' : `Sleep debt ${fmtDebt(debt.hours)} hours, ${look.label.toLowerCase()}. ${meta}`
      }>
      <Txt v="subhead" weight="600" color={C.label2}>
        Sleep debt
      </Txt>
      {empty ? (
        <>
          <Txt v="title1" align="center" style={{ marginTop: S.xs }}>
            No nights yet
          </Txt>
          <Txt v="subhead" color={C.label2} align="center" style={{ maxWidth: 290 }}>
            Log a night to see your debt. Under 5 hours is the goal.
          </Txt>
        </>
      ) : (
        <Row align="flex-end" gap={4}>
          <Num size={76} weight="700" color={look.color}>
            {fmtDebt(shown)}
          </Num>
          <Txt v="title2" weight="600" color={C.label2} style={{ marginBottom: 13 }}>
            h
          </Txt>
        </Row>
      )}

      {empty ? null : (
        <>
          <View style={styles.meter}>
            <Row gap={3}>
              {ZONES.map((z) => (
                <View key={z} style={[styles.zone, { backgroundColor: tint(DEBT_LOOK[z].color, z === debt.zone ? 0.5 : 0.22) }]} />
              ))}
            </Row>
            <View style={[styles.knob, { left: Math.max(0, Math.min(METER_W - KNOB, fill * METER_W - KNOB / 2)), backgroundColor: look.color }]} />
            <Row gap={3} style={{ marginTop: 7 }}>
              {ZONES.map((z) => (
                <Txt
                  key={z}
                  v="caption1"
                  weight={z === debt.zone ? '600' : '400'}
                  color={z === debt.zone ? DEBT_LOOK[z].color : C.label3}
                  align="center"
                  style={{ flex: 1 }}>
                  {DEBT_LOOK[z].label}
                </Txt>
              ))}
            </Row>
          </View>
          <Txt v="subhead" color={C.label2} align="center">
            {meta}
          </Txt>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: S.sm, paddingTop: S.lg },
  meter: { width: METER_W, marginTop: S.xs },
  zone: { flex: 1, height: 6, borderRadius: 3 },
  knob: {
    position: 'absolute',
    top: -4,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    borderWidth: 2.5,
    borderColor: C.bg,
  },
});
