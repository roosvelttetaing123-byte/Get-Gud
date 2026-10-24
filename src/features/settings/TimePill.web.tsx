/**
 * TimePill (web): a real <input type="time"> drawn as the iOS compact time picker pill.
 * On iPhone, tapping it opens Safari's native time wheel. Same exports as TimePill.tsx.
 */
import type { CSSProperties } from 'react';

import { C, FONT } from '@/constants/theme';

import type { TimePillProps } from './TimePill';

export type { TimePillProps };

const CSS = `
.gg-time{-webkit-appearance:none;appearance:none;box-sizing:border-box;margin:0;border:0;outline:none;
  height:34px;padding:0 12px;border-radius:999px;cursor:pointer;color-scheme:dark;
  display:inline-flex;align-items:center;justify-content:center;
  -webkit-tap-highlight-color:transparent;touch-action:manipulation;font-variant-numeric:tabular-nums}
.gg-time::-webkit-calendar-picker-indicator{display:none;-webkit-appearance:none}
.gg-time::-webkit-datetime-edit{padding:0}
.gg-time::-webkit-datetime-edit-fields-wrapper{padding:0}
.gg-time::-webkit-date-and-time-value{text-align:center;margin:0}
.gg-time:focus-visible{box-shadow:0 0 0 2px ${C.tint}}
.gg-time:active{opacity:.7}
`;

if (typeof document !== 'undefined' && !document.getElementById('gg-time-css')) {
  const el = document.createElement('style');
  el.id = 'gg-time-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function TimePill({ value, onChange, label }: TimePillProps) {
  const style: CSSProperties = {
    backgroundColor: C.fill3,
    color: C.label,
    fontFamily: FONT.system,
    fontSize: 17,
    lineHeight: '22px',
  };
  return (
    <input
      type="time"
      className="gg-time"
      aria-label={label}
      value={value}
      step={300}
      onChange={(e) => {
        if (e.currentTarget.value) onChange(e.currentTarget.value);
      }}
      style={style}
    />
  );
}
