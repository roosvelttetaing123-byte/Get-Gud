/**
 * Settings, built like iOS Settings: a profile row on top, then inset grouped lists with
 * coloured icon squares, values, chevrons, steppers and switches. Changes save as you go.
 */
import Constants from 'expo-constants';
import { Image, type ImageSource } from 'expo-image';
import { router } from 'expo-router';
import {
  Bell,
  ChevronRight,
  Download,
  ListChecks,
  ListOrdered,
  Moon,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Timer,
  TrendingDown,
  Upload,
  Wind,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, S } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { actions, useStore, type Settings } from '@/lib/store';
import { Group, ListRow, Screen, Txt } from '@/ui';

import { Avatar } from './Avatar';
import { useConfirm } from './confirm';
import { ListEditorSheet } from './ListEditorSheet';
import { DoneButton, ValueStepper } from './parts';
import { ProfileSheet } from './ProfileSheet';
import { resetReminders, setReminder, useReminders } from './reminders';
import { RestDaysSheet, restDaysLabel } from './RestDaysSheet';
import { TimePill } from './TimePill';
import { useBackup } from './useBackup';

const VERSION = Constants.expoConfig?.version ?? '1.0.0';
const APP_ICON = require('@/assets/images/icon.png') as ImageSource;
const URGE_STEPS = [1, 3, 5];
const MAX_FREEZES = 3;

type SheetName = 'profile' | 'rules' | 'promises' | 'rest' | null;

const update = (patch: Partial<Settings>) => actions.updateSettings(patch);
const unit = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const minutes = (v: number) => (v ? unit(v, 'minute') : 'Off');
const count = (n: number) => (n ? String(n) : 'None');

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function SettingsScreen() {
  const { settings } = useStore();
  const reminders = useReminders();
  const { confirm, inform, dialog } = useConfirm();
  const { onExport, onImport, canImport, flash } = useBackup({ confirm, inform });
  const [sheet, setSheet] = useState<SheetName>(null);
  // A fresh draft every time the profile sheet opens.
  const [profileKey, setProfileKey] = useState(0);
  const hide = () => setSheet(null);

  // The urge timer steps through 1, 3 and 5 minutes; an older custom value stays reachable
  // until you step away from it.
  const urgeSteps = [...new Set([...URGE_STEPS, settings.urgeMinutes])].sort((a, b) => a - b);

  const confirmErase = () =>
    confirm({
      title: 'Erase everything?',
      message: 'Trades, check-ins, urges and settings are deleted from this iPhone. This can’t be undone.',
      confirmLabel: 'Erase',
      cancelLabel: 'Cancel',
      onConfirm: () => {
        actions.resetAll();
        resetReminders();
        router.replace('/onboarding');
      },
    });

  const replayIntro = () => {
    update({ onboarded: false });
    router.push('/onboarding');
  };

  return (
    <>
      <Screen modal title="Settings" accessory={<DoneButton onPress={close} />}>
        <Group>
          <ProfileRow
            name={settings.name}
            why={settings.why}
            onPress={() => {
              setProfileKey((k) => k + 1);
              setSheet('profile');
            }}
          />
        </Group>

        <Group header="Trading" footer="The gate uses these to say Clear, Wait or Stop.">
          <ListRow
            icon={ShieldCheck}
            iconColor={C.green}
            title="Trading rules"
            value={count(settings.rules.length)}
            chevron
            onPress={() => setSheet('rules')}
          />
          <ListRow
            icon={ListOrdered}
            iconColor={C.blue}
            title="Max trades per day"
            subtitle={unit(settings.maxTrades, 'trade')}
            accessory={
              <ValueStepper
                label="Max trades per day"
                value={settings.maxTrades}
                min={1}
                max={10}
                onChange={(maxTrades) => update({ maxTrades })}
              />
            }
          />
          <ListRow
            icon={TrendingDown}
            iconColor={C.red}
            title="Stop after losses in a row"
            subtitle={unit(settings.maxLossStreak, 'loss', 'losses')}
            accessory={
              <ValueStepper
                label="Stop after losses in a row"
                value={settings.maxLossStreak}
                min={1}
                max={5}
                onChange={(maxLossStreak) => update({ maxLossStreak })}
              />
            }
          />
          <ListRow
            icon={Timer}
            iconColor={C.orange}
            title="Cool-down after a loss"
            subtitle={minutes(settings.cooldownMin)}
            accessory={
              <ValueStepper
                label="Cool-down after a loss"
                value={settings.cooldownMin}
                min={0}
                max={120}
                step={5}
                onChange={(cooldownMin) => update({ cooldownMin })}
              />
            }
          />
        </Group>

        <Group header="Daily life" footer="Rest days never break your streak.">
          <ListRow
            icon={ListChecks}
            iconColor={C.orange}
            title="Promises"
            value={count(settings.promises.length)}
            chevron
            onPress={() => setSheet('promises')}
          />
          <ListRow
            icon={Moon}
            iconColor={C.indigo}
            title="Rest days"
            value={restDaysLabel(settings.restDays)}
            chevron
            onPress={() => setSheet('rest')}
          />
          <ListRow
            icon={Wind}
            iconColor={C.cyan}
            title="Urge timer"
            subtitle={minutes(settings.urgeMinutes)}
            accessory={
              <ValueStepper
                label="Urge timer"
                value={urgeSteps.indexOf(settings.urgeMinutes)}
                min={0}
                max={urgeSteps.length - 1}
                onChange={(i) => update({ urgeMinutes: urgeSteps[i] })}
              />
            }
          />
        </Group>

        <Group header="Streak" footer="A freeze covers a missed day for you. Earn one every 7 days in a row.">
          <ListRow
            icon={Snowflake}
            iconColor={C.cyan}
            title="Streak freezes"
            value={`${Math.min(MAX_FREEZES, settings.freezes)} of ${MAX_FREEZES}`}
          />
        </Group>

        <Group
          header="Reminders"
          footer="Notifications are coming soon. For now, add the app to your Home Screen and open it at these times.">
          <ListRow
            icon={Bell}
            iconColor={C.red}
            title="Morning check-in"
            accessory={<TimePill label="Morning check-in" value={reminders.morning} onChange={(t) => setReminder('morning', t)} />}
          />
          <ListRow
            icon={Bell}
            iconColor={C.pink}
            title="Close the day"
            accessory={<TimePill label="Close the day" value={reminders.evening} onChange={(t) => setReminder('evening', t)} />}
          />
        </Group>

        <Group header="Data" footer="Everything stays on this iPhone. No account, no cloud.">
          <ListRow
            icon={Download}
            iconColor={C.blue}
            title="Export backup"
            value={flash?.row === 'export' ? flash.text : undefined}
            onPress={onExport}
          />
          <ListRow
            icon={Upload}
            iconColor={C.blue}
            title="Import backup"
            subtitle={canImport ? undefined : 'Available in the web app'}
            value={flash?.row === 'import' ? flash.text : undefined}
            onPress={onImport}
          />
          <ListRow title="Erase everything" destructive onPress={confirmErase} />
        </Group>

        <Group header="About">
          <AppRow icon={APP_ICON} title="Get Gud" value={VERSION} />
          <ListRow icon={Sparkles} iconColor={C.purple} title="Replay intro" chevron onPress={replayIntro} />
        </Group>
      </Screen>

      <ProfileSheet key={profileKey} visible={sheet === 'profile'} onClose={hide} name={settings.name} why={settings.why} />
      <ListEditorSheet
        visible={sheet === 'rules'}
        onClose={hide}
        title="Trading rules"
        items={settings.rules}
        onChange={(rules) => update({ rules })}
        noun="rule"
        placeholder="Add rule"
        footer="Every rule must be ticked before the gate clears you."
        removeNote="The gate will stop asking for it."
        confirm={confirm}
      />
      <ListEditorSheet
        visible={sheet === 'promises'}
        onClose={hide}
        title="Promises"
        items={settings.promises}
        onChange={(promises) => update({ promises })}
        noun="promise"
        placeholder="Add promise"
        footer="Keep it to a few you can keep. Your Promises ring counts this list."
        removeNote="Your Promises ring stops counting it."
        confirm={confirm}
      />
      <RestDaysSheet visible={sheet === 'rest'} onClose={hide} days={settings.restDays} />
      {dialog}
    </>
  );
}

/** The Apple Account row: big avatar, name, one line under it, chevron. */
function ProfileRow({ name, why, onPress }: { name: string; why: string; onPress: () => void }) {
  const trimmed = name.trim();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={trimmed ? `${trimmed}, edit profile` : 'Add your name'}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.profile, pressed && { backgroundColor: C.fill4 }]}>
      <Avatar name={trimmed} size={60} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt v="title3" numberOfLines={1}>
          {trimmed || 'Add your name'}
        </Txt>
        <Txt v="footnote" color={C.label2} numberOfLines={2}>
          {why.trim() || 'And the reason you’re doing this'}
        </Txt>
      </View>
      <ChevronRight size={18} color={C.label3} strokeWidth={2.4} />
    </Pressable>
  );
}

/** A row led by the app's own icon, as iOS Settings lists apps. `icon` also tells Group to inset the separator. */
function AppRow({ icon, title, value }: { icon: ImageSource; title: string; value: string }) {
  return (
    <View style={styles.row}>
      <Image source={icon} style={styles.appIcon} contentFit="cover" accessibilityIgnoresInvertColors />
      <Txt v="body" style={{ flex: 1, paddingVertical: 12 }}>
        {title}
      </Txt>
      <Txt v="body" color={C.label2}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: S.lg, paddingHorizontal: S.lg, paddingVertical: S.md, minHeight: 84 },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, minHeight: 48 },
  appIcon: { width: 30, height: 30, borderRadius: 7 },
});
