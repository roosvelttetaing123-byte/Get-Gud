/**
 * Controls for the full-bleed verdict, where the background is a meaning
 * colour and everything sits on it in ink. Mirrors the kit's sizing:
 * 54pt buttons, radius 14, 44pt minimum touch targets.
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, F, R, S, T } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { Display } from '@/ui';

/** Mirrors the tab bar allowance in src/ui Screen. */
const TAB_BAR = 90;

/** Edge-to-edge coloured page. Pass `flood` to fade the colour in over ink. */
export function FullBleed({
  colour,
  flood,
  children,
}: {
  colour: string;
  flood?: Animated.Value;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollViewInstance>(null);

  // Inputs live at the bottom of the page; keep them above the keyboard.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => scroller.current?.scrollToEnd({ animated: true }));
    return () => sub.remove();
  }, []);

  return (
    <View style={[styles.fill, { backgroundColor: flood ? C.ink : colour }]}>
      {flood ? (
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: colour, opacity: flood, pointerEvents: 'none' }]}
        />
      ) : null}
      <ScrollView
        ref={scroller}
        style={styles.fill}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + S.md,
          paddingBottom: insets.bottom + TAB_BAR + S.xl,
          paddingHorizontal: S.gutter,
        }}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        alwaysBounceVertical={false}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

/**
 * The giant ink word, sized so its widest line fills the gutter up to the
 * verdict size. `em` is that line's advance width in ems of the display face.
 *
 * The word is a sign, not reading text: Dynamic Type is cancelled out so it
 * renders at one physical size and never breaks mid-word. Each line's box is
 * the face's natural height (ascent + descent = 1.197 em) so descenders such as
 * the p in "Stop." are never clipped; negative margins trim the space above the
 * caps so stacked lines read as one block.
 */
export function GiantWord({ lines, em }: { lines: string[]; em: number }) {
  const { width, fontScale } = useWindowDimensions();
  const px = Math.min(T.verdict, (width - S.gutter * 2) / em);
  const font = px / (fontScale > 0 ? fontScale : 1);
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={lines.join(' ')}>
      {lines.map((line, i) => (
        <Display
          key={line}
          size={font}
          color={C.ink}
          style={{
            lineHeight: font * 1.2,
            letterSpacing: -0.5,
            marginTop: i === 0 ? -px * 0.17 : -px * 0.33,
          }}>
          {line}
        </Display>
      ))}
    </View>
  );
}

/** Height of the top action row; the confirmation leaves the same space so its word lands where the verdict's did. */
export const TOP_ROW = 44;
/** Space between the top row and the giant word. */
export const WORD_GAP = S.xl;

export function InkButton({
  label,
  onPress,
  kind = 'fill',
  small,
  disabled,
}: {
  label: string;
  onPress: () => void;
  /** fill = ink with mist text; outline = ink border; text = ink label only */
  kind?: 'fill' | 'outline' | 'text';
  small?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={kind === 'text' ? 6 : undefined}
      onPress={() => {
        haptic.press();
        onPress();
      }}
      style={({ pressed }) => [
        kind === 'text' ? styles.textBtn : styles.btn,
        kind === 'fill' && { backgroundColor: C.ink },
        kind === 'outline' && styles.outline,
        { opacity: disabled ? 0.35 : pressed ? 0.7 : 1 },
      ]}>
      <Text
        style={{
          fontFamily: F.body,
          fontSize: small ? T.sub : T.body,
          fontWeight: '600',
          color: kind === 'fill' ? C.mist : C.ink,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Ink text field for use on a meaning colour. */
export function InkInput(props: TextInputProps) {
  const { style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={C.haze}
      selectionColor={C.mist}
      cursorColor={C.mist}
      keyboardAppearance="dark"
      returnKeyType="done"
      {...rest}
      style={[styles.input, style]}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  btn: {
    minHeight: 54,
    borderRadius: R.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S.xl,
  },
  outline: { borderWidth: 1.5, borderColor: C.ink },
  textBtn: {
    minHeight: TOP_ROW,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: S.sm,
  },
  input: {
    minHeight: 54,
    backgroundColor: C.ink,
    borderRadius: R.control,
    paddingHorizontal: S.lg,
    paddingVertical: 14,
    color: C.mist,
    fontSize: T.body,
    fontFamily: F.body,
  },
});
