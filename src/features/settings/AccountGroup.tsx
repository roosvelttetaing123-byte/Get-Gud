/**
 * Settings > Account: the funded or challenge account, prop-firm style. Each row shows what's
 * set; tap any of them to type your own numbers in the Account sheet. "Start a new phase"
 * counts from today. Everything is worked out from the R you log; nothing connects to a broker.
 */
import { CalendarCheck, Clock, Flag, Percent, RotateCcw, ShieldAlert, TrendingDown, Wallet } from 'lucide-react-native';
import React, { useState } from 'react';

import { C } from '@/constants/theme';
import { fmtPct } from '@/lib/account';
import { actions, dayKey, type Settings } from '@/lib/store';
import { Group, ListRow } from '@/ui';

import { AccountSheet } from './AccountSheet';
import type { ConfirmAsk } from './confirm';

const money = (n: number) => (n ? `$${n.toLocaleString('en-US')}` : 'Not set');
const pctOrOff = (p: number) => (p > 0 ? fmtPct(p, false) : 'Off');
const startLabel = (key: string) => {
  if (!key) return 'All trades';
  const [y, m, d] = key.split('-').map(Number);
  return `Since ${new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
};

export function AccountGroup({ settings, confirm }: { settings: Settings; confirm: (a: ConfirmAsk) => void }) {
  // A new key per open, so the sheet's draft starts from what's saved.
  const [open, setOpen] = useState(0);
  const [visible, setVisible] = useState(false);
  const edit = () => {
    setOpen((n) => n + 1);
    setVisible(true);
  };
  const on = settings.accountSize > 0;
  const field = (icon: typeof Wallet, color: string, title: string, value: string) => (
    <ListRow icon={icon} iconColor={color} title={title} value={value} chevron onPress={edit} />
  );
  return (
    <>
      <Group
        header="Account"
        footer={
          on
            ? 'Worked out from the R you log. A Stop comes before one more loss would break a limit.'
            : 'Type in your account size to track the target, daily loss and max loss.'
        }>
        {field(Wallet, C.tint, 'Account size', money(settings.accountSize))}
        {on ? field(Percent, C.blue, 'Risk per trade', fmtPct(settings.riskPct, false)) : null}
        {on ? field(TrendingDown, C.orange, 'Daily loss limit', pctOrOff(settings.dailyLossPct)) : null}
        {on ? field(ShieldAlert, C.red, 'Max loss', pctOrOff(settings.maxLossPct)) : null}
        {on ? field(Flag, C.green, 'Profit target', pctOrOff(settings.targetPct)) : null}
        {on ? field(CalendarCheck, C.teal, 'Min trading days', settings.minDays ? String(settings.minDays) : 'Off') : null}
        {on ? field(Clock, C.gray, 'Day resets at', `${String(settings.dayResetHour).padStart(2, '0')}:00`) : null}
        {on ? (
          <ListRow
            icon={RotateCcw}
            iconColor={C.indigo}
            title="Start a new phase"
            value={startLabel(settings.accountStart)}
            chevron
            onPress={() =>
              confirm({
                title: 'Start a new phase?',
                message: 'Target, limits and days count from today. Your journal keeps every trade.',
                confirmLabel: 'Start today',
                cancelLabel: 'Cancel',
                onConfirm: () => actions.updateSettings({ accountStart: dayKey() }),
              })
            }
          />
        ) : null}
      </Group>
      <AccountSheet key={open} visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}
