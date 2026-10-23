// Get Gud render3d: headless three.js scenes for pre-rendered 3D assets.
// render.py drives this page through Playwright and calls window.renderAsset(spec).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeVertices, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, premultipliedAlpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.0;

const SHAPES = await (await fetch('/build/shapes.json')).json();

// ------------------------------------------------------------------ colour helpers
const C = (hex) => new THREE.Color(hex);
export const IOS = {
  green: '#30D158', orange: '#FF9230', red: '#FF4245', yellow: '#FFD600', mint: '#00DAC3',
  cyan: '#3CD3FE', blue: '#0091FF', indigo: '#6D7CFF', purple: '#DB34F2', pink: '#FF375F', gold: '#FFB800',
};
const lerpColor = (a, b, t) => C(a).lerp(C(b), t);

// ------------------------------------------------------------------ environment (IBL)
// RoomEnvironment plus two soft boxes so every asset shares the iOS top-left key direction.
function buildEnvironment() {
  const room = new RoomEnvironment();
  const panel = (w, h, intensity, color, pos) => {
    const mat = new THREE.MeshBasicMaterial({ color: C(color).multiplyScalar(intensity), side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    room.add(m);
  };
  panel(9, 6, 9, '#fff6ea', [-7, 7, 8]);    // big warm key softbox, top left front
  panel(2.2, 12, 6, '#e8f0ff', [9, 1, -3]);  // cool strip, right/behind = rim
  panel(14, 1.6, 2.5, '#ffffff', [0, -7, 6]); // low bounce card in front
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(room, 0.035).texture;
  pmrem.dispose();
  return tex;
}
const ENV = buildEnvironment();

function addRig(scene, o = {}) {
  const key = new THREE.DirectionalLight('#fff3e6', o.key ?? 2.6);
  key.position.set(-4, 5.5, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#dce8ff', o.rim ?? 3.0);
  rim.position.set(5, 2.5, -4);
  scene.add(rim);
  const rim2 = new THREE.DirectionalLight('#ffffff', (o.rim ?? 3.0) * 0.45);
  rim2.position.set(-5, -2, -3.5);
  scene.add(rim2);
  const fill = new THREE.HemisphereLight('#e8eeff', '#1a1410', o.fill ?? 0.35);
  scene.add(fill);
  scene.environment = ENV;
  scene.environmentIntensity = o.env ?? 1.0;
}

// ------------------------------------------------------------------ canvas textures
function canvasTexture(w, h, fn, { srgb = false, repeat = false } = {}) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = fn(x / (w - 1), y / (h - 1), x, y);
      const i = (y * w + x) * 4;
      if (Array.isArray(v)) { d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; d[i + 3] = 255; }
      else { const c = Math.max(0, Math.min(255, v * 255)); d[i] = d[i + 1] = d[i + 2] = c; d[i + 3] = 255; }
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// deterministic hash noise
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise1(x) { const i = Math.floor(x), f = x - i; const u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; }

// Guilloché (engine-turned) patterns for enamel faces, in planar face UVs.
function guilloche(kind, o = {}) {
  const N = 1536;
  return canvasTexture(N, N, (u, v) => {
    const x = (u - 0.5 - (o.cx ?? 0)) * 2, y = (v - 0.5 - (o.cy ?? 0)) * 2;
    const r = Math.hypot(x, y), a = Math.atan2(y, x);
    let h = 0.5;
    if (kind === 'sunburst') {
      const n = o.rays ?? 90;
      const s = 0.5 + 0.5 * Math.cos(a * n);
      const fade = Math.min(1, r / 0.18);
      h = 0.5 + (s - 0.5) * fade;
    } else if (kind === 'waves') {
      const f = o.freq ?? 26;
      h = 0.5 + 0.5 * Math.cos(2 * Math.PI * (y * f * 0.5 + 0.55 * Math.sin(x * Math.PI * 2.2)));
    } else if (kind === 'rings') {
      h = 0.5 + 0.5 * Math.cos(2 * Math.PI * r * (o.freq ?? 34));
    } else if (kind === 'clous') {
      const f = o.freq ?? 22;
      const p = (x + y) * f, q = (x - y) * f;
      const fx = Math.abs(p - Math.round(p)), fy = Math.abs(q - Math.round(q));
      h = 1 - 2 * Math.max(fx, fy);
    } else if (kind === 'barley') {
      const f = o.freq ?? 30;
      h = 0.5 + 0.5 * Math.cos(2 * Math.PI * (r * f + Math.sin(a * (o.lobes ?? 12)) * 0.35));
    }
    return h;
  }, { repeat: false });
}

// Two-tone enamel colour: diagonal gradient with a soft radial vignette for depth.
function enamelColorMap(c1, c2, o = {}) {
  const A = C(c1), B = C(c2);
  A.convertLinearToSRGB(); B.convertLinearToSRGB();
  return canvasTexture(512, 512, (u, v) => {
    const x = (u - 0.5) * 2, y = (v - 0.5) * 2;
    const t = Math.min(1, Math.max(0, 0.5 + (x * 0.55 - y * 0.75) * (o.spread ?? 0.55)));
    const r = Math.hypot(x, y);
    const vig = 1 - (o.vignette ?? 0.32) * Math.pow(Math.min(1, r / 1.0), 2.2);
    const lift = 1 + (o.glow ?? 0.12) * Math.exp(-r * r * 3);
    const col = A.clone().lerp(B, t);
    return [col.r * vig * lift * 255, col.g * vig * lift * 255, col.b * vig * lift * 255].map((q) => Math.min(255, q));
  }, { srgb: true });
}

// ------------------------------------------------------------------ geometry helpers
// Fillet a polyline profile: pts = [[x, y, radius], ...]
function filletPath(pts, segs = 10) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, y, r] = pts[i];
    if (!r || i === 0 || i === pts.length - 1) { out.push(new THREE.Vector2(x, y)); continue; }
    const P = new THREE.Vector2(x, y);
    const A = new THREE.Vector2(pts[i - 1][0], pts[i - 1][1]);
    const B = new THREE.Vector2(pts[i + 1][0], pts[i + 1][1]);
    const u1 = A.clone().sub(P).normalize(), u2 = B.clone().sub(P).normalize();
    const th = Math.acos(Math.max(-1, Math.min(1, u1.dot(u2))));
    const t = r / Math.tan(th / 2);
    const T1 = P.clone().addScaledVector(u1, t), T2 = P.clone().addScaledVector(u2, t);
    const bis = u1.clone().add(u2).normalize();
    const Cc = P.clone().addScaledVector(bis, r / Math.sin(th / 2));
    let a1 = Math.atan2(T1.y - Cc.y, T1.x - Cc.x), a2 = Math.atan2(T2.y - Cc.y, T2.x - Cc.x);
    let da = a2 - a1;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    for (let s = 0; s <= segs; s++) {
      const a = a1 + da * s / segs;
      out.push(new THREE.Vector2(Cc.x + r * Math.cos(a), Cc.y + r * Math.sin(a)));
    }
  }
  return out;
}

// Lathe around the Z axis (profile is [radius, z]); returns geometry with face normal +Z.
function latheZ(profile, segments = 256) {
  const g = new THREE.LatheGeometry(profile, segments, -Math.PI / 2);
  g.rotateX(Math.PI / 2);
  return g;
}

function fixSeamNormals(g) {
  const pos = g.attributes.position, nor = g.attributes.normal;
  const map = new Map();
  for (let i = 0; i < pos.count; i++) {
    const k = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(i);
  }
  const v = new THREE.Vector3();
  for (const ids of map.values()) {
    if (ids.length < 2) continue;
    v.set(0, 0, 0);
    for (const i of ids) v.add(new THREE.Vector3(nor.getX(i), nor.getY(i), nor.getZ(i)));
    v.normalize();
    for (const i of ids) nor.setXYZ(i, v.x, v.y, v.z);
  }
  nor.needsUpdate = true;
}

function planarUV(g, radius) {
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / (2 * radius) + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / (2 * radius) + 0.5;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function shapesFromPolys(polys, scale = 1, dx = 0, dy = 0) {
  return polys.map((p) => {
    const s = new THREE.Shape(p.outer.map(([x, y]) => new THREE.Vector2(x * scale + dx, y * scale + dy)));
    s.holes = p.holes.map((h) => new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x * scale + dx, y * scale + dy))));
    return s;
  });
}

function bounds(polys) {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const p of polys) for (const [x, y] of p.outer) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
  return { minx, miny, maxx, maxy, w: maxx - minx, h: maxy - miny };
}

// Extrude a named 2D shape with a rounded bevel; base sits on z = 0.
function extrudeNamed(name, { scale = 1, depth = 0.05, bevel = 0.02, bevelSize, segs = 6, dx = 0, dy = 0, crease = 40 } = {}) {
  const shapes = shapesFromPolys(SHAPES[name], scale, dx, dy);
  let g = new THREE.ExtrudeGeometry(shapes, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevelSize ?? bevel * 0.85,
    bevelSegments: segs, curveSegments: 6, steps: 1,
  });
  g.translate(0, 0, bevel);
  g = toCreasedNormals(g, THREE.MathUtils.degToRad(crease));
  return g;
}

// ------------------------------------------------------------------ materials
const METALS = {
  gold: { color: '#F6C661', rough: 0.26 },
  gold_bright: { color: '#FFCE6A', rough: 0.16 },
  silver: { color: '#E6E9EE', rough: 0.24 },
  bronze: { color: '#D08A5A', rough: 0.3 },
  rose: { color: '#F2B39C', rough: 0.24 },
  platinum: { color: '#D9DCE2', rough: 0.16 },
  graphite: { color: '#4A4E57', rough: 0.5 },
};

function metal(kind, o = {}) {
  const m = METALS[kind];
  return new THREE.MeshPhysicalMaterial({
    color: C(o.color ?? m.color), metalness: 1, roughness: o.rough ?? m.rough,
    clearcoat: o.clearcoat ?? 0, clearcoatRoughness: 0.08,
    bumpMap: o.bumpMap ?? null, bumpScale: o.bumpScale ?? 1,
    envMapIntensity: o.env ?? 1,
    iridescence: o.iridescence ?? 0, iridescenceIOR: 1.6, iridescenceThicknessRange: [180, 420],
  });
}

// ------------------------------------------------------------------ medal
// Rim/body profile [radius, z, fillet]
function medalBodyGeometry(o = {}) {
  const R = 1.0, back = -0.12, top = 0.125, crown = 0.145;
  const ri = o.recessR ?? 0.78, floor = 0.05;
  const pts = filletPath([
    [0.0, back, 0],
    [R, back, 0.075],
    [R, top - 0.03, 0.07],
    [0.9, crown, 0.05],
    [ri + 0.05, crown, 0.028],
    [ri, floor, 0.012],
    [0.0, floor, 0],
  ], 12);
  // zones by profile index for the bump texture
  const zones = pts.map((p) => {
    if (p.x > 0.985 && p.y > back + 0.04 && p.y < top - 0.06) return 'side';
    if (p.y > crown - 0.004 && p.x < 0.93 && p.x > ri + 0.02) return 'crown';
    return 'plain';
  });
  const g = latheZ(pts, o.segments ?? 512);
  if (o.lobes) {
    // scalloped outline: modulate radius of the outer part
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const r = Math.hypot(x, y);
      if (r < 1e-5) continue;
      const a = Math.atan2(y, x);
      const w = THREE.MathUtils.smoothstep(r, ri + 0.03, ri + 0.12);
      const k = 1 + w * o.lobeAmp * (Math.pow(0.5 + 0.5 * Math.cos(a * o.lobes + Math.PI / 2 * 0), 1.5) - 0.5);
      pos.setXY(i, x * k, y * k);
    }
    g.computeVertexNormals();
    fixSeamNormals(g);
  }
  return { g, pts, zones, ri, floor };
}

function medalBumpTexture(pts, zones, o = {}) {
  const W = 4096, H = Math.max(256, pts.length * 4);
  const reeds = o.reeds ?? 150;
  const ticks = o.ticks ?? 0;
  return canvasTexture(W, H, (u, v, px, py) => {
    // lathe v is profile index based; flip because canvas y grows down and flipY is on
    const idx = Math.min(pts.length - 1, Math.round((1 - v) * (pts.length - 1)));
    const z = zones[idx];
    if (z === 'side') return 0.5 + 0.5 * Math.cos(u * Math.PI * 2 * reeds);
    if (z === 'crown') {
      let h = 0.5 + 0.18 * (vnoise1(py * 0.9) - 0.5) + 0.06 * Math.sin(py * 2.1);
      if (ticks) {
        const f = (u * ticks) % 1;
        if (f < 0.12) h -= 0.45;
      }
      return h;
    }
    return 0.5;
  });
}

function medalScene(p) {
  const scene = new THREE.Scene();
  addRig(scene, p.rig);
  const group = new THREE.Group();
  scene.add(group);

  const body = medalBodyGeometry({ lobes: p.lobes, lobeAmp: p.lobeAmp ?? 0.06 });
  const rimMat = metal(p.metal, {
    bumpMap: medalBumpTexture(body.pts, body.zones, { reeds: p.lobes ? 0 : 150, ticks: p.ticks ?? 0 }),
    bumpScale: 1.4, rough: p.rimRough, iridescence: p.rimIridescence ?? 0,
  });
  group.add(new THREE.Mesh(body.g, rimMat));

  // enamel / face
  const ri = body.ri;
  const faceProfile = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40; // outer -> centre
    const r = ri * (1 - t);
    const meniscus = 0.012 * Math.exp(-((ri - r) / 0.02));
    faceProfile.push(new THREE.Vector2(r, body.floor + 0.02 + meniscus + (p.faceDome ?? 0.006) * (1 - (r / ri) ** 2)));
  }
  const faceG = latheZ(faceProfile, 256);
  planarUV(faceG, ri);
  const faceMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', map: enamelColorMap(p.enamel[0], p.enamel[1], p.enamelOpts ?? {}),
    roughness: p.faceRough ?? 0.32, metalness: p.faceMetal ?? 0.0,
    clearcoat: 1, clearcoatRoughness: 0.03,
    bumpMap: guilloche(p.pattern ?? 'sunburst', p.patternOpts ?? {}), bumpScale: p.patternBump ?? 0.6,
    sheen: p.sheen ?? 0.35, sheenColor: C(p.enamel[0]).lerp(C('#ffffff'), 0.5), sheenRoughness: 0.5,
    iridescence: p.faceIridescence ?? 0, iridescenceIOR: 1.5, iridescenceThicknessRange: [200, 500],
    emissive: C(p.enamel[0]), emissiveIntensity: p.faceGlow ?? 0.04,
  });
  const face = new THREE.Mesh(faceG, faceMat);
  group.add(face);
  const faceTop = body.floor + 0.02 + (p.faceDome ?? 0.006);

  // glass dome
  let glyphZ = faceTop;
  if (p.glass) {
    const gp = [];
    const h = p.glass.height ?? 0.1;
    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const r = (ri - 0.004) * (1 - t);
      gp.push(new THREE.Vector2(r, faceTop + 0.004 + h * Math.pow(1 - (r / ri) ** 2, 0.55)));
    }
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff', metalness: 0, roughness: 0.02, transmission: 1, thickness: p.glass.thickness ?? 0.35,
      ior: 1.5, attenuationColor: C(p.glass.tint ?? '#ffffff'), attenuationDistance: p.glass.atten ?? 1.2,
      clearcoat: 1, clearcoatRoughness: 0.0, specularIntensity: 1, envMapIntensity: 1.2,
      iridescence: p.glass.iridescence ?? 0, iridescenceIOR: 1.3, iridescenceThicknessRange: [250, 600],
      dispersion: p.glass.dispersion ?? 0.4,
    });
    const dome = new THREE.Mesh(latheZ(gp, 256), glassMat);
    dome.renderOrder = 2;
    group.add(dome);
  }

  // glyph(s)
  const glyphMat = metal(p.glyphMetal ?? p.metal, { rough: p.glyphRough ?? 0.13 });
  const addGlyph = (name, o = {}) => {
    const b = bounds(SHAPES[name]);
    const s = o.scale ?? Math.min((o.maxW ?? 1.0) / b.w, (o.maxH ?? 0.78) / b.h);
    const g = extrudeNamed(name, { scale: s, depth: o.depth ?? 0.045, bevel: o.bevel ?? 0.028, segs: 6, dx: o.dx ?? 0, dy: o.dy ?? 0 });
    const m = new THREE.Mesh(g, o.mat ?? glyphMat);
    m.position.z = o.z ?? glyphZ;
    group.add(m);
    return m;
  };
  if (p.glyph) addGlyph(p.glyph, p.glyphOpts ?? {});
  if (p.extra) p.extra({ group, addGlyph, faceTop, ri, glyphMat, faceMat });

  group.rotation.set(THREE.MathUtils.degToRad(p.rotX ?? -8), THREE.MathUtils.degToRad(p.rotY ?? 18), 0, 'YXZ');
  const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 50);
  camera.position.set(0, 0, 7.2);
  camera.lookAt(0, 0, 0);
  return { scene, camera };
}

const MEDALS = {
  'medal-streak-3': { metal: 'bronze', enamel: [IOS.orange, '#E8661A'], glyph: 'num_3', pattern: 'sunburst', patternOpts: { rays: 84 } },
  'medal-streak-7': { metal: 'silver', enamel: ['#2AA4FF', '#0067E0'], glyph: 'num_7', pattern: 'waves', patternOpts: { freq: 30 } },
  'medal-streak-21': { metal: 'gold', enamel: ['#45E06D', '#16A845'], glyph: 'num_21', glyphOpts: { maxW: 1.06, maxH: 0.74 }, pattern: 'clous', patternOpts: { freq: 20 } },
  'medal-streak-66': { metal: 'rose', enamel: [IOS.purple, '#5A4BF0'], glyph: 'num_66', glyphOpts: { maxW: 1.08, maxH: 0.72 }, pattern: 'barley', patternOpts: { freq: 26, lobes: 10 }, enamelOpts: { spread: 0.75 } },
  'medal-streak-100': {
    metal: 'platinum', enamel: ['#5FE0FF', '#0A8FD8'], glyph: 'num_100', glyphOpts: { maxW: 1.14, maxH: 0.62 },
    pattern: 'rings', patternOpts: { freq: 30 }, ticks: 60,
    glass: { tint: '#9BE9FF', height: 0.11, thickness: 0.4, atten: 1.4, iridescence: 0.35 },
  },
  'medal-walked-away': { metal: 'gold', enamel: ['#2BE6C4', '#0BA77F'], pattern: 'sunburst', patternOpts: { rays: 64, cy: -0.05 }, lobes: 16, lobeAmp: 0.07, door: true },
  'medal-perfect-day': { metal: 'gold', enamel: ['#24262C', '#0D0E11'], pattern: 'rings', patternOpts: { freq: 40 }, sheen: 0.1, faceRough: 0.4, rings: true },
  'medal-urge-surfer': {
    metal: 'silver', enamel: [IOS.cyan, IOS.indigo], glyph: 'wave', glyphOpts: { maxW: 0.98, maxH: 0.9 },
    pattern: 'waves', patternOpts: { freq: 36 }, enamelOpts: { spread: 0.8 },
    glass: { tint: '#C8D4FF', height: 0.1, thickness: 0.35, atten: 1.6, iridescence: 0.25 },
  },
  'medal-locked': {
    metal: 'graphite', enamel: ['#2E3036', '#1E1F24'], glyph: 'qmark', glyphOpts: { maxH: 0.66 }, glyphMetal: 'graphite', glyphRough: 0.32,
    pattern: 'clous', patternOpts: { freq: 18 }, sheen: 0.05, faceRough: 0.6, patternBump: 0.4, rig: { env: 0.9 },
  },
};

function medalExtras(name, p) {
  if (p.door) {
    p.extra = ({ group, addGlyph, faceTop }) => {
      const S = 0.86; // door group scale; shapes share one coordinate frame
      const z = faceTop;
      const light = new THREE.MeshPhysicalMaterial({ color: '#FFF6DA', emissive: C('#FFE7A8'), emissiveIntensity: 2.2, roughness: 0.4, clearcoat: 1 });
      const frame = addGlyph('door_frame', { scale: S, depth: 0.05, bevel: 0.026, z });
      const lightM = addGlyph('door_light', { scale: S, depth: 0.004, bevel: 0.004, z: z - 0.002, mat: light });
      const door = addGlyph('door_door', { scale: S, depth: 0.03, bevel: 0.02, z: z + 0.012 });
      const knob = addGlyph('door_knob', { scale: S, depth: 0.03, bevel: 0.02, z: z + 0.04 });
      // two small four-point sparkles
      const sparkle = (x, y, s) => {
        const sh = new THREE.Shape();
        const n = 4, pts = [];
        for (let i = 0; i < n * 2; i++) {
          const a = i * Math.PI / n + Math.PI / 2;
          const r = i % 2 === 0 ? s : s * 0.22;
          pts.push(new THREE.Vector2(x + r * Math.cos(a), y + r * Math.sin(a)));
        }
        sh.setFromPoints(pts);
        let g = new THREE.ExtrudeGeometry(sh, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.012, bevelSegments: 4 });
        g.translate(0, 0, 0.02);
        g = toCreasedNormals(g, 0.6);
        const m = new THREE.Mesh(g, metal('gold_bright', { rough: 0.1 }));
        m.position.z = z;
        group.add(m);
      };
      sparkle(0.42, 0.36, 0.13);
      sparkle(0.53, 0.12, 0.07);
    };
  }
  if (p.rings) {
    p.extra = ({ group, faceTop }) => {
      const cols = [IOS.orange, IOS.cyan, IOS.green];
      const radii = [0.58, 0.43, 0.28];
      cols.forEach((c, i) => {
        const tube = 0.052;
        const g = new THREE.TorusGeometry(radii[i], tube, 48, 256);
        const m = new THREE.MeshPhysicalMaterial({
          color: C(c), roughness: 0.22, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.04,
          sheen: 0.6, sheenColor: C(c).lerp(C('#ffffff'), 0.6), emissive: C(c), emissiveIntensity: 0.12,
        });
        const mesh = new THREE.Mesh(g, m);
        mesh.position.z = faceTop + tube * 0.75;
        group.add(mesh);
      });
    };
  }
  return p;
}

// ------------------------------------------------------------------ registry + render entry
const BUILDERS = {
  medal: (params) => medalScene(medalExtras(params.name, { ...MEDALS[params.name] })),
};

const MASK_CACHE = new Map();
function maskMaterial(side) {
  if (!MASK_CACHE.has(side)) MASK_CACHE.set(side, new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, side }));
  return MASK_CACHE.get(side);
}

window.renderAsset = async (spec) => {
  const size = spec.renderSize;
  renderer.setSize(size, size, false);
  const { scene, camera, tone, exposure } = BUILDERS[spec.builder](spec.params ?? {});
  renderer.toneMapping = tone ?? THREE.AgXToneMapping;
  renderer.toneMappingExposure = exposure ?? spec.exposure ?? 1.0;
  if (spec.tone === 'aces') renderer.toneMapping = THREE.ACESFilmicToneMapping;
  if (spec.tone === 'agx') renderer.toneMapping = THREE.AgXToneMapping;
  if (spec.tone === 'neutral') renderer.toneMapping = THREE.NeutralToneMapping;

  // pass 1: colour over opaque black (transmission sees black, like the app background)
  scene.background = null;
  renderer.setClearColor(0x000000, 1);
  renderer.render(scene, camera);
  const color = canvas.toDataURL('image/png');

  // pass 2: coverage mask
  const swaps = [];
  scene.traverse((o) => {
    if (o.isMesh || o.isSprite) {
      swaps.push([o, o.material]);
      o.material = o.userData.mask ?? maskMaterial(o.material.side ?? THREE.FrontSide);
    }
  });
  const env = scene.environment;
  scene.environment = null;
  renderer.setClearColor(0x000000, 1);
  renderer.render(scene, camera);
  const mask = canvas.toDataURL('image/png');
  for (const [o, m] of swaps) o.material = m;
  scene.environment = env;

  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      for (const k of Object.keys(o.material)) { const v = o.material[k]; if (v && v.isTexture) v.dispose(); }
      o.material.dispose?.();
    }
  });
  renderer.renderLists.dispose();
  return { color, mask };
};

window.READY = true;
