/**
 * TimePill (iOS/Android): the iOS compact time picker pill. Tapping it opens a sheet with
 * hour and minute steppers (no date-picker module is installed). The web build uses
 * TimePill.web.tsx, a real <input type="time"> that opens Safari's time wheel.
 */
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { C } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { ListRow, Num, Sheet, Stepper } from '@/ui';

import { DoneButton, SheetGroup } from './parts';
import { joinTime, splitTime } from './reminders';

export interface TimePillProps {
  /** "HH:MM", 24-hour. */
  value: string;
  onChange: (time: string) => void;
  /** Accessible name, also the sheet title. */
  label: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function TimePill({ value, onChange, label }: TimePillProps) {
  const [open, setOpen] = useState(false);
  const [h, m] = splitTime(value);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
        onPress={() => {
          haptic.tap();
          setOpen(true);
        }}
        style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}>
        <Num size={17} weight="400">
          {value}
        </Num>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label} detent="medium" action={<DoneButton onPress={() => setOpen(false)} />}>
        <SheetGroup>
          <ListRow title="Hour" accessory={<Stepper value={h} min={0} max={23} format={pad} onChange={(v) => onChange(joinTime(v, m))} />} />
          <ListRow
            title="Minute"
            accessory={<Stepper value={m - (m % 5)} min={0} max={55} step={5} format={pad} onChange={(v) => onChange(joinTime(h, v))} />}
          />
        </SheetGroup>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  pill: { height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: C.fill3, alignItems: 'center', justifyContent: 'center' },
});
