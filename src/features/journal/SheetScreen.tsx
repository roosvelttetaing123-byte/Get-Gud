import React from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { S } from '@/constants/theme';
import { Screen } from '@/ui/legacy';

/**
 * <Screen modal> for forms. The kit's scrolling Screen doesn't lift focused fields above the
 * keyboard, so this keeps Screen as the frame (ink background, flex) and supplies the same
 * modal padding to its own ScrollView with automaticallyAdjustKeyboardInsets on.
 */
export function SheetScreen({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Screen modal scroll={false} style={{ paddingTop: 0, paddingBottom: 0, paddingHorizontal: 0 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: S.xl,
          paddingBottom: insets.bottom + S.xl,
          paddingHorizontal: S.gutter,
          gap: S.xl,
        }}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        {children}
      </ScrollView>
    </Screen>
  );
}
