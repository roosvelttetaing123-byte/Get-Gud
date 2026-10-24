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
import { GIST_FILE, gistId, syncHealth } from '@/lib/healthSync';
import { actions, getState, useStore } from '@/lib/store';
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
  ['Make a secret gist', `gist.github.com, file name ${GIST_FILE}, any text, Create secret gist. Paste its link above.`],
  ['Make a token', 'GitHub, Settings, Developer settings, Fine-grained tokens. Only Gists: Read and write. Set an expiry.'],
  ['New Shortcut', 'Shortcuts app, +, name it "Get Gud sleep". Add Find Health Samples: Sleep Analysis, Start Date in the last 3 days, sort by Start Date.'],
  ['Format each sample', 'Repeat with Each, inside a Text action: Start Date|End Date|Value. Set both dates to ISO 8601. After it, Combine Text with New Lines.'],
  ['Send it', `Get Contents of URL: api.github.com/gists/your-gist-id, Method PATCH. Header Authorization: Bearer your-token. JSON body: files, then ${GIST_FILE}, then content = Combined Text.`],
  ['Run it every morning', 'Automation, Time of Day about an hour after you wake, Run Immediately, Get Gud sleep. Add a second one at noon if Garmin syncs late.'],
];

const ago = (ts: number) => {
  const m = Math.round((Date.now() - ts) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};

export function HealthSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [msg, setMsg] = useState<ImportResult | undefined>();
  const [paste, setPaste] = useState('');
  const { settings, healthSync } = useStore();
  const [link, setLink] = useState(settings.healthGist);
  const [busy, setBusy] = useState(false);
  const valid = !!gistId(link);
  const saved = !!settings.healthGist && gistId(settings.healthGist) === gistId(link);

  const connect = () => {
    actions.updateSettings({ healthGist: gistId(link) ?? '' });
    setBusy(true);
    syncHealth(true).finally(() => {
      setBusy(false);
      const r = getState().healthSync;
      if (r?.ok) haptic.success();
      else haptic.warning();
    });
  };

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
            Sleep from Garmin, Apple Watch or any app that writes to Health. A Shortcut sends it each morning, Get Gud picks it up when you open it.
          </Txt>
        </Row>

        <SheetCard title="Automatic sync">
          <View style={{ gap: S.sm }}>
            <Field
              value={link}
              onChangeText={setLink}
              placeholder="Secret gist link"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Button
              title={busy ? 'Syncing' : saved ? 'Sync now' : 'Connect'}
              color={HEALTH_PINK}
              textColor="#FFFFFF"
              disabled={!valid || busy}
              onPress={connect}
            />
            {saved && healthSync ? (
              <Txt v="footnote" color={healthSync.ok ? C.label2 : C.orange}>
                {`${healthSync.message} Checked ${ago(healthSync.at)}.`}
                {healthSync.dataAt ? ` Shortcut last sent ${ago(healthSync.dataAt)}.` : ''}
              </Txt>
            ) : (
              <Txt v="footnote" color={C.label2}>
                Pulls every time you open Get Gud. Nothing to tap.
              </Txt>
            )}
            {saved ? (
              <Button
                title="Turn off"
                kind="plain"
                size="small"
                color={C.label2}
                onPress={() => {
                  actions.updateSettings({ healthGist: '' });
                  setLink('');
                }}
              />
            ) : null}
          </View>
        </SheetCard>

        <Button
          title="Import from clipboard"
          icon={Heart}
          kind="tinted"
          color={HEALTH_PINK}
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
