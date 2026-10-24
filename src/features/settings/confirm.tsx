/**
 * Ask before a destructive change, or tell the user something, as an iOS alert.
 * Native uses the system alert. On the web build react-native-web's Alert is a no-op, so an
 * in-app alert in the iOS 26 style asks instead: left-aligned title and message, capsule buttons.
 */
import { type LucideIcon } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { C, FONT, S } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { Txt, useSpringValue } from '@/ui';

export type ConfirmAsk = {
  title: string;
  message: string;
  /** Shown as a quoted line above the message, e.g. the rule being removed. */
  quote?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Kept for callers; the iOS alert has no icon. */
  icon?: LucideIcon;
  onConfirm: () => void;
};

export type InformAsk = { title: string; message: string; okLabel?: string };

type Ask = { id: number } & (({ kind: 'confirm' } & ConfirmAsk) | ({ kind: 'inform' } & InformAsk));

export function useConfirm() {
  // `ask` stays set while the alert fades out, so its content doesn't vanish mid-fade.
  const [ask, setAsk] = useState<Ask | null>(null);
  const [open, setOpen] = useState(false);

  const confirm = useCallback((a: ConfirmAsk) => {
    if (Platform.OS !== 'web') {
      Alert.alert(
        a.title,
        a.quote ? `“${a.quote}”\n\n${a.message}` : a.message,
        [
          { text: a.cancelLabel, style: 'cancel' },
          { text: a.confirmLabel, style: 'destructive', onPress: a.onConfirm },
        ],
        { userInterfaceStyle: 'dark' },
      );
      return;
    }
    setAsk({ id: Date.now(), kind: 'confirm', ...a });
    setOpen(true);
  }, []);

  const inform = useCallback((a: InformAsk) => {
    if (Platform.OS !== 'web') {
      Alert.alert(a.title, a.message, [{ text: a.okLabel ?? 'OK' }], { userInterfaceStyle: 'dark' });
      return;
    }
    setAsk({ id: Date.now(), kind: 'inform', ...a });
    setOpen(true);
  }, []);

  const close = () => setOpen(false);

  // Mounted only while asking, with a fresh key per ask: react-native-web stacks modals in
  // the order they mount, so this keeps the alert above any open sheet.
  const dialog = ask ? (
    <Modal
      key={ask.id}
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={close}
      onDismiss={() => setAsk((a) => (a?.id === ask.id ? null : a))}>
      <View style={styles.backdrop}>
        <AlertCard ask={ask} close={close} />
      </View>
    </Modal>
  ) : null;

  return { confirm, inform, dialog };
}

function AlertCard({ ask, close }: { ask: Ask; close: () => void }) {
  // iOS alerts settle in from slightly larger.
  const p = useSpringValue(1, 'snappy', 0);
  const buttons =
    ask.kind === 'confirm'
      ? [
          { label: ask.cancelLabel, destructive: false, onPress: close },
          {
            label: ask.confirmLabel,
            destructive: true,
            onPress: () => {
              close();
              ask.onConfirm();
            },
          },
        ]
      : [{ label: ask.okLabel ?? 'OK', destructive: false, onPress: close }];
  // Side by side when both labels are short; stacked (action first, Cancel last) otherwise.
  const stacked = buttons.length > 1 && buttons.some((b) => b.label.length > 11);
  const ordered = stacked ? [...buttons].reverse() : buttons;

  return (
    <View
      style={[styles.card, { opacity: p, transform: [{ scale: 1.08 - 0.08 * p }] }]}
      accessibilityViewIsModal
      accessibilityRole="alert">
      <View style={{ gap: S.sm }}>
        <Txt v="headline">{ask.title}</Txt>
        {ask.kind === 'confirm' && ask.quote ? (
          <Txt v="subhead" color={C.label}>
            “{ask.quote}”
          </Txt>
        ) : null}
        <Txt v="subhead" color={C.label2}>
          {ask.message}
        </Txt>
      </View>
      <View style={[styles.buttons, stacked && { flexDirection: 'column' }]}>
        {ordered.map((b) => (
          <Pressable
            key={b.label}
            accessibilityRole="button"
            accessibilityLabel={b.label}
            onPress={() => {
              haptic.tap();
              b.onPress();
            }}
            style={({ pressed }) => [styles.btn, !stacked && { flex: 1 }, pressed && { backgroundColor: C.fill }]}>
            <Txt
              v="body"
              weight={b.destructive ? '600' : '500'}
              color={b.destructive ? C.red : C.label}
              numberOfLines={1}
              style={{ fontFamily: FONT.system }}>
              {b.label}
            </Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: S.xxxl,
  },
  card: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: C.card2,
    borderRadius: 34,
    paddingHorizontal: S.xl,
    paddingTop: 22,
    paddingBottom: S.lg,
    gap: S.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
  },
  buttons: { flexDirection: 'row', gap: S.sm, marginHorizontal: -4 },
  btn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: C.fill2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S.lg,
  },
});
