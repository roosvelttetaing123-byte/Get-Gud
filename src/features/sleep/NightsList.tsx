/**
 * Your logged nights, newest first: the last few, then "Show all". Tap one to edit it.
 * The chart above already gives the quick look, so this list stays short until you ask.
 */
import { useState } from 'react';

import { C, S } from '@/constants/theme';
import { asleepHours, fmtDur, isNap } from '@/lib/sleep';
import type { SleepLog } from '@/lib/store';
import { Group, ListRow, Txt } from '@/ui';

import { dayName, nightLine } from './format';

const FIRST = 3;

export function NightsList({ logs, onOpen }: { logs: SleepLog[]; onOpen: (l: SleepLog) => void }) {
  const [all, setAll] = useState(false);
  if (!logs.length) {
    return (
      <Txt v="subhead" color={C.label2} style={{ paddingHorizontal: S.lg }}>
        Use sleep mode tonight, or add a night by hand.
      </Txt>
    );
  }
  const shown = all ? logs : logs.slice(0, FIRST);
  return (
    <Group>
      {shown.map((l) => (
        <ListRow
          key={l.id}
          title={isNap(l) ? `Nap, ${dayName(l.wake)}` : dayName(l.wake)}
          subtitle={nightLine(l)}
          value={fmtDur(asleepHours(l))}
          chevron
          onPress={() => onOpen(l)}
        />
      ))}
      {logs.length > FIRST ? (
        <ListRow title={all ? 'Show less' : `Show all ${logs.length}`} titleColor={C.tint} onPress={() => setAll(!all)} />
      ) : null}
    </Group>
  );
}
