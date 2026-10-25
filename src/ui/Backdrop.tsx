/**
 * Living colour background (iOS/Android): the same glows as Backdrop.web.tsx, drawn once with
 * SVG radial gradients. Static on native to save battery; the web build drifts them.
 */
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useNow } from '@/lib/useNow';
import { useStore } from '@/lib/store';

import { MIDNIGHT, glowFor, type BackdropTone } from './glow';

export function Backdrop({ tone }: { tone: BackdropTone }) {
  const { settings, days } = useStore();
  const [now] = useNow(60_000);
  const style = settings.background === 'midnight' || settings.background === 'black' ? settings.background : 'living';
  if (style === 'black' || tone === 'none') return null;

  if (style === 'midnight') {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="m" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={MIDNIGHT.top} />
              <Stop offset="0.46" stopColor={MIDNIGHT.mid} />
              <Stop offset="1" stopColor={MIDNIGHT.bottom} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#m)" />
        </Svg>
      </View>
    );
  }

  const d = new Date(now);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const glow = glowFor(tone, d, tone === 'today' ? days[key]?.checkin?.valence : undefined);
  if (!glow) return null;
  const blobs = [
    { cx: '22%', cy: '6%', rx: '62%', ry: '32%' },
    { cx: '82%', cy: '10%', rx: '58%', ry: '30%' },
    { cx: '50%', cy: '34%', rx: '60%', ry: '24%' },
  ];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          {glow.colors.map((c, i) => (
            <RadialGradient key={i} id={`g${i}`} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor={c} stopOpacity={glow.alpha[i]} />
              <Stop offset="0.45" stopColor={c} stopOpacity={glow.alpha[i] * 0.45} />
              <Stop offset="1" stopColor={c} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {blobs.map((b, i) => (
          <Ellipse key={i} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill={`url(#g${i})`} />
        ))}
        {glow.light ? (
          <>
            <Defs>
              <RadialGradient id="sun" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0" stopColor={glow.light.color} stopOpacity={glow.light.alpha} />
                <Stop offset="0.3" stopColor={glow.light.color} stopOpacity={glow.light.alpha * 0.42} />
                <Stop offset="1" stopColor={glow.light.color} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse
              cx={`${glow.light.x}%`}
              cy={`${glow.light.y}%`}
              rx={`${glow.light.size / 2}%`}
              ry={`${glow.light.size / 4}%`}
              fill="url(#sun)"
            />
          </>
        ) : null}
      </Svg>
    </View>
  );
}
