/**
 * Settings building blocks, iOS Settings style: an inset list for sheets (elevated cells on the
 * sheet's background), the red minus / green plus edit controls, and the nav-bar "Done" button.
 */
import { Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { C, R, S } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { Button, Divider, Txt } from '@/ui';

/**
 * Props for a text field drawn as a bare list cell (no box). On web it also opts out of the
 * global :focus-visible ring (text inputs always match it), since the caret marks focus, as on iOS.
 */
export const BARE_FIELD = (Platform.OS === 'web' ? { dataSet: { ggBare: '' } } : {}) as object;

if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('gg-bare-css')) {
  const el = document.createElement('style');
  el.id = 'gg-bare-css';
  el.textContent = '[data-gg-bare]:focus,[data-gg-bare]:focus-visible{outline:none}';
  document.head.appendChild(el);
}

/** Nav-bar "Done": plain, semibold, tint colour. */
export function DoneButton({ onPress, label = 'Done' }: { onPress: () => void; label?: string }) {
  return (
    <Button
      title={label}
      kind="plain"
      size="medium"
      full={false}
      onPress={onPress}
      style={{ height: 36, paddingHorizontal: 6, marginRight: -6 }}
    />
  );
}

/**
 * Inset grouped list for use inside a Sheet. The sheet is already C.card, so cells sit one
 * step up (C.card2), like grouped lists in iOS sheets. Separators start where the text starts.
 */
export function SheetGroup({
  header,
  footer,
  footerColor = C.label2,
  inset = S.lg,
  children,
  style,
}: {
  header?: string;
  footer?: string;
  footerColor?: string;
  /** Where separators start, measured from the cell's left edge. */
  inset?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ gap: 6 }, style]}>
      {header ? (
        <Txt v="footnote" color={C.label2} style={styles.note}>
          {header}
        </Txt>
      ) : null}
      <View style={styles.group}>
        {rows.map((r, i) => (
          <React.Fragment key={React.isValidElement(r) && r.key != null ? r.key : i}>
            {i > 0 ? <Divider inset={inset} /> : null}
            {r}
          </React.Fragment>
        ))}
      </View>
      {footer ? (
        <Txt v="footnote" color={footerColor} style={styles.note}>
          {footer}
        </Txt>
      ) : null}
    </View>
  );
}

/** The 22pt filled circle iOS uses for delete (red minus) and insert (green plus) in edit mode. */
export function EditBadge({ kind }: { kind: 'delete' | 'insert' }) {
  const I = kind === 'delete' ? Minus : Plus;
  return (
    <View style={[styles.badge, { backgroundColor: kind === 'delete' ? C.red : C.green }]}>
      <I size={15} color="#FFFFFF" strokeWidth={3.2} />
    </View>
  );
}

/** Width of an EditBadge plus its gap: where row text starts after the cell padding. */
export const EDIT_INSET = S.lg + 22 + S.md;

/**
 * UIStepper: a − | + capsule with no number inside. As in iOS, the row shows the value
 * (ListRow `value`) just before it, so formatted values like "30 min" never get squeezed.
 */
export function ValueStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  /** What it changes, for the button names: "Decrease Max trades per day". */
  label: string;
}) {
  const half = (dir: -1 | 1) => {
    const off = dir < 0 ? value <= min : value >= max;
    const I = dir < 0 ? Minus : Plus;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${dir < 0 ? 'Decrease' : 'Increase'} ${label}`}
        accessibilityState={{ disabled: off }}
        disabled={off}
        onPress={() => {
          haptic.tap();
          onChange(dir < 0 ? Math.max(min, value - step) : Math.min(max, value + step));
        }}
        style={({ pressed }) => [styles.stepHalf, pressed && { backgroundColor: C.fill }]}>
        <I size={18} color={off ? C.label4 : C.label} strokeWidth={2.4} />
      </Pressable>
    );
  };
  return (
    <View style={styles.stepper}>
      {half(-1)}
      <View style={styles.stepRule} />
      {half(1)}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { paddingHorizontal: S.lg },
  group: { backgroundColor: C.card2, borderRadius: R.card, overflow: 'hidden' },
  badge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', height: 32, borderRadius: 16, backgroundColor: C.fill3, overflow: 'hidden' },
  stepHalf: { width: 47, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepRule: { width: StyleSheet.hairlineWidth, height: 18, backgroundColor: C.separator },
});
