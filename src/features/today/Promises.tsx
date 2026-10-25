/**
 * Today's promises as iOS switch rows. Each row has its own colour square; ticking the
 * last one plays the success haptic (the Promises ring closes with a bouncy spring).
 */
import { router } from 'expo-router';
import { Target } from 'lucide-react-native';
import React from 'react';

import { haptic } from '@/lib/haptics';
import { actions } from '@/lib/store';
import { Empty, Group, Section, ToggleRow } from '@/ui';

import { promiseColor, promiseIcon } from './visuals';

const openSettings = () => router.push('/settings');

/** Set one promise kept or not. The one that closes the ring gets the success haptic. */
export function setPromise(dayKey: string, promises: string[], kept: Record<string, boolean>, p: string, next: boolean) {
  if (!!kept[p] === next) return;
  const completes = next && promises.every((x) => x === p || kept[x]);
  actions.togglePromise(dayKey, p);
  if (completes) haptic.success();
}

export function Promises({ dayKey, promises, kept }: { dayKey: string; promises: string[]; kept: Record<string, boolean> }) {
  if (!promises.length) {
    return (
      <Section title="Promises">
        <Empty
          icon={Target}
          title="No promises yet"
          message="Two to four things that make a good day."
          action={{ label: 'Add promises', onPress: openSettings }}
        />
      </Section>
    );
  }

  const n = promises.filter((p) => kept[p]).length;
  const all = n === promises.length;

  return (
    <Section title="Promises" action={{ label: 'Edit', onPress: openSettings }}>
      <Group footer={all ? `All ${n} kept. Ring closed.` : `${n} of ${promises.length} kept`}>
        {promises.map((p, i) => (
          <ToggleRow
            key={p}
            icon={promiseIcon(p)}
            iconColor={promiseColor(i)}
            title={p}
            value={!!kept[p]}
            onChange={(v) => setPromise(dayKey, promises, kept, p, v)}
          />
        ))}
      </Group>
    </Section>
  );
}
