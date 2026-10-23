/**
 * NativeSwitch (web): a real <input type="checkbox" switch>.
 *
 * Safari 17.4+ draws this as the system iOS toggle, and on iPhone a genuine tap on it
 * plays the Taptic "tick" — the only real haptic a web app gets on iOS. Browsers without
 * the switch attribute get a CSS replica of UISwitch (51×31 pill, white knob, stretch on
 * press). `tint` drives `accent-color` (native) and the replica's "on" fill.
 *
 * HapticTarget wraps a row in a <label>, so tapping anywhere on the row is a genuine tap
 * that toggles the switch inside it (and iOS fires the haptic). Same exports as
 * NativeSwitch.tsx.
 */
import * as RN from 'react-native';
import type { CSSProperties, ReactElement } from 'react';

import type { HapticTargetProps, NativeSwitchProps } from './NativeSwitch';

export type { HapticTargetProps, NativeSwitchProps };

export const SWITCH_ON = '#30D158';
export const SWITCH_OFF = 'rgba(120,120,128,0.32)';

/** True when the browser renders <input switch> natively (Safari 17.4+). */
export const supportsNativeSwitch =
  typeof HTMLInputElement !== 'undefined' && 'switch' in HTMLInputElement.prototype;

const CSS = `
.gg-switch{flex-shrink:0;margin:0;width:51px;height:31px;cursor:pointer;vertical-align:middle;
  accent-color:var(--gg-switch-tint,${SWITCH_ON});-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.gg-switch:disabled{cursor:default}
.gg-switch:focus{outline:none}
.gg-switch:focus-visible{outline:2px solid var(--gg-switch-tint,${SWITCH_ON});outline-offset:3px}
.gg-switch--css{-webkit-appearance:none;appearance:none;position:relative;box-sizing:border-box;border:0;padding:0;
  border-radius:999px;background-color:${SWITCH_OFF};transition:background-color .25s ease}
.gg-switch--css::before{content:"";position:absolute;top:2px;left:2px;width:27px;height:27px;border-radius:999px;
  background:#fff;box-shadow:0 3px 8px rgba(0,0,0,.15),0 3px 1px rgba(0,0,0,.06);
  transition:transform .3s cubic-bezier(.32,.72,0,1),width .2s cubic-bezier(.32,.72,0,1)}
.gg-switch--css:checked{background-color:var(--gg-switch-tint,${SWITCH_ON})}
.gg-switch--css:checked::before{transform:translateX(20px)}
.gg-switch--css:active:not(:disabled)::before{width:33px}
.gg-switch--css:checked:active:not(:disabled)::before{transform:translateX(14px)}
.gg-switch--css:disabled{opacity:.5}
[data-gg-target]{cursor:pointer;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}
[data-gg-target][aria-disabled="true"]{cursor:default}
@media (prefers-reduced-motion:reduce){.gg-switch--css,.gg-switch--css::before{transition:none}}
`;

if (typeof document !== 'undefined' && !document.getElementById('gg-switch-css')) {
  const el = document.createElement('style');
  el.id = 'gg-switch-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

/** React doesn't know the `switch` attribute; an empty string renders it as a bare boolean attribute. */
const SWITCH_ATTR = { switch: '' } as Record<string, string>;

export function NativeSwitch({ value, onValueChange, accessibilityLabel, tint = SWITCH_ON, disabled }: NativeSwitchProps) {
  const style = { '--gg-switch-tint': tint, accentColor: tint } as CSSProperties;
  return (
    <input
      type="checkbox"
      {...SWITCH_ATTR}
      role="switch"
      className={supportsNativeSwitch ? 'gg-switch' : 'gg-switch gg-switch--css'}
      aria-label={accessibilityLabel}
      checked={value}
      disabled={disabled}
      onChange={(e) => onValueChange(e.currentTarget.checked)}
      style={style}
    />
  );
}

type CreateElement = (type: string, props: Record<string, unknown>) => ReactElement;
// react-native is aliased to react-native-web on web; this renders a DOM element that
// still accepts React Native style props.
const createElement = (RN as unknown as { unstable_createElement: CreateElement }).unstable_createElement;

/**
 * A row that toggles the NativeSwitch inside it when tapped anywhere.
 * Renders a <label>, so the tap is a real user activation of the switch and iOS plays
 * the haptic. Put exactly one NativeSwitch inside, and no other buttons or links.
 */
export function HapticTarget({ children, style, disabled }: HapticTargetProps) {
  return createElement('label', {
    dataSet: { ggTarget: '' },
    'aria-disabled': disabled || undefined,
    // cancels the label's activation, so the inner switch isn't toggled
    onClick: disabled ? (e: { preventDefault: () => void }) => e.preventDefault() : undefined,
    style: [{ display: 'flex', flexDirection: 'row', alignItems: 'center' }, style],
    children,
  });
}

export default NativeSwitch;
