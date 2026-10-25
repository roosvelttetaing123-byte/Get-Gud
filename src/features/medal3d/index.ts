/**
 * Live 3D medals you can spin. Web: three.js, loaded on demand. Native: the pre-rendered still with tilt.
 * See Medal3D.web.tsx and runtime.ts.
 */
export { Medal3D } from './Medal3D';
export { engraveDate, specFor } from './specs';
export { requestTilt, tiltApi, tiltNeedsPermission, watchTiltData } from './tilt';
export type { Intro, Medal3DHandle, Medal3DProps, MedalBack } from './types';
