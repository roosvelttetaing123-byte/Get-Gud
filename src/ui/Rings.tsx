/**
 * Activity-style rings: three concentric arcs with an angular colour sweep and round caps.
 * The sweep is drawn as short arc segments with interpolated colour (SVG has no conic gradient).
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { RING, type RingKey } from '@/constants/theme';

import { useSpringValue } from './motion';

const SEGMENTS = 72;

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  // angles in radians, 0 = 12 o'clock, clockwise
  const p = (a: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

export function Ring({
  value,
  size,
  stroke,
  from,
  to,
  track,
  cx,
  cy,
}: {
  value: number;
  size: number;
  stroke: number;
  from: string;
  to: string;
  track: string;
  cx?: number;
  cy?: number;
}) {
  const r = (size - stroke) / 2;
  const x = cx ?? size / 2;
  const y = cy ?? size / 2;
  const v = Math.max(0, Math.min(1, value));
  const total = v * Math.PI * 2;
  const n = Math.max(1, Math.ceil(SEGMENTS * v));
  const segs = useMemo(() => {
    if (v <= 0.001) return [];
    const out: { d: string; color: string }[] = [];
    for (let i = 0; i < n; i++) {
      const a0 = (total * i) / n;
      const a1 = Math.min(total, (total * (i + 1)) / n + 0.01); // overlap hides seams
      out.push({ d: arcPath(x, y, r, a0, a1), color: mix(from, to, (i + 0.5) / n) });
    }
    return out;
  }, [v, n, total, x, y, r, from, to]);

  const end = [x + r * Math.sin(total), y - r * Math.cos(total)];
  return (
    <G>
      <Circle cx={x} cy={y} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      {segs.map((s, i) => (
        <Path key={i} d={s.d} stroke={s.color} strokeWidth={stroke} fill="none" strokeLinecap="butt" />
      ))}
      {v > 0.001 ? (
        <>
          <Circle cx={x} cy={y - r} r={stroke / 2} fill={from} />
          {/* tip: soft shadow then the cap, like Fitness */}
          <Circle cx={end[0]} cy={end[1]} r={stroke / 2 + 1.5} fill="rgba(0,0,0,0.35)" />
          <Circle cx={end[0]} cy={end[1]} r={stroke / 2} fill={mix(from, to, 1)} />
        </>
      ) : null}
    </G>
  );
}

/** Three concentric rings. Values 0..1. Animates in with a smooth spring. */
export function Rings({
  values,
  size = 196,
  stroke = 22,
  gap = 4,
  children,
  order = ['promises', 'mind', 'discipline'],
}: {
  values: Record<RingKey, number>;
  size?: number;
  stroke?: number;
  gap?: number;
  children?: React.ReactNode;
  order?: RingKey[];
}) {
  const a = useSpringValue(values[order[0]], 'smooth', 0);
  const b = useSpringValue(values[order[1]], 'smooth', 0);
  const c = useSpringValue(values[order[2]], 'smooth', 0);
  const anim = [a, b, c];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {order.map((k, i) => {
          const inner = size - i * 2 * (stroke + gap);
          return (
            <Ring
              key={k}
              value={anim[i]}
              size={inner}
              stroke={stroke}
              from={RING[k].from}
              to={RING[k].to}
              track={RING[k].track}
              cx={size / 2}
              cy={size / 2}
            />
          );
        })}
      </Svg>
      {children}
    </View>
  );
}

/** A single small ring (e.g. week strip, a stat). */
export function MiniRing({
  value,
  size = 34,
  stroke = 5,
  ring = 'promises',
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  ring?: RingKey;
  children?: React.ReactNode;
}) {
  const v = useSpringValue(value, 'smooth', 0);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Ring value={v} size={size} stroke={stroke} from={RING[ring].from} to={RING[ring].to} track={RING[ring].track} />
      </Svg>
      {children}
    </View>
  );
}

/** Generic coloured progress ring (timers, scores). */
export function ProgressRing({
  value,
  size = 64,
  stroke = 7,
  from,
  to,
  track = 'rgba(120,120,128,0.24)',
  animate = true,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  from: string;
  to?: string;
  track?: string;
  animate?: boolean;
  children?: React.ReactNode;
}) {
  const sv = useSpringValue(value, 'smooth', animate ? 0 : value);
  const v = animate ? sv : value;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Ring value={v} size={size} stroke={stroke} from={from} to={to ?? from} track={track} />
      </Svg>
      {children}
    </View>
  );
}
