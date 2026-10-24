/** Rest days: one switch per weekday, Monday first (like the week strip on Today). */
import { actions } from '@/lib/store';
import { Sheet, ToggleRow } from '@/ui';

import { DoneButton, SheetGroup } from './parts';

/** Weekday numbers (0 = Sunday), Monday first. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** iOS alarm "Repeat" style: None, Weekends, Weekdays, Every day, or short names. */
export function restDaysLabel(days: number[]): string {
  const set = new Set(days);
  if (set.size === 0) return 'None';
  if (set.size === 7) return 'Every day';
  if (set.size === 2 && set.has(0) && set.has(6)) return 'Weekends';
  if (set.size === 5 && !set.has(0) && !set.has(6)) return 'Weekdays';
  if (set.size > 3) return `${set.size} days`;
  return WEEK.filter((d) => set.has(d))
    .map((d) => NAMES[d].slice(0, 3))
    .join(', ');
}

export function RestDaysSheet({ visible, onClose, days }: { visible: boolean; onClose: () => void; days: number[] }) {
  const toggle = (d: number, on: boolean) => {
    const next = on ? [...new Set([...days, d])] : days.filter((x) => x !== d);
    actions.updateSettings({ restDays: next.sort((a, b) => a - b) });
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Rest days" action={<DoneButton onPress={onClose} />}>
      <SheetGroup footer="Days off from trading and training. Your streak skips them, so they never break it.">
        {WEEK.map((d) => (
          <ToggleRow key={d} title={NAMES[d]} value={days.includes(d)} onChange={(on) => toggle(d, on)} />
        ))}
      </SheetGroup>
    </Sheet>
  );
}
