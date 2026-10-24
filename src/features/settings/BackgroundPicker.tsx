/**
 * Settings > Background: three preview tiles, like the iOS Appearance picker.
 * Living colour (glows that follow the sun and each tab), Midnight (calm navy), True black (OLED).
 */
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { BACKDROP, C, R, S, SYS } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { actions } from '@/lib/store';
import { Pressy, Txt, type BackgroundStyle } from '@/ui';

const OPTIONS: { value: BackgroundStyle; label: string; colors: [string, string, ...string[]] }[] = [
  { value: 'living', label: 'Living colour', colors: [SYS.orange, SYS.pink, SYS.indigo, '#000000'] },
  { value: 'midnight', label: 'Midnight', colors: [BACKDROP.midnight.top, BACKDROP.midnight.mid, '#000000'] },
  { value: 'black', label: 'True black', colors: ['#000000', '#000000'] },
];

export const backgroundLabel = (v: string) => OPTIONS.find((o) => o.value === v)?.label ?? OPTIONS[0].label;

export function BackgroundPicker({ value }: { value: string }) {
  const current = OPTIONS.some((o) => o.value === value) ? value : 'living';
  return (
    <View style={styles.wrap}>
      {OPTIONS.map((o) => {
        const on = o.value === current;
        return (
          <View key={o.value} style={{ flex: 1 }}>
            <Pressy
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={o.label}
              scaleTo={0.94}
              onPress={() => {
                haptic.tap();
                actions.updateSettings({ background: o.value });
              }}
              style={styles.option}>
              <View
                style={[
                  styles.tile,
                  { borderColor: on ? C.tint : C.separator, borderWidth: on ? 2.5 : StyleSheet.hairlineWidth },
                ]}>
                <LinearGradient
                  colors={o.colors}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.75, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {/* a tiny screen: title bar and two cards */}
                <View style={styles.mock}>
                  <View style={[styles.bar, { width: '46%', backgroundColor: 'rgba(255,255,255,0.85)' }]} />
                  <View style={styles.card} />
                  <View style={[styles.card, { height: 18 }]} />
                </View>
              </View>
              <Txt v="footnote" weight={on ? '600' : '400'} color={on ? C.label : C.label2} align="center">
                {o.label}
              </Txt>
              <View style={[styles.radio, on ? { backgroundColor: C.tint, borderColor: C.tint } : null]}>
                {on ? <Check size={13} color="#000" strokeWidth={3.2} /> : null}
              </View>
            </Pressy>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: S.md, padding: S.lg, backgroundColor: C.card, borderRadius: R.card },
  option: { width: '100%', alignItems: 'center', gap: S.sm },
  tile: { width: '100%', aspectRatio: 0.62, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' },
  mock: { flex: 1, padding: 8, paddingTop: 14, gap: 6 },
  bar: { height: 6, borderRadius: 3, marginBottom: 4 },
  card: { height: 30, borderRadius: 7, backgroundColor: 'rgba(28,28,30,0.92)' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: C.label3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
