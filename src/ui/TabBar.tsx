/**
 * iOS 26-style floating Liquid Glass tab bar: a capsule above the content,
 * inset from the edges, with a glass highlight that springs to the active tab.
 */
import type { BottomTabBarProps } from 'expo-router/tabs';
import { BlurView } from 'expo-blur';
import { BookOpen, Moon, ShieldCheck, Sun, Wind, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { C, FONT, TABBAR } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

import { useInsets } from './insets';
import { useSpringValue } from './motion';

const TABS: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  index: { label: 'Today', icon: Sun, color: C.tint },
  gate: { label: 'Gate', icon: ShieldCheck, color: C.green },
  journal: { label: 'Journal', icon: BookOpen, color: C.blue },
  urge: { label: 'Urge', icon: Wind, color: C.cyan },
  sleep: { label: 'Sleep', icon: Moon, color: C.indigo },
};

export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useInsets();
  const [w, setW] = useState(0);
  const routes = state.routes.filter((r) => TABS[r.name]);
  const active = Math.max(0, routes.findIndex((r) => r.key === state.routes[state.index]?.key));
  const x = useSpringValue(active, 'snappy');
  const item = routes.length ? (w - 8) / routes.length : 0;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom - 8, 12) }]}>
      <View style={styles.shadow}>
        <BlurView intensity={70} tint="systemChromeMaterialDark" style={styles.bar}>
          <View style={styles.inner} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
            {w > 0 ? (
              <View
                style={[
                  styles.highlight,
                  { width: item, transform: [{ translateX: x * item }], backgroundColor: 'rgba(255,255,255,0.12)' },
                ]}
              />
            ) : null}
            {routes.map((route, i) => {
              const tab = TABS[route.name];
              const on = active === i;
              const I = tab.icon;
              const color = on ? tab.color : C.label;
              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={tab.label}
                  onPress={() => {
                    if (!on) haptic.tap();
                    navigateToTab(route.key);
                  }}
                  style={styles.item}>
                  <I size={24} color={color} strokeWidth={on ? 2.4 : 1.9} />
                  <Text style={[styles.label, { color, fontWeight: on ? '600' : '500' }]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: TABBAR.side, right: TABBAR.side, alignItems: 'center' },
  shadow: {
    width: '100%',
    maxWidth: 460,
    borderRadius: TABBAR.height / 2,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  bar: {
    height: TABBAR.height,
    borderRadius: TABBAR.height / 2,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: Platform.OS === 'web' ? 'rgba(30,30,32,0.62)' : undefined,
  },
  inner: { flex: 1, flexDirection: 'row', padding: 4 },
  highlight: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: (TABBAR.height - 8) / 2 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontFamily: FONT.system, fontSize: 10.5, letterSpacing: 0.1 },
});
