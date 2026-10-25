/**
 * Native: the pre-rendered medal with its press tilt and specular sweep (no WebGL here).
 * The web build (Medal3D.web.tsx) adds the live, spinnable three.js medal.
 */
import { useImperativeHandle } from 'react';

import { LOCKED_MEDAL } from '@/lib/engage';

import { Still } from './Still';
import type { Medal3DProps } from './types';

export function Medal3D({ image, size, locked, label, ref }: Medal3DProps) {
  useImperativeHandle(ref, () => ({ flip: () => {} }), []);
  return <Still image={locked ? LOCKED_MEDAL : image} size={size} label={label} />;
}
