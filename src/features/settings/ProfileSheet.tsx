/**
 * Edit name and why, like editing an Apple Account card: avatar on top, grouped text cells.
 * Works on a draft: Done saves, the close button discards. Remount (key) to start a new draft.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { S } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { actions } from '@/lib/store';
import { Field, Sheet } from '@/ui';

import { Avatar } from './Avatar';
import { BARE_FIELD, DoneButton, SheetGroup } from './parts';

export function ProfileSheet({
  visible,
  onClose,
  name,
  why,
}: {
  visible: boolean;
  onClose: () => void;
  name: string;
  why: string;
}) {
  const [draftName, setDraftName] = useState(name);
  const [draftWhy, setDraftWhy] = useState(why);

  const save = () => {
    actions.updateSettings({ name: draftName.trim(), why: draftWhy.trim() });
    haptic.success();
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Profile" action={<DoneButton onPress={save} />}>
      <View style={{ alignItems: 'center', paddingTop: S.sm }}>
        <Avatar name={draftName} size={88} />
      </View>
      <SheetGroup header="Name">
        <Field
          value={draftName}
          onChangeText={setDraftName}
          placeholder="Your name"
          accessibilityLabel="Name"
          {...BARE_FIELD}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          style={styles.field}
        />
      </SheetGroup>
      <SheetGroup header="Your why" footer="Shown at the top of Today. Write it for the night you want to break a rule.">
        <Field
          value={draftWhy}
          onChangeText={setDraftWhy}
          placeholder="Pass the next payout without breaking a rule."
          accessibilityLabel="Your why"
          {...BARE_FIELD}
          multiline
          style={[styles.field, styles.multi]}
        />
      </SheetGroup>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: S.lg,
    paddingVertical: 13,
  },
  multi: { minHeight: 96, paddingTop: 13 },
});
