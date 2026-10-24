/**
 * Apple Health (and Garmin, through Health). A home-screen web app can't read HealthKit,
 * so an iOS Shortcut reads last nights' Sleep Analysis and copies it; one tap here imports it.
 */
import { Heart } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { C, S, tint } from '@/constants/theme';
import { SheetCard } from '@/features/today/parts';
import { haptic } from '@/lib/haptics';
import { importHealthText } from '@/lib/healthImport';
import { actions } from '@/lib/store';
import { Button, Field, IconWell, Row, Sheet, Txt } from '@/ui';

import { SLEEP_TINT } from './look';

export const HEALTH_PINK = C.pink;

export type ImportResult = { ok: true; nights: number; changed: number } | { ok: false; message: string };

/** Import from text. Saves, marks Health as set up, and says what happened. */
export function importText(text: string): ImportResult {
  const logs = importHealthText(text);
  if (!logs.length) return { ok: false, message: 'No sleep found. Run the Shortcut first, then try again.' };
  const changed = actions.importSleeps(logs);
  actions.updateSettings({ healthImport: true });
  return { ok: true, nights: logs.length, changed };
}

/** Read the clipboard and import. Call straight from a tap so Safari allows the read. */
export async function importFromClipboard(): Promise<ImportResult> {
  try {
    const text = Platform.OS === 'web' ? await navigator.clipboard.readText() : '';
    if (!text) return { ok: false, message: 'Clipboard is empty. Run the Shortcut first.' };
    return importText(text);
  } catch {
    return { ok: false, message: 'Couldn’t read the clipboard. Paste below instead.' };
  }
}

export const resultLine = (r: ImportResult) =>
  r.ok ? (r.changed ? `Imported ${r.changed} ${r.changed === 1 ? 'sleep' : 'sleeps'}.` : 'Already up to date.') : r.message;

const STEPS: [string, string][] = [
  ['Allow Garmin into Health', 'Health app, your photo, Apps, Garmin Connect, turn on Sleep. Skip this for Apple Watch.'],
  ['New Shortcut', 'Shortcuts app, +, name it "Get Gud sleep".'],
  ['Find Health Samples', 'Type Sleep Analysis. Start Date is in the last 3 days. Sort by Start Date.'],
  ['Repeat with Each', 'Inside it add a Text action: Start Date | End Date | Value. Tap each date, set Date Format to ISO 8601.'],
  ['Copy to Clipboard', 'After the repeat, add Combine Text (New Lines) on Repeat Results, then Copy to Clipboard.'],
  ['Make it automatic', 'Automation, Time of Day after you wake, Run Immediately, choose Get Gud sleep.'],
];

export function HealthSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [msg, setMsg] = useState<ImportResult | undefined>();
  const [paste, setPaste] = useState('');

  const show = (r: ImportResult) => {
    setMsg(r);
    if (r.ok) haptic.success();
    else haptic.warning();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Apple Health" detent="large">
      <View style={{ gap: S.lg }}>
        <Row gap={S.md} align="flex-start">
          <IconWell icon={Heart} color={HEALTH_PINK} />
          <Txt v="subhead" color={C.label2} style={{ flex: 1 }}>
            Sleep from Garmin, Apple Watch or any app that writes to Health. A Shortcut copies it, Get Gud imports it.
          </Txt>
        </Row>

        <Button
          title="Import from clipboard"
          icon={Heart}
          color={HEALTH_PINK}
          textColor="#FFFFFF"
          onPress={() => {
            importFromClipboard().then(show);
          }}
        />
        {msg ? (
          <View style={{ padding: S.md, borderRadius: 14, backgroundColor: tint(msg.ok ? C.green : C.orange, 0.14) }}>
            <Txt v="subhead">{resultLine(msg)}</Txt>
          </View>
        ) : null}

        <SheetCard title="Set up once">
          <View style={{ gap: S.md }}>
            {STEPS.map(([t, d], i) => (
              <Row key={t} gap={S.md} align="flex-start">
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: tint(SLEEP_TINT, 0.25), alignItems: 'center', justifyContent: 'center' }}>
                  <Txt v="footnote" weight="700" color={SLEEP_TINT}>
                    {i + 1}
                  </Txt>
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Txt v="body" weight="600">
                    {t}
                  </Txt>
                  <Txt v="footnote" color={C.label2}>
                    {d}
                  </Txt>
                </View>
              </Row>
            ))}
          </View>
        </SheetCard>

        <SheetCard title="Or paste">
          <View style={{ gap: S.sm }}>
            <Field value={paste} onChangeText={setPaste} placeholder="Paste the Shortcut output" multiline />
            <Button title="Import" kind="tinted" color={SLEEP_TINT} disabled={!paste.trim()} onPress={() => show(importText(paste))} />
          </View>
        </SheetCard>
      </View>
    </Sheet>
  );
}
