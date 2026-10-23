import { useCallback, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { C, R, S } from '@/constants/theme';
import { Button, Display, IconBadge, Sub, type LucideIcon } from '@/ui';

import { alpha } from './parts';

export type ConfirmAsk = {
  title: string;
  message: string;
  /** Shown as a quoted line above the message, e.g. the rule being removed. */
  quote?: string;
  confirmLabel: string;
  cancelLabel: string;
  icon: LucideIcon;
  onConfirm: () => void;
};

/**
 * Ask before a destructive change. Native uses the system alert; on the web build
 * react-native-web's Alert is a no-op, so an in-app dialog asks instead.
 */
export function useConfirm() {
  const [ask, setAsk] = useState<ConfirmAsk | null>(null);

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
    setAsk(a);
  }, []);

  const close = () => setAsk(null);
  const dialog = (
    <Modal visible={!!ask} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel={ask?.cancelLabel ?? 'Cancel'} style={StyleSheet.absoluteFill} onPress={close} />
        {ask ? (
          <View style={styles.card} accessibilityViewIsModal accessibilityRole="alert">
            <IconBadge icon={ask.icon} color={C.coral} bg={alpha(C.coral, 0.16)} size={48} />
            <Display size={22} weight="extra">
              {ask.title}
            </Display>
            {ask.quote ? (
              <View style={styles.quote}>
                <Sub color={C.mist}>{ask.quote}</Sub>
              </View>
            ) : null}
            <Sub>{ask.message}</Sub>
            <View style={{ gap: S.sm, marginTop: S.sm }}>
              <Button
                kind="danger"
                label={ask.confirmLabel}
                onPress={() => {
                  close();
                  ask.onConfirm();
                }}
              />
              <Button kind="secondary" label={ask.cancelLabel} onPress={close} />
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );

  return { confirm, dialog };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,8,16,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: S.gutter,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: C.surface,
    borderRadius: R.hero,
    borderWidth: 1,
    borderColor: C.line,
    padding: S.xl,
    gap: S.md,
  },
  quote: {
    backgroundColor: C.raised,
    borderRadius: R.control,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
  },
});
