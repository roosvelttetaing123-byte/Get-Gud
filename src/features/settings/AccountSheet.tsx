/**
 * Your account, typed in: size in dollars, risk per trade, the two loss limits, the target,
 * minimum trading days and the hour your firm's day resets. Works on a draft: Done saves,
 * the close button discards. Blank or 0 turns a limit off; a blank size turns the account off.
 */
import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { C, FONT, S, SYS } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { actions, dayKey, getState, type Settings } from '@/lib/store';
import { Sheet, Txt } from '@/ui';

import { BARE_FIELD, DoneButton, SheetGroup } from './parts';

type Key = 'accountSize' | 'riskPct' | 'dailyLossPct' | 'maxLossPct' | 'targetPct' | 'minDays' | 'dayResetHour';

interface FieldSpec {
  key: Key;
  label: string;
  /** Shown before (prefix) or after (suffix) the number. */
  prefix?: string;
  suffix?: string;
  max: number;
  /** Decimals allowed in what you type. */
  decimal: boolean;
  placeholder: string;
}

const SIZE: FieldSpec = { key: 'accountSize', label: 'Account size', prefix: '$', max: 100_000_000, decimal: false, placeholder: '100,000' };
const RISK: FieldSpec[] = [
  { key: 'riskPct', label: 'Risk per trade', suffix: '%', max: 10, decimal: true, placeholder: '1' },
  { key: 'dailyLossPct', label: 'Daily loss limit', suffix: '%', max: 50, decimal: true, placeholder: '5' },
  { key: 'maxLossPct', label: 'Max loss', suffix: '%', max: 100, decimal: true, placeholder: '10' },
];
const GOALS: FieldSpec[] = [
  { key: 'targetPct', label: 'Profit target', suffix: '%', max: 100, decimal: true, placeholder: '10' },
  { key: 'minDays', label: 'Trading days', suffix: 'days', max: 365, decimal: false, placeholder: '4' },
  { key: 'dayResetHour', label: 'Day resets at', suffix: ':00', max: 23, decimal: false, placeholder: '0' },
];
const ALL = [SIZE, ...RISK, ...GOALS];

/** "100,000" for the size; plain numbers otherwise. */
function show(spec: FieldSpec, v: number): string {
  if (spec.key === 'accountSize') return v ? v.toLocaleString('en-US') : '';
  return String(v);
}

/** What you typed as a number: commas, spaces and $ ignored; a comma works as a decimal point too. */
export function parseEntry(text: string, decimal: boolean): number | null {
  let t = text.replace(/[\s$%]/g, '');
  // "1,5" (decimal comma) vs "100,000" (thousands): a comma followed by exactly 3 digits groups.
  t = decimal && /^\d*,\d{1,2}$/.test(t) ? t.replace(',', '.') : t.replace(/,/g, '');
  if (t === '') return 0;
  if (!/^\d*\.?\d*$/.test(t) || t === '.') return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return decimal ? Math.round(n * 100) / 100 : Math.round(n);
}

/** Remount it (a new `key`) each time it opens, so the draft starts from what's saved. */
export function AccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState<Record<Key, string>>(() => {
    const s = getState().settings;
    return Object.fromEntries(ALL.map((f) => [f.key, show(f, s[f.key])])) as Record<Key, string>;
  });
  const [bad, setBad] = useState<string | null>(null);

  const save = () => {
    const patch: Partial<Settings> = {};
    for (const f of ALL) {
      const n = parseEntry(draft[f.key], f.decimal);
      if (n === null || n > f.max) {
        setBad(`Check ${f.label.toLowerCase()}: a number up to ${f.max.toLocaleString('en-US')}.`);
        haptic.warning();
        return;
      }
      patch[f.key] = n;
    }
    if (!patch.riskPct) {
      setBad('Risk per trade needs a number above 0.');
      haptic.warning();
      return;
    }
    const s = getState().settings;
    // Turning the account on starts its first phase today, so old trades don't count.
    if (!s.accountSize && patch.accountSize && !s.accountStart) patch.accountStart = dayKey();
    actions.updateSettings(patch);
    haptic.success();
    onClose();
  };

  const set = (k: Key) => (text: string) => {
    setBad(null);
    setDraft((d) => ({ ...d, [k]: text }));
  };
  const row = (f: FieldSpec) => <EntryRow key={f.key} spec={f} value={draft[f.key]} onChange={set(f.key)} />;

  return (
    <Sheet visible={visible} onClose={onClose} title="Account" action={<DoneButton onPress={save} />}>
      <SheetGroup header="Account" footer="Leave it blank to turn the account off.">
        {row(SIZE)}
      </SheetGroup>
      <SheetGroup header="Risk" footer="A full 1R loss costs your risk per trade. 0 turns a limit off.">
        {RISK.map(row)}
      </SheetGroup>
      <SheetGroup header="Goals" footer="Day resets at: the hour your firm's day starts, your time (0 to 23).">
        {GOALS.map(row)}
      </SheetGroup>
      {bad ? (
        <Txt v="footnote" color={SYS.orange} style={{ paddingHorizontal: S.lg }}>
          {bad}
        </Txt>
      ) : null}
    </Sheet>
  );
}

/** Label on the left, the number on the right with its $ or % beside it, like iOS form cells. */
function EntryRow({ spec, value, onChange }: { spec: FieldSpec; value: string; onChange: (t: string) => void }) {
  // The box hugs its digits, so "$" and "%" sit right against the number.
  const chars = Math.max(1, (value || spec.placeholder).length);
  return (
    <View style={styles.row}>
      <Txt v="body" style={{ flex: 1 }} numberOfLines={1}>
        {spec.label}
      </Txt>
      <View style={styles.entry}>
        {spec.prefix ? <Txt v="body" color={C.label2}>{spec.prefix}</Txt> : null}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={spec.placeholder}
          placeholderTextColor={C.label3}
          selectionColor={C.tint}
          keyboardAppearance="dark"
          keyboardType={spec.decimal ? 'decimal-pad' : 'number-pad'}
          inputMode={spec.decimal ? 'decimal' : 'numeric'}
          returnKeyType="done"
          accessibilityLabel={spec.label}
          selectTextOnFocus
          {...BARE_FIELD}
          style={[styles.input, { width: Math.min(160, chars * 10.5 + 6) }]}
        />
        {spec.suffix ? (
          <Txt v="body" color={C.label2} style={spec.suffix.startsWith(':') ? { marginLeft: 1 } : { marginLeft: 3 }}>
            {spec.suffix}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: S.lg, gap: S.md },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    textAlign: 'right',
    fontFamily: FONT.rounded,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    color: C.label,
  },
});
