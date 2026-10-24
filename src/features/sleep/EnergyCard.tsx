/**
 * Energy schedule: today's curve coloured by phase, a "now" marker, then the phase list
 * with the current one highlighted. Tap a phase to see its tip.
 */
import { useId, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { C, FONT, S, tint } from '@/constants/theme';
import { clockLabel, type Phase, type Schedule } from '@/lib/sleep';
import { Card, Divider, IconSquare, Pressy, Row, Txt } from '@/ui';

import { PHASE_LOOK } from './look';

const CH = 150;
const PAD_TOP = 14;
const PAD_BOTTOM = 22;

export function EnergyCard({ sched, now, phase }: { sched: Schedule; now: number; phase?: Phase }) {
  const [w, setW] = useState(0);
  const [open, setOpen] = useState<string | undefined>();
  const id = useId().replace(/:/g, '');
  const pts = sched.curve;
  const t0 = pts[0].t;
  const t1 = pts[pts.length - 1].t;
  const x = (t: number) => ((t - t0) / (t1 - t0)) * w;
  const y = (e: number) => PAD_TOP + (1 - e / 100) * (CH - PAD_TOP - PAD_BOTTOM);
  const day = sched.phases.filter((p) => p.id !== 'sleep');

  const segment = (p: Phase) => {
    const inside = pts.filter((q) => q.t >= p.start - 1 && q.t <= p.end + 1);
    if (inside.length < 2) return '';
    return inside.map((q, i) => `${i ? 'L' : 'M'}${x(q.t).toFixed(1)},${y(q.e).toFixed(1)}`).join(' ');
  };
  const area = w
    ? `M0,${CH - PAD_BOTTOM} ` + pts.map((q) => `L${x(q.t).toFixed(1)},${y(q.e).toFixed(1)}`).join(' ') + ` L${w},${CH - PAD_BOTTOM} Z`
    : '';
  const nowIn = now >= t0 && now <= t1;
  const nowE = nowIn ? pts.reduce((b, q) => (Math.abs(q.t - now) < Math.abs(b.t - now) ? q : b)).e : 0;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => t0 + f * (t1 - t0));

  return (
    <Card padding={S.lg} style={{ gap: S.md }}>
      <View style={{ gap: 2, paddingHorizontal: 4 }}>
        <Txt v="footnote" color={C.label2}>
          {phase ? 'Now' : 'Energy'}
        </Txt>
        <Txt v="title2" color={phase ? PHASE_LOOK[phase.id].color : C.label}>
          {phase ? phase.label : 'Your day'}
        </Txt>
        <Txt v="subhead" color={C.label2}>
          {phase ? `${phase.tip} Until ${clockLabel(phase.end)}.` : 'Peaks and dips from your body clock.'}
        </Txt>
      </View>

      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: CH }}>
        {w > 0 ? (
          <Svg width={w} height={CH}>
            <Defs>
              <LinearGradient id={`fill${id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={C.yellow} stopOpacity={0.22} />
                <Stop offset="1" stopColor={C.indigo} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>
            <Path d={area} fill={`url(#fill${id})`} />
            {day.map((p) => (
              <Path
                key={p.id}
                d={segment(p)}
                stroke={PHASE_LOOK[p.id].color}
                strokeWidth={phase?.id === p.id ? 4 : 3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={phase && phase.id !== p.id ? 0.55 : 1}
              />
            ))}
            {nowIn ? (
              <>
                <Line x1={x(now)} x2={x(now)} y1={PAD_TOP - 6} y2={CH - PAD_BOTTOM} stroke={C.label3} strokeWidth={1} />
                <Circle cx={x(now)} cy={y(nowE)} r={7} fill={C.card} />
                <Circle cx={x(now)} cy={y(nowE)} r={5} fill={C.label} />
              </>
            ) : null}
            {ticks.map((t, i) => (
              <SvgText
                key={i}
                x={Math.max(14, Math.min(w - 14, x(t)))}
                y={CH - 4}
                fill={C.label3}
                fontSize={11}
                fontFamily={FONT.system}
                textAnchor="middle">
                {clockLabel(t)}
              </SvgText>
            ))}
          </Svg>
        ) : null}
      </View>

      <View>
        {day.map((p, i) => {
          const look = PHASE_LOOK[p.id];
          const on = phase?.id === p.id;
          const past = p.end <= now && !on;
          return (
            <View key={p.id}>
              {i ? <Divider inset={46} /> : null}
              <Pressy
                accessibilityRole="button"
                accessibilityLabel={`${p.label}, ${clockLabel(p.start)} to ${clockLabel(p.end)}`}
                onPress={() => setOpen(open === p.id ? undefined : p.id)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 4,
                  borderRadius: 12,
                  backgroundColor: on ? tint(look.color, 0.12) : undefined,
                  opacity: past ? 0.5 : 1,
                }}>
                <Row gap={S.md}>
                  <IconSquare icon={look.icon} color={look.color} />
                  <Txt v="body" weight={on ? '600' : '400'} style={{ flex: 1 }} numberOfLines={1}>
                    {p.label}
                  </Txt>
                  <Txt v="subhead" color={C.label2} tabular>
                    {clockLabel(p.start)}–{clockLabel(p.end)}
                  </Txt>
                </Row>
                {open === p.id || on ? (
                  <Txt v="footnote" color={C.label2} style={{ marginLeft: 42, marginTop: 2 }}>
                    {p.tip}
                  </Txt>
                ) : null}
              </Pressy>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
