/**
 * Settings > Account: the funded or challenge account, prop-firm style. Size, risk per trade,
 * the two loss limits, the target and minimum days, and "Start a new phase" (counts from today).
 * Everything is worked out from the R you log; nothing connects to a broker.
 */
import { CalendarCheck, Clock, Flag, Percent, RotateCcw, ShieldAlert, TrendingDown, Wallet } from 'lucide-react-native';
import React from 'react';

import { C } from '@/constants/theme';
import { fmtPct } from '@/lib/account';
import { actions, dayKey, type Settings } from '@/lib/store';
import { Group, ListRow } from '@/ui';

import type { ConfirmAsk } from './confirm';
import { ValueStepper } from './parts';

/** Common account sizes; 0 = not set up. */
export const SIZES = [0, 5000, 10000, 15000, 25000, 50000, 75000, 100000, 150000, 200000, 300000, 400000];

const update = (patch: Partial<Settings>) => actions.updateSettings(patch);
const money = (n: number) => (n ? `$${n.toLocaleString('en-US')}` : 'Not set');
const pctOrOff = (p: number) => (p > 0 ? fmtPct(p, false) : 'Off');
const startLabel = (key: string) => {
  if (!key) return 'All trades';
  const [y, m, d] = key.split('-').map(Number);
  return `Since ${new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
};

export function AccountGroup({ settings, confirm }: { settings: Settings; confirm: (a: ConfirmAsk) => void }) {
  const sizeIdx = Math.max(0, SIZES.indexOf(settings.accountSize));
  const on = settings.accountSize > 0;
  return (
    <Group
      header="Account"
      footer={
        on
          ? 'Worked out from the R you log. A Stop comes before one more loss would break a limit.'
          : 'Set your account size to track the target, daily loss and max loss.'
      }>
      <ListRow
        icon={Wallet}
        iconColor={C.tint}
        title="Account size"
        subtitle={money(settings.accountSize)}
        accessory={
          <ValueStepper
            label="Account size"
            value={sizeIdx}
            min={0}
            max={SIZES.length - 1}
            onChange={(i) =>
              // Turning the account on starts its first phase today, so old trades don't count.
              update(!on && !settings.accountStart ? { accountSize: SIZES[i], accountStart: dayKey() } : { accountSize: SIZES[i] })
            }
          />
        }
      />
      {on ? (
        <>
          <ListRow
            icon={Percent}
            iconColor={C.blue}
            title="Risk per trade"
            subtitle={`${fmtPct(settings.riskPct, false)} a full loss`}
            accessory={
              <ValueStepper label="Risk per trade" value={settings.riskPct} min={0.25} max={3} step={0.25} onChange={(riskPct) => update({ riskPct })} />
            }
          />
          <ListRow
            icon={TrendingDown}
            iconColor={C.orange}
            title="Daily loss limit"
            subtitle={pctOrOff(settings.dailyLossPct)}
            accessory={
              <ValueStepper label="Daily loss limit" value={settings.dailyLossPct} min={0} max={10} step={0.5} onChange={(dailyLossPct) => update({ dailyLossPct })} />
            }
          />
          <ListRow
            icon={Clock}
            iconColor={C.gray}
            title="Day resets at"
            subtitle={`${String(settings.dayResetHour).padStart(2, '0')}:00 your time`}
            accessory={
              <ValueStepper label="Day resets at" value={settings.dayResetHour} min={0} max={23} onChange={(dayResetHour) => update({ dayResetHour })} />
            }
          />
          <ListRow
            icon={ShieldAlert}
            iconColor={C.red}
            title="Max loss"
            subtitle={pctOrOff(settings.maxLossPct)}
            accessory={
              <ValueStepper label="Max loss" value={settings.maxLossPct} min={0} max={20} step={1} onChange={(maxLossPct) => update({ maxLossPct })} />
            }
          />
          <ListRow
            icon={Flag}
            iconColor={C.green}
            title="Profit target"
            subtitle={pctOrOff(settings.targetPct)}
            accessory={
              <ValueStepper label="Profit target" value={settings.targetPct} min={0} max={20} step={1} onChange={(targetPct) => update({ targetPct })} />
            }
          />
          <ListRow
            icon={CalendarCheck}
            iconColor={C.teal}
            title="Min trading days"
            subtitle={settings.minDays ? `${settings.minDays} days` : 'Off'}
            accessory={
              <ValueStepper label="Min trading days" value={settings.minDays} min={0} max={30} onChange={(minDays) => update({ minDays })} />
            }
          />
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
                onConfirm: () => update({ accountStart: dayKey() }),
              })
            }
          />
        </>
      ) : null}
    </Group>
  );
}
