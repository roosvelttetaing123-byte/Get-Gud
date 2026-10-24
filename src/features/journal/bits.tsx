/**
 * Small journal pieces built in the kit's style: feeling tags, progress dots, a live clock.
 */
import type { LucideIcon } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import { C, FONT, R, tint } from '@/constants/theme';

import { feelingLook } from './look';

/** Compact, non-interactive capsule for a feeling (entry cards, recaps). `quiet` keeps colour on the icon only. */
export function Tag({ label, color, icon: I, quiet }: { label: string; color: string; icon?: LucideIcon; quiet?: boolean }) {
  return (
    <View style={[styles.tag, { backgroundColor: quiet ? C.fill4 : tint(color, 0.16) }]}>
      {I ? <I size={12} color={color} strokeWidth={2.4} /> : null}
      <Text style={[styles.tagText, { color: quiet ? C.label2 : color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function FeelingTags({ feelings, size = 'sm' }: { feelings: string[]; size?: 'sm' | 'md' }) {
  if (!feelings.length) return null;
  return (
    <View style={styles.wrap}>
      {feelings.map((f) => {
        const look = feelingLook(f);
        return size === 'sm' ? (
          <Tag key={f} label={f} color={look.color} icon={look.icon} />
        ) : (
          <View key={f} style={[styles.tagMd, { backgroundColor: tint(look.color, 0.16) }]}>
            <look.icon size={15} color={look.color} strokeWidth={2.3} />
            <Text style={[styles.tagMdText, { color: look.color }]}>{f}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Progress dots, Fitness-style: filled for done, hollow for still to go. */
export function Dots({ done, total, color = C.tint }: { done: number; total: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`${done} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            width: 22,
            height: 6,
            borderRadius: 3,
            backgroundColor: i < done ? color : C.fill3,
          }}
        />
      ))}
    </View>
  );
}

/** Current time as state: refreshed each minute and when the app comes back to the foreground. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, intervalMs);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [intervalMs]);
  return now;
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: R.pill,
  },
  tagText: { fontFamily: FONT.system, fontSize: 12, fontWeight: '600' },
  tagMd: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 12, borderRadius: R.pill },
  tagMdText: { fontFamily: FONT.system, fontSize: 15, fontWeight: '600' },
});
