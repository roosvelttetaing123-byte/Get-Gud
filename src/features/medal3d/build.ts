/**
 * Medal and trophy builders for the live view, ported from tools/render3d/web/main.js (medalScene,
 * medalExtras, medalBodyGeometry) and scenes2.js (trophy), so the live medal matches the pre-render.
 *
 * Phone budget: fewer lathe and tube segments, 512 to 1024 textures, no shadow maps (the glyph and rim
 * shadows are baked into the enamel), and a separate back disc with an engraving.
 */
import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

import SHAPES_JSON from '../../../tools/render3d/build/shapes.json';

import {
  backTextures,
  doorLight,
  enamelColorMap,
  guilloche,
  medalBumpTexture,
  shadowMask,
  type EnamelOpts,
  type Pattern,
  type PatternOpts,
  type Poly,
} from './textures';
import type { MedalBack } from './types';

const SHAPES = SHAPES_JSON as unknown as Record<string, Poly[]>;
const C = (hex: string) => new THREE.Color(hex);
const DEG = Math.PI / 180;

const IOS = {
  green: '#30D158',
  orange: '#FF9230',
  cyan: '#3CD3FE',
  purple: '#DB34F2',
};

/* ---------------------------------------------------------------- shared resources */

export interface Shared {
  /** Concentric brushing direction for the back (anisotropy map). */
  grain: THREE.Texture;
  maxAniso: number;
}

/** Lighting per asset (render3d's addRig options, without shadows). */
export interface Rig {
  key: number;
  rim: number;
  fill: number;
  env: number;
}

export interface Built {
  /** Holds the user's rotation; identity is the pre-rendered pose. */
  pivot: THREE.Group;
  rig: Rig;
  camera: { fov: number; position: [number, number, number]; target: [number, number, number] };
  /** Crop of a virtual 1000 px frame matching the pre-render's auto-fit (centre and side, px). */
  frame: { cx: number; cy: number; side: number };
  dispose: () => void;
}

/* ---------------------------------------------------------------- geometry helpers */

/** Fillet a polyline profile: pts = [[x, y, radius], ...] */
function filletPath(pts: number[][], segs = 10): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, y, r] = pts[i];
    if (!r || i === 0 || i === pts.length - 1) {
      out.push(new THREE.Vector2(x, y));
      continue;
    }
    const P = new THREE.Vector2(x, y);
    const A = new THREE.Vector2(pts[i - 1][0], pts[i - 1][1]);
    const B = new THREE.Vector2(pts[i + 1][0], pts[i + 1][1]);
    const u1 = A.clone().sub(P).normalize();
    const u2 = B.clone().sub(P).normalize();
    const th = Math.acos(Math.max(-1, Math.min(1, u1.dot(u2))));
    const t = r / Math.tan(th / 2);
    const T1 = P.clone().addScaledVector(u1, t);
    const T2 = P.clone().addScaledVector(u2, t);
    const bis = u1.clone().add(u2).normalize();
    const Cc = P.clone().addScaledVector(bis, r / Math.sin(th / 2));
    const a1 = Math.atan2(T1.y - Cc.y, T1.x - Cc.x);
    const a2 = Math.atan2(T2.y - Cc.y, T2.x - Cc.x);
    let da = a2 - a1;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    for (let s = 0; s <= segs; s++) {
      const a = a1 + (da * s) / segs;
      out.push(new THREE.Vector2(Cc.x + r * Math.cos(a), Cc.y + r * Math.sin(a)));
    }
  }
  return out;
}

/** Lathe around the Z axis (profile is [radius, z]); face normal +Z. */
function latheZ(profile: THREE.Vector2[], segments: number) {
  const g = new THREE.LatheGeometry(profile, segments, -Math.PI / 2);
  g.rotateX(Math.PI / 2);
  return g;
}

function planarUV(g: THREE.BufferGeometry, radius: number) {
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / (2 * radius) + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / (2 * radius) + 0.5;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function fitUV(g: THREE.BufferGeometry) {
  g.computeBoundingBox();
  const b = g.boundingBox!;
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - b.min.x) / (b.max.x - b.min.x);
    uv[i * 2 + 1] = (pos.getY(i) - b.min.y) / (b.max.y - b.min.y);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function shapesFromPolys(polys: Poly[], scale = 1, dx = 0, dy = 0) {
  return polys.map((p) => {
    const s = new THREE.Shape(p.outer.map(([x, y]) => new THREE.Vector2(x * scale + dx, y * scale + dy)));
    s.holes = p.holes.map((h) => new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x * scale + dx, y * scale + dy))));
    return s;
  });
}

function bounds(polys: Poly[]) {
  let minx = Infinity;
  let miny = Infinity;
  let maxx = -Infinity;
  let maxy = -Infinity;
  for (const p of polys)
    for (const [x, y] of p.outer) {
      minx = Math.min(minx, x);
      maxx = Math.max(maxx, x);
      miny = Math.min(miny, y);
      maxy = Math.max(maxy, y);
    }
  return { minx, miny, maxx, maxy, w: maxx - minx, h: maxy - miny };
}

interface ExtrudeOpts {
  scale?: number;
  depth?: number;
  bevel?: number;
  bevelSize?: number;
  segs?: number;
  dx?: number;
  dy?: number;
  crease?: number;
}

/** Extrude a named 2D shape with a rounded bevel; base sits on z = 0. */
function extrudeNamed(name: string, o: ExtrudeOpts = {}) {
  const { scale = 1, depth = 0.05, bevel = 0.02, segs = 6, dx = 0, dy = 0, crease = 40 } = o;
  const shapes = shapesFromPolys(SHAPES[name], scale, dx, dy);
  let g: THREE.BufferGeometry = new THREE.ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: o.bevelSize ?? bevel * 0.85,
    bevelSegments: segs,
    curveSegments: 4,
    steps: 1,
  });
  g.translate(0, 0, bevel);
  g = toCreasedNormals(g, THREE.MathUtils.degToRad(crease));
  // caps stay perfectly flat (creasing would bleed tilted bevel normals across long cap triangles)
  const cap = g.groups.find((q) => q.materialIndex === 0);
  if (cap) {
    const nor = g.attributes.normal;
    const pos = g.attributes.position;
    const zMid = (depth + 2 * bevel) / 2;
    for (let i = cap.start; i < cap.start + cap.count; i++) nor.setXYZ(i, 0, 0, pos.getZ(i) > zMid ? 1 : -1);
    nor.needsUpdate = true;
  }
  return g;
}

/* ---------------------------------------------------------------- materials */

type MetalKind = 'gold' | 'gold_bright' | 'silver' | 'bronze' | 'rose' | 'platinum' | 'graphite';
const METALS: Record<MetalKind, { color: string; rough: number }> = {
  gold: { color: '#F6C661', rough: 0.26 },
  gold_bright: { color: '#FFCE6A', rough: 0.16 },
  silver: { color: '#E6E9EE', rough: 0.24 },
  bronze: { color: '#D08A5A', rough: 0.3 },
  rose: { color: '#F2B39C', rough: 0.24 },
  platinum: { color: '#D9DCE2', rough: 0.16 },
  graphite: { color: '#4A4E57', rough: 0.5 },
};

function glyphTint(kind: MetalKind, lift: number) {
  const c = C(METALS[kind].color);
  c.lerp(C('#ffffff'), lift);
  return '#' + c.getHexString();
}

interface MetalOpts {
  color?: string;
  rough?: number;
  clearcoat?: number;
  bumpMap?: THREE.Texture | null;
  bumpScale?: number;
  env?: number;
  iridescence?: number;
}

function metal(kind: MetalKind, o: MetalOpts = {}) {
  const m = METALS[kind];
  return new THREE.MeshPhysicalMaterial({
    color: C(o.color ?? m.color),
    metalness: 1,
    roughness: o.rough ?? m.rough,
    clearcoat: o.clearcoat ?? 0,
    clearcoatRoughness: 0.08,
    bumpMap: o.bumpMap ?? null,
    bumpScale: o.bumpScale ?? 1,
    envMapIntensity: o.env ?? 1,
    iridescence: o.iridescence ?? 0,
    iridescenceIOR: 1.6,
    iridescenceThicknessRange: [180, 420],
  });
}

/* ---------------------------------------------------------------- medal specs (render3d MEDALS) */

interface GlyphOpts {
  maxW?: number;
  maxH?: number;
  depth?: number;
  bevel?: number;
  scale?: number;
  dx?: number;
  dy?: number;
}

interface MedalSpec {
  metal: MetalKind;
  enamel: [string, string];
  glyph?: string;
  glyphOpts?: GlyphOpts;
  glyphMetal?: MetalKind;
  glyphRough?: number;
  glyphEdgeRough?: number;
  glyphLift?: number;
  pattern?: Pattern;
  patternOpts?: PatternOpts;
  patternBump?: number;
  enamelOpts?: EnamelOpts;
  faceRough?: number;
  faceMetal?: number;
  faceSpec?: number;
  faceDome?: number;
  faceGlow?: number;
  faceEnv?: number;
  faceIridescence?: number;
  sheen?: number;
  flutes?: number;
  ticks?: number;
  rimRough?: number;
  glass?: { tint?: string; height?: number; thickness?: number; atten?: number; iridescence?: number };
  seal?: { rays: number; out?: number; sharp?: number };
  door?: boolean;
  rings?: boolean;
  rig?: Partial<Rig>;
  rotX?: number;
  rotY?: number;
}

const MEDALS: Record<string, MedalSpec> = {
  'medal-streak-3': { metal: 'bronze', enamel: [IOS.orange, '#E8661A'], glyph: 'num_3', pattern: 'sunburst', patternOpts: { rays: 84 } },
  'medal-streak-7': { metal: 'silver', enamel: ['#2AA4FF', '#0067E0'], glyph: 'num_7', pattern: 'waves', patternOpts: { freq: 30 } },
  'medal-streak-21': {
    metal: 'gold',
    enamel: ['#45E06D', '#16A845'],
    glyph: 'num_21',
    glyphOpts: { maxW: 1.06, maxH: 0.74 },
    pattern: 'clous',
    patternOpts: { freq: 20 },
  },
  'medal-streak-66': {
    metal: 'rose',
    enamel: [IOS.purple, '#5A4BF0'],
    glyph: 'num_66',
    glyphOpts: { maxW: 1.08, maxH: 0.72 },
    pattern: 'barley',
    patternOpts: { freq: 26, lobes: 10 },
    enamelOpts: { spread: 0.75 },
  },
  'medal-streak-100': {
    metal: 'platinum',
    enamel: ['#3CD3FE', '#0560B0'],
    glyph: 'num_100',
    glyphOpts: { maxW: 1.06, maxH: 0.56, depth: 0.018, bevel: 0.02 },
    pattern: 'rings',
    patternOpts: { freq: 30 },
    patternBump: 0.35,
    flutes: 96,
    glass: { tint: '#B5EEFF', height: 0.115, thickness: 0.18, atten: 2.5, iridescence: 0.2 },
  },
  'medal-walked-away': {
    metal: 'gold',
    enamel: ['#2BE6C4', '#0BA77F'],
    pattern: 'sunburst',
    patternOpts: { rays: 64, cy: -0.05 },
    door: true,
    seal: { rays: 36, out: 1.13, sharp: 1.0 },
  },
  'medal-perfect-day': {
    metal: 'gold',
    enamel: ['#202228', '#0B0C0F'],
    pattern: 'clous',
    patternOpts: { freq: 26 },
    patternBump: 0.3,
    faceRough: 0.5,
    rings: true,
  },
  'medal-urge-surfer': {
    metal: 'silver',
    enamel: ['#3CD3FE', '#5A52F0'],
    glyph: 'wave',
    glyphOpts: { maxW: 0.92, maxH: 0.86, depth: 0.018, bevel: 0.02 },
    pattern: 'waves',
    patternOpts: { freq: 36 },
    patternBump: 0.35,
    enamelOpts: { spread: 0.8 },
    glass: { tint: '#C8D4FF', height: 0.115, thickness: 0.18, atten: 2.5, iridescence: 0.2 },
  },
  'medal-locked': {
    metal: 'graphite',
    enamel: ['#2E3036', '#1E1F24'],
    glyph: 'qmark',
    glyphOpts: { maxH: 0.66 },
    glyphMetal: 'graphite',
    glyphRough: 0.32,
    pattern: 'clous',
    patternOpts: { freq: 18 },
    sheen: 0.05,
    faceRough: 0.6,
    patternBump: 0.4,
    rig: { env: 0.9 },
  },
};

export const SPECS = [...Object.keys(MEDALS), 'ring-trophy'];

const DEFAULT_RIG: Rig = { key: 1.8, rim: 3.0, fill: 0.35, env: 1.0 };

/* ---------------------------------------------------------------- medal body */

const BACK = -0.12;
/** The back disc (engraved) sits inside a small bevelled step. */
const BACK_R = 0.86;
const BACK_STEP = 0.014;

function medalBodyGeometry(segments: number) {
  const R = 1.0;
  const top = 0.125;
  const crown = 0.145;
  const ri = 0.78;
  const floor = 0.05;
  const pts = filletPath(
    [
      [BACK_R, BACK + BACK_STEP, 0],
      [BACK_R + 0.03, BACK, 0.01],
      [R, BACK, 0.075],
      [R, top - 0.03, 0.07],
      [0.9, crown, 0.05],
      [ri + 0.05, crown, 0.028],
      [ri, floor, 0.012],
      [0.0, floor, 0],
    ],
    10,
  );
  // zones by profile index for the bump texture
  const zones = pts.map((p) => {
    if (p.x > 0.985 && p.y > BACK + 0.04 && p.y < top - 0.06) return 'side';
    if (p.y > crown - 0.004 && p.x < 0.93 && p.x > ri + 0.02) return 'crown';
    return 'plain';
  });
  return { g: latheZ(pts, segments), pts, zones, ri, floor };
}

/* ---------------------------------------------------------------- build */

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

function disposer(root: THREE.Object3D, keep: Set<THREE.Texture>) {
  return () => {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
      for (const m of mats) {
        for (const v of Object.values(m)) if (v instanceof THREE.Texture && !keep.has(v)) v.dispose();
        m.dispose();
      }
    });
  };
}

/** Projected crop at rest: render3d auto-fits the alpha box with 8% padding per side. */
function frameOf(pivot: THREE.Object3D, cam: Built['camera']): Built['frame'] {
  const camera = new THREE.PerspectiveCamera(cam.fov, 1, 0.1, 50);
  camera.position.set(...cam.position);
  camera.lookAt(...cam.target);
  camera.updateMatrixWorld(true);
  pivot.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  pivot.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || (o as THREE.InstancedMesh).isInstancedMesh) return;
    const pos = mesh.geometry.attributes.position;
    const stride = Math.max(1, Math.floor(pos.count / 6000));
    for (let i = 0; i < pos.count; i += stride) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).project(camera);
      const px = (v.x * 0.5 + 0.5) * 1000;
      const py = (0.5 - v.y * 0.5) * 1000;
      x0 = Math.min(x0, px);
      x1 = Math.max(x1, px);
      y0 = Math.min(y0, py);
      y1 = Math.max(y1, py);
    }
  });
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, side: Math.max(x1 - x0, y1 - y0) / (1 - 2 * 0.08) };
}

/** Builds a medal (or the ring trophy) with its engraved back. */
export async function buildModel(spec: string, back: MedalBack, mark: Poly[] | undefined, shared: Shared): Promise<Built> {
  if (spec === 'ring-trophy') return buildTrophy(shared);
  const p = MEDALS[spec];
  if (!p) throw new Error(`no 3D spec for ${spec}`);
  const keep = new Set<THREE.Texture>([shared.grain]);
  const aniso = Math.min(8, shared.maxAniso);

  const pivot = new THREE.Group();
  const group = new THREE.Group();
  pivot.add(group);

  // ---- rim / body
  const body = medalBodyGeometry(256);
  const rimBump = await medalBumpTexture(body.pts, body.zones, { reeds: 150, ticks: p.ticks ?? 0, flutes: p.flutes ?? 0 });
  const rimMat = metal(p.metal, { bumpMap: rimBump, bumpScale: 1.4, rough: p.rimRough });
  group.add(new THREE.Mesh(body.g, rimMat));

  // ---- engraved back (reads correctly once the medal is turned round)
  const backTex = await backTextures({ title: back.title, line: back.line, progress: back.progress, mark }, 1024, aniso);
  const backGeo = new THREE.CircleGeometry(BACK_R, 128);
  backGeo.rotateY(Math.PI);
  backGeo.translate(0, 0, BACK + BACK_STEP);
  const backMat = new THREE.MeshPhysicalMaterial({
    color: C(METALS[p.metal].color),
    map: backTex.tint,
    metalness: 1,
    roughness: 1,
    roughnessMap: backTex.surface,
    metalnessMap: backTex.surface,
    bumpMap: backTex.surface,
    bumpScale: 2.6,
    anisotropy: 0.65,
    anisotropyMap: shared.grain,
    envMapIntensity: 1.1,
  });
  group.add(new THREE.Mesh(backGeo, backMat));
  await tick();

  // ---- glyph shapes on the face (also used for the baked contact shadow)
  const ri = body.ri;
  const placed: { name: string; scale: number; dx: number; dy: number }[] = [];
  const glyphScale = (name: string, o: GlyphOpts) => {
    const b = bounds(SHAPES[name]);
    return o.scale ?? Math.min((o.maxW ?? 1.0) / b.w, (o.maxH ?? 0.78) / b.h);
  };
  if (p.glyph) placed.push({ name: p.glyph, scale: glyphScale(p.glyph, p.glyphOpts ?? {}), dx: p.glyphOpts?.dx ?? 0, dy: p.glyphOpts?.dy ?? 0 });
  if (p.door) for (const n of ['door_frame', 'door_door']) placed.push({ name: n, scale: 0.86, dx: 0, dy: 0 });

  // ---- enamel face, with the rim's and the glyph's shadows baked in
  const glyphShadow = placed.length
    ? shadowMask(
        placed.map((g) => ({ polys: SHAPES[g.name], scale: g.scale, dx: g.dx, dy: g.dy })),
        ri,
        { offset: [0.03, -0.045], blur: 0.05 },
      )
    : null;
  const ringShadow = p.rings ? ringsShadow(ri) : null;
  const L = new THREE.Vector2(-0.59, 0.81); // key light direction across the face
  const shade = (x: number, y: number) => {
    // the raised rim shades the upper-left edge of the recess
    const r = Math.hypot(x, y);
    const toward = r > 1e-4 ? (x * L.x + y * L.y) / r : 0;
    const rim = Math.max(0, toward) * Math.max(0, Math.min(1, (r - 0.8) / 0.2)) ** 1.6;
    let k = 1 - 0.32 * rim;
    if (glyphShadow) k *= 1 - 0.3 * glyphShadow(x, y);
    if (ringShadow) k *= 1 - 0.35 * ringShadow(x, y);
    return k;
  };
  const faceProfile: THREE.Vector2[] = [];
  for (let i = 0; i <= 32; i++) {
    const t = i / 32;
    const r = ri * (1 - t);
    const meniscus = 0.012 * Math.exp(-((ri - r) / 0.02));
    faceProfile.push(new THREE.Vector2(r, body.floor + 0.02 + meniscus + (p.faceDome ?? 0.006) * (1 - (r / ri) ** 2)));
  }
  const faceG = latheZ(faceProfile, 160);
  planarUV(faceG, ri);
  const enamel = await enamelColorMap(p.enamel[0], p.enamel[1], p.enamelOpts ?? {}, shade);
  enamel.anisotropy = aniso;
  const pattern = await guilloche(p.pattern ?? 'sunburst', p.patternOpts ?? {}, 1024, aniso);
  const faceMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    map: enamel,
    roughness: p.faceRough ?? 0.42,
    metalness: p.faceMetal ?? 0.0,
    specularIntensity: p.faceSpec ?? 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    bumpMap: pattern,
    bumpScale: p.patternBump ?? 0.45,
    sheen: p.sheen ?? 0.0,
    sheenColor: C(p.enamel[0]).lerp(C('#ffffff'), 0.5),
    sheenRoughness: 0.5,
    iridescence: p.faceIridescence ?? 0,
    iridescenceIOR: 1.5,
    iridescenceThicknessRange: [200, 500],
    emissive: C(p.enamel[0]),
    emissiveIntensity: p.faceGlow ?? 0.03,
    envMapIntensity: p.faceEnv ?? 0.45,
  });
  group.add(new THREE.Mesh(faceG, faceMat));
  const faceTop = body.floor + 0.02 + (p.faceDome ?? 0.006);

  // ---- glass dome
  if (p.glass) {
    const gp: THREE.Vector2[] = [];
    const h = p.glass.height ?? 0.1;
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const r = (ri - 0.004) * (1 - t);
      gp.push(new THREE.Vector2(r, faceTop + 0.004 + h * Math.pow(1 - (r / ri) ** 2, 0.55)));
    }
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      metalness: 0,
      roughness: 0.02,
      transmission: 1,
      thickness: p.glass.thickness ?? 0.35,
      ior: 1.5,
      attenuationColor: C(p.glass.tint ?? '#ffffff'),
      attenuationDistance: p.glass.atten ?? 1.2,
      specularIntensity: 1,
      envMapIntensity: 1.0,
      iridescence: p.glass.iridescence ?? 0,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [250, 600],
    });
    const dome = new THREE.Mesh(latheZ(gp, 160), glassMat);
    dome.renderOrder = 2;
    group.add(dome);
  }

  // ---- glyphs: satin face with a polished, light-catching chamfer
  const gm = p.glyphMetal ?? p.metal;
  const glyphMat = [
    metal(gm, { rough: p.glyphRough ?? 0.36, env: 1.7, color: glyphTint(gm, p.glyphLift ?? 0.18) }),
    metal(gm, { rough: p.glyphEdgeRough ?? 0.1, env: 1.3 }),
  ];
  const addGlyph = (name: string, o: GlyphOpts & { z?: number; mat?: THREE.Material | THREE.Material[] } = {}) => {
    const s = glyphScale(name, o);
    const g = extrudeNamed(name, { scale: s, depth: o.depth ?? 0.05, bevel: o.bevel ?? 0.03, segs: 6, dx: o.dx ?? 0, dy: o.dy ?? 0 });
    const m = new THREE.Mesh(g, o.mat ?? glyphMat);
    m.position.z = o.z ?? faceTop;
    group.add(m);
    return m;
  };
  if (p.glyph) addGlyph(p.glyph, p.glyphOpts ?? {});

  if (p.seal) {
    const n = p.seal.rays;
    const pts: THREE.Vector2[] = [];
    const Rin = 1.0;
    const Rout = p.seal.out ?? 1.16;
    for (let i = 0; i < 540; i++) {
      const a = (i / 540) * Math.PI * 2;
      const k = Math.pow(0.5 + 0.5 * Math.cos(a * n + Math.PI / 2), p.seal.sharp ?? 1.4);
      const r = Rin + (Rout - Rin) * k;
      pts.push(new THREE.Vector2(r * Math.cos(a), r * Math.sin(a)));
    }
    let sg: THREE.BufferGeometry = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.025,
      bevelSegments: 4,
      curveSegments: 4,
    });
    sg = toCreasedNormals(sg, THREE.MathUtils.degToRad(40));
    sg.translate(0, 0, -0.1);
    group.add(new THREE.Mesh(sg, [metal(p.metal, { rough: 0.3, env: 1.3 }), metal(p.metal, { rough: 0.1, env: 1.2 })]));
  }

  if (p.door) {
    const S = 0.86;
    const z = faceTop;
    const lightTex = await doorLight();
    const light = new THREE.MeshPhysicalMaterial({
      color: '#000000',
      emissive: C('#ffffff'),
      emissiveMap: lightTex,
      emissiveIntensity: 1.6,
      roughness: 0.3,
      clearcoat: 1,
    });
    addGlyph('door_frame', { scale: S, depth: 0.05, bevel: 0.026, z });
    const lightM = addGlyph('door_light', { scale: S, depth: 0.004, bevel: 0.004, z: z - 0.002, mat: light });
    fitUV(lightM.geometry);
    addGlyph('door_door', { scale: S, depth: 0.03, bevel: 0.02, z: z + 0.012 });
    addGlyph('door_knob', { scale: S, depth: 0.03, bevel: 0.02, z: z + 0.04 });
    const sparkleMat = metal('gold_bright', { rough: 0.1 });
    const sparkle = (x: number, y: number, s: number) => {
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + Math.PI / 2;
        const r = i % 2 === 0 ? s : s * 0.22;
        pts.push(new THREE.Vector2(x + r * Math.cos(a), y + r * Math.sin(a)));
      }
      const sh = new THREE.Shape(pts);
      let g: THREE.BufferGeometry = new THREE.ExtrudeGeometry(sh, {
        depth: 0.01,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.012,
        bevelSegments: 4,
      });
      g.translate(0, 0, 0.02);
      g = toCreasedNormals(g, 0.6);
      const m = new THREE.Mesh(g, sparkleMat);
      m.position.z = z;
      group.add(m);
    };
    sparkle(0.42, 0.36, 0.13);
    sparkle(0.53, 0.12, 0.07);
  }

  if (p.rings) {
    const cols = ['#FF7A12', '#12B4F2', '#22C24C'];
    const glow = [IOS.orange, IOS.cyan, IOS.green];
    const radii = [0.58, 0.43, 0.28];
    cols.forEach((c, i) => {
      const tube = 0.052;
      const g = new THREE.TorusGeometry(radii[i], tube, 24, 160);
      const m = new THREE.MeshPhysicalMaterial({
        color: C(c),
        roughness: 0.3,
        metalness: 0.0,
        specularIntensity: 0.3,
        clearcoat: 0.7,
        clearcoatRoughness: 0.05,
        emissive: C(glow[i]),
        emissiveIntensity: 0.2,
        envMapIntensity: 0.55,
      });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.z = faceTop + tube * 0.75;
      group.add(mesh);
    });
  }

  group.rotation.set((p.rotX ?? -8) * DEG, (p.rotY ?? 18) * DEG, 0, 'YXZ');
  const camera: Built['camera'] = { fov: 20, position: [0, 0, 7.2], target: [0, 0, 0] };
  return {
    pivot,
    rig: { ...DEFAULT_RIG, ...(p.rig ?? {}) },
    camera,
    frame: frameOf(pivot, camera),
    dispose: disposer(pivot, keep),
  };
}

/** Soft shadow of the three Perfect day rings on the dark enamel (face coords). */
function ringsShadow(ri: number) {
  const radii = [0.58, 0.43, 0.28];
  const tube = 0.052;
  const off = new THREE.Vector2(0.028, -0.04);
  return (x: number, y: number) => {
    const px = x * ri - off.x;
    const py = y * ri - off.y;
    const r = Math.hypot(px, py);
    let s = 0;
    for (const R of radii) {
      const d = Math.abs(r - R) - tube * 0.9;
      s = Math.max(s, 1 - Math.min(1, Math.max(0, d / 0.05)));
    }
    return s;
  };
}

/* ---------------------------------------------------------------- ring trophy (scenes2.js trophy) */

/** A closed parametric curve, t in 0..1 mapped to one turn. */
class LoopCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private fn: (t: number) => THREE.Vector3) {
    super();
  }
  getPoint(t: number, o = new THREE.Vector3()) {
    return o.copy(this.fn(t * Math.PI * 2));
  }
}

async function buildTrophy(shared: Shared): Promise<Built> {
  const keep = new Set<THREE.Texture>([shared.grain]);
  const pivot = new THREE.Group();
  const group = new THREE.Group();
  pivot.add(group);
  const a = 1.0;
  const b = 0.55;
  const curves: ((t: number) => THREE.Vector3)[] = [
    (t) => new THREE.Vector3(a * Math.cos(t), b * Math.sin(t), 0),
    (t) => new THREE.Vector3(0, a * Math.cos(t), b * Math.sin(t)),
    (t) => new THREE.Vector3(b * Math.sin(t), 0, a * Math.cos(t)),
  ];
  const cols = ['#FF9230', '#3CD3FE', '#30D158'];
  const deep = ['#FF7A12', '#12B4F2', '#22C24C'];
  const rings = new THREE.Group();
  curves.forEach((f, i) => {
    const curve = new LoopCurve(f);
    const core = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 240, 0.066, 24, true),
      new THREE.MeshPhysicalMaterial({
        color: C(deep[i]),
        metalness: 0.0,
        roughness: 0.3,
        specularIntensity: 0.3,
        emissive: C(cols[i]),
        emissiveIntensity: 0.22,
        envMapIntensity: 0.55,
      }),
    );
    const shell = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 240, 0.13, 32, true),
      new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        metalness: 0,
        roughness: 0.02,
        transmission: 1,
        thickness: 0.05,
        ior: 1.25,
        attenuationColor: C(cols[i]).lerp(C('#ffffff'), 0.3),
        attenuationDistance: 2.5,
        specularIntensity: 1.0,
        envMapIntensity: 1.0,
      }),
    );
    shell.renderOrder = 2;
    rings.add(core, shell);
  });
  rings.rotation.set(28 * DEG, -38 * DEG, 8 * DEG);
  rings.updateMatrixWorld(true);
  let minY = Infinity;
  const minP = new THREE.Vector3();
  curves.forEach((f) => {
    for (let i = 0; i < 2000; i++) {
      const v = f((i / 2000) * Math.PI * 2).applyMatrix4(rings.matrixWorld);
      if (v.y < minY) {
        minY = v.y;
        minP.copy(v);
      }
    }
  });
  rings.position.set(-minP.x, 0, -minP.z);
  group.add(rings);
  const ringBottom = minY - 0.13;
  const gold = metal('gold', { rough: 0.22 });
  const goldPol = metal('gold_bright', { rough: 0.1 });
  const baseTop = ringBottom - 0.42;
  const prof = filletPath(
    [
      [0, baseTop - 0.26, 0],
      [0.62, baseTop - 0.26, 0.05],
      [0.62, baseTop - 0.12, 0.04],
      [0.5, baseTop - 0.07, 0.03],
      [0.46, baseTop, 0.03],
      [0, baseTop, 0],
    ],
    10,
  );
  group.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 128), gold));
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.626, 0.626, 0.05, 128, 1, true),
    new THREE.MeshPhysicalMaterial({ color: '#111216', roughness: 0.3, clearcoat: 1 }),
  );
  band.position.y = baseTop - 0.19;
  group.add(band);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, ringBottom - baseTop + 0.08, 48), goldPol);
  post.position.y = (ringBottom + baseTop) / 2 + 0.04;
  group.add(post);
  const cup = new THREE.Mesh(new THREE.SphereGeometry(0.09, 32, 24), goldPol);
  cup.position.y = ringBottom + 0.05;
  group.add(cup);
  group.rotation.x = 6 * DEG;
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  const ctr = box.getCenter(new THREE.Vector3());
  group.position.sub(ctr);
  const camera: Built['camera'] = { fov: 22, position: [0, 0.4, 9.5], target: [0, 0, 0] };
  await tick();
  return { pivot, rig: { ...DEFAULT_RIG }, camera, frame: frameOf(pivot, camera), dispose: disposer(pivot, keep) };
}

/** The brand mark for the back of every medal. */
export const BRAND_MARK: Poly[] | undefined = SHAPES.g_mark;
