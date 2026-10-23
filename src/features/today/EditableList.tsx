import { Plus, Trash2, X, type LucideIcon } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { C, S } from '@/constants/theme';
import type { ConfirmAsk } from '@/features/settings/confirm';
import { InsetDivider, RemoveButton, alpha } from '@/features/settings/parts';
import { Body, Button, Card, Divider, Field, IconBadge, Row, Small, Sub } from '@/ui';

/**
 * A grouped card of short strings (trading rules, daily promises): one row per item with a badge
 * and a remove button, and an add row at the bottom.
 * Removal asks first: deleting a rule mid-session is exactly the move this app exists to slow down.
 */
export function EditableList({
  items,
  onChange,
  noun,
  placeholder,
  empty,
  emptyIcon,
  removeNote,
  badge,
  confirm,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  /** Singular, lower case: "rule", "promise". */
  noun: string;
  placeholder: string;
  /** Shown when the list is empty. Tell the user what to do next. */
  empty: string;
  emptyIcon: LucideIcon;
  /** Second line of the remove confirmation. */
  removeNote: string;
  /** The badge on the left of each row. */
  badge: (item: string, index: number) => React.ReactNode;
  confirm: (ask: ConfirmAsk) => void;
}) {
  const [draft, setDraft] = useState('');
  const text = draft.trim();
  const dupe = text.length > 0 && items.some((i) => i.toLowerCase() === text.toLowerCase());
  const canAdd = text.length > 0 && !dupe;

  const add = () => {
    if (!canAdd) return;
    onChange([...items, text]);
    setDraft('');
  };

  const remove = (item: string) =>
    confirm({
      title: `Remove this ${noun}?`,
      quote: item,
      message: removeNote,
      confirmLabel: `Remove ${noun}`,
      cancelLabel: 'Keep it',
      icon: Trash2,
      onConfirm: () => onChange(items.filter((i) => i !== item)),
    });

  return (
    <Card style={styles.card}>
      {items.length ? (
        items.map((item, i) => (
          <Fragment key={item}>
            {i > 0 ? <InsetDivider /> : null}
            <Row gap={S.md} style={styles.item}>
              {badge(item, i)}
              <Body style={{ flex: 1 }}>{item}</Body>
              <RemoveButton icon={X} label={`Remove ${noun}: ${item}`} onPress={() => remove(item)} />
            </Row>
          </Fragment>
        ))
      ) : (
        <Row gap={S.md} style={styles.item}>
          <IconBadge icon={emptyIcon} color={C.haze} bg={alpha(C.mist, 0.06)} />
          <Sub style={{ flex: 1 }}>{empty}</Sub>
        </Row>
      )}

      <Divider />

      <View style={styles.addWrap}>
        <Row gap={S.sm}>
          <View style={{ flex: 1 }}>
            <Field
              value={draft}
              onChangeText={setDraft}
              placeholder={placeholder}
              accessibilityLabel={`New ${noun}`}
              autoCapitalize="sentences"
              returnKeyType="done"
              submitBehavior={canAdd ? 'submit' : 'blurAndSubmit'}
              onSubmitEditing={add}
              style={styles.field}
            />
          </View>
          <Button kind="accent" icon={Plus} label="Add" onPress={add} disabled={!canAdd} />
        </Row>
        {dupe ? <Small color={C.tangerine}>That one is already on the list.</Small> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 0, paddingVertical: S.xs },
  item: { paddingVertical: S.md, minHeight: 64 },
  addWrap: { gap: S.sm, paddingTop: S.md, paddingBottom: S.sm },
  field: { height: 56, paddingVertical: 0, paddingHorizontal: 14 },
});
