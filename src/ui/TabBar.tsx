import type { BottomTabBarProps } from 'expo-router/tabs';
import { BookOpen, House, ShieldCheck, Wind, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, F, TAB_BAR_HEIGHT } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

const TABS: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: 'Today', icon: House },
  gate: { label: 'Gate', icon: ShieldCheck },
  journal: { label: 'Journal', icon: BookOpen },
  urge: { label: 'Urge', icon: Wind },
};

export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, i) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const on = state.index === i;
        const color = on ? C.accent : C.faint;
        const I = tab.icon;
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
            <I size={23} color={color} strokeWidth={on ? 2.3 : 1.9} />
            <Text style={[styles.label, { color, fontFamily: on ? F.bold : F.semi }]}>{tab.label}</Text>
            <View style={[styles.dot, { opacity: on ? 1 : 0 }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(12,18,34,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 8,
  },
  item: { flex: 1, height: TAB_BAR_HEIGHT - 8, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 11.5, letterSpacing: 0.1 },
  dot: { width: 16, height: 3, borderRadius: 2, backgroundColor: C.accent, marginTop: 2 },
});
