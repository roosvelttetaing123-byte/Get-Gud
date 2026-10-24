/**
 * Edit a list of short strings (trading rules, daily promises) the way iOS edit mode does:
 * a red minus on each row to delete (with a confirm, since deleting a rule mid-session is the
 * move this app exists to slow down) and a green plus row at the bottom to add. Duplicates are
 * blocked. Changes save as you go; Done just closes.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, S } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { Button, Field, Sheet, Txt } from '@/ui';

import type { ConfirmAsk } from './confirm';
import { BARE_FIELD, DoneButton, EDIT_INSET, EditBadge, SheetGroup } from './parts';

export function ListEditorSheet({
  visible,
  onClose,
  title,
  items,
  onChange,
  noun,
  placeholder,
  footer,
  removeNote,
  confirm,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: string[];
  onChange: (next: string[]) => void;
  /** Singular, lower case: "rule", "promise". */
  noun: string;
  placeholder: string;
  footer: string;
  /** Second line of the remove confirmation. */
  removeNote: string;
  confirm: (ask: ConfirmAsk) => void;
}) {
  const [draft, setDraft] = useState('');
  const text = draft.trim();
  const dupe = text.length > 0 && items.some((i) => i.trim().toLowerCase() === text.toLowerCase());
  const canAdd = text.length > 0 && !dupe;

  const add = () => {
    if (!canAdd) return;
    haptic.success();
    onChange([...items, text]);
    setDraft('');
  };

  const remove = (index: number) =>
    confirm({
      title: `Remove this ${noun}?`,
      quote: items[index],
      message: removeNote,
      confirmLabel: 'Remove',
      cancelLabel: 'Keep it',
      onConfirm: () => onChange(items.filter((_, j) => j !== index)),
    });

  const close = () => {
    setDraft('');
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={close} title={title} action={<DoneButton onPress={close} />}>
      <SheetGroup
        inset={EDIT_INSET}
        footer={dupe ? 'That one is already on the list.' : footer}
        footerColor={dupe ? C.orange : C.label2}>
        {items.map((item, i) => (
          <View key={`${i}:${item}`} style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${noun}: ${item}`}
              hitSlop={{ top: 12, bottom: 12, left: 16, right: 12 }}
              onPress={() => {
                haptic.tap();
                remove(i);
              }}
              style={({ pressed }) => pressed && { opacity: 0.6 }}>
              <EditBadge kind="delete" />
            </Pressable>
            <Txt v="body" style={styles.text}>
              {item}
            </Txt>
          </View>
        ))}
        <View key="add" style={styles.row}>
          <EditBadge kind="insert" />
          <View style={{ flex: 1 }}>
            <Field
              value={draft}
              onChangeText={setDraft}
              placeholder={placeholder}
              accessibilityLabel={`New ${noun}`}
              {...BARE_FIELD}
              autoCapitalize="sentences"
              returnKeyType="done"
              submitBehavior={canAdd ? 'submit' : 'blurAndSubmit'}
              onSubmitEditing={add}
              style={styles.field}
            />
          </View>
          {text ? (
            <Button
              title="Add"
              kind="plain"
              size="medium"
              full={false}
              disabled={!canAdd}
              onPress={add}
              style={{ height: 36, paddingHorizontal: 6, marginRight: -6 }}
            />
          ) : null}
        </View>
      </SheetGroup>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, minHeight: 48 },
  text: { flex: 1, paddingVertical: 13 },
  field: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 13,
  },
});
