import React, { useId, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

type Pt = { x: number; y: number };

/**
 * Smooth path through points with monotone cubic interpolation (Fritsch–Carlson),
 * so the curve never overshoots a real value between two trades.
 */
function smoothPath(p: Pt[]) {
  const n = p.length;
  if (n === 0) return '';
  if (n === 1) return `M${p[0].x},${p[0].y}`;
  if (n === 2) return `M${p[0].x},${p[0].y}L${p[1].x},${p[1].y}`;

  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = p[i + 1].x - p[i].x;
    m[i] = (p[i + 1].y - p[i].y) / dx[i];
  }
  const t: number[] = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }

  let d = `M${p[0].x},${p[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${p[i].x + h},${p[i].y + t[i] * h} ${p[i + 1].x - h},${p[i + 1].y - t[i + 1] * h} ${p[i + 1].x},${p[i + 1].y}`;
  }
  return d;
}

/**
 * Cumulative R as a sparkline: smooth line, soft gradient fill underneath,
 * a dashed zero line and a glowing dot on the latest value. Fills its parent's width.
 */
export function EquityCurve({
  values,
  color,
  height = 90,
  label,
  style,
}: {
  /** Cumulative R, oldest first, starting at 0. Fewer than two points draws only the zero line. */
  values: number[];
  color: string;
  height?: number;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [width, setWidth] = useState(0);
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');

  const top = 14;
  const bottom = 14;
  const padRight = 24;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const y = (v: number) => (max === min ? height / 2 : top + ((max - v) / span) * (height - top - bottom));
  const step = values.length > 1 ? (width - padRight) / (values.length - 1) : 0;
  const pts = values.map((v, i) => ({ x: i * step, y: y(v) }));
  const line = smoothPath(pts);
  const last = pts[pts.length - 1];
  const zeroY = y(0);

  return (
    <View
      style={[{ height }, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}>
      {width > 0 && values.length < 2 ? (
        // Nothing closed yet: just the zero line, waiting for the first result.
        <Svg width={width} height={height}>
          <Line
            x1={0}
            x2={width}
            y1={height / 2}
            y2={height / 2}
            stroke="rgba(242,245,251,0.35)"
            strokeWidth={1.5}
            strokeDasharray="3 5"
          />
        </Svg>
      ) : width > 0 && last ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={`fill${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.42} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Line
            x1={0}
            x2={width}
            y1={zeroY}
            y2={zeroY}
            stroke="rgba(242,245,251,0.28)"
            strokeWidth={1}
            strokeDasharray="3 5"
          />
          <Path d={`${line}L${last.x},${height}L0,${height}Z`} fill={`url(#fill${id})`} />
          <Line
            x1={last.x}
            x2={last.x}
            y1={last.y}
            y2={height}
            stroke={color}
            strokeOpacity={0.55}
            strokeWidth={1}
            strokeDasharray="2 4"
          />
          <Path d={line} stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Circle cx={last.x} cy={last.y} r={9} fill={color} opacity={0.25} />
          <Circle cx={last.x} cy={last.y} r={4.5} fill={color} stroke="rgba(242,245,251,0.9)" strokeWidth={1.5} />
        </Svg>
      ) : null}
    </View>
  );
}
