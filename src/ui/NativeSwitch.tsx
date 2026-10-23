/**
 * NativeSwitch (iOS/Android): React Native's Switch (UISwitch on iOS).
 * The web build uses NativeSwitch.web.tsx, a real <input type="checkbox" switch>.
 *
 * HapticTarget makes a whole row toggle the switch inside it. On web it is a <label>,
 * so a tap anywhere on the row is a genuine tap on the switch and iOS plays its tick.
 * Keep both files' exports identical.
 */
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { Pressable, Switch, type StyleProp, type ViewStyle } from 'react-native';

import { haptic } from '@/lib/haptics';

export interface NativeSwitchProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
  accessibilityLabel?: string;
  /** "On" track colour. Defaults to iOS dark-mode green. */
  tint?: string;
  disabled?: boolean;
}

export interface HapticTargetProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

/** iOS system green (dark appearance) and the off-track fill UISwitch uses in dark mode. */
export const SWITCH_ON = '#30D158';
export const SWITCH_OFF = 'rgba(120,120,128,0.32)';

/** Whether the platform draws the system toggle (always on native; Safari 17.4+ on web). */
export const supportsNativeSwitch = true;

type Register = (toggle: (() => void) | null) => void;
const TargetContext = createContext<Register | null>(null);

export function NativeSwitch({ value, onValueChange, accessibilityLabel, tint = SWITCH_ON, disabled }: NativeSwitchProps) {
  const register = useContext(TargetContext);

  useEffect(() => {
    if (!register) return;
    register(() => {
      if (disabled) return;
      haptic.tap();
      onValueChange(!value);
    });
    return () => register(null);
  }, [register, value, onValueChange, disabled]);

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      trackColor={{ true: tint, false: SWITCH_OFF }}
      ios_backgroundColor={SWITCH_OFF}
      thumbColor="#FFFFFF"
    />
  );
}

/**
 * A row that toggles the NativeSwitch inside it when tapped anywhere.
 * Put exactly one NativeSwitch inside. Don't nest other buttons in it.
 */
export function HapticTarget({ children, style, disabled }: HapticTargetProps) {
  const toggle = useRef<(() => void) | null>(null);
  const register = useCallback<Register>((fn) => {
    toggle.current = fn;
  }, []);

  return (
    <TargetContext.Provider value={register}>
      <Pressable
        accessible={false}
        disabled={disabled}
        onPress={() => toggle.current?.()}
        style={[{ flexDirection: 'row', alignItems: 'center' }, style]}
      >
        {children}
      </Pressable>
    </TargetContext.Provider>
  );
}

export default NativeSwitch;
