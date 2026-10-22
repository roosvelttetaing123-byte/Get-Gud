import { Fragment, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { C, S } from '@/constants/theme';
import { Body, Button, Divider, Field, Row, Small, Sub, Surface } from '@/ui';

/**
 * A list of short strings (trading rules, daily promises) with remove and add.
 * Removal asks first: deleting a rule mid-session is exactly the move this app exists to slow down.
 */
export function EditableList({
  items,
  onChange,
  noun,
  placeholder,
  empty,
  removeNote,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  /** Singular, lower case: "rule", "promise". */
  noun: string;
  placeholder: string;
  /** Shown when the list is empty. Tell the user what to do next. */
  empty: string;
  /** Second line of the remove confirmation. */
  removeNote: string;
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

  const remove = (item: string) => {
    Alert.alert(`Remove this ${noun}?`, `“${item}”\n\n${removeNote}`, [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onChange(items.filter((i) => i !== item)) },
    ]);
  };

  return (
    <View style={{ gap: S.md }}>
      {items.length ? (
        <Surface style={{ gap: 0, paddingVertical: S.xs }}>
          {items.map((item, i) => (
            <Fragment key={item}>
              {i > 0 ? <Divider /> : null}
              <Row gap={S.md} style={{ minHeight: 52, paddingVertical: S.xs }}>
                <Body style={{ flex: 1 }}>{item}</Body>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${noun}: ${item}`}
                  hitSlop={8}
                  onPress={() => remove(item)}
                  style={({ pressed }) => [
                    { minHeight: 44, justifyContent: 'center', paddingLeft: S.sm },
                    pressed && { opacity: 0.6 },
                  ]}>
                  <Sub color={C.coral}>Remove</Sub>
                </Pressable>
              </Row>
            </Fragment>
          ))}
        </Surface>
      ) : (
        <Surface>
          <Sub>{empty}</Sub>
        </Surface>
      )}

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
            style={{ minHeight: 50 }}
          />
        </View>
        <Button
          kind="secondary"
          label={`Add ${noun}`}
          onPress={add}
          disabled={!canAdd}
          style={{ minHeight: 50, paddingHorizontal: S.lg }}
        />
      </Row>
      {dupe ? <Small>That one is already on the list.</Small> : null}
    </View>
  );
}
