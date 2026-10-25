/**
 * Procedural textures for the live medals, ported from tools/render3d/web/main.js.
 *
 * The pixel functions are the offline renderer's, at phone sizes (512 to 1024 instead of 1536 to 4096),
 * built straight into DataTextures (rows ordered like a flipped canvas, so UVs match the pre-render)
 * and generated in short slices so a medal can be prepared while the page keeps scrolling.
 * The back face is engraved: title, date and "Get Gud" on circular-grained metal.
 */
import * as THREE from 'three';

type Px = number | readonly [number, number, number];
/** u, v in 0..1 with v growing downward (canvas rows), plus the pixel coordinates. */
export type PixelFn = (u: number, v: number, x: number, y: number) => Px;

export interface TexOpts {
  srgb?: boolean;
  repeat?: boolean;
  anisotropy?: number;
}

/** Yield to the browser so a long generation never blocks a frame for more than ~10 ms. */
const breathe = () => new Promise<void>((r) => setTimeout(r, 0));
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const byte = (v: number) => (v <= 0 ? 0 : v >= 255 ? 255 : Math.round(v));

function finish(t: THREE.DataTexture, o: TexOpts): THREE.DataTexture {
  t.colorSpace = o.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = o.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = o.anisotropy ?? 1;
  t.needsUpdate = true;
  return t;
}

/** Same contract as render3d's canvasTexture(w, h, fn), as a DataTexture. */
export async function pixelTexture(w: number, h: number, fn: PixelFn, o: TexOpts = {}): Promise<THREE.DataTexture> {
  const data = new Uint8Array(w * h * 4);
  let t0 = now();
  for (let y = 0; y < h; y++) {
    const row = h - 1 - y; // canvas row y lands where a flipY canvas texture would put it
    const vy = y / (h - 1);
    for (let x = 0; x < w; x++) {
      const v = fn(x / (w - 1), vy, x, y);
      const i = (row * w + x) * 4;
      if (typeof v === 'number') {
        const c = byte(v * 255);
        data[i] = c;
        data[i + 1] = c;
        data[i + 2] = c;
      } else {
        data[i] = byte(v[0]);
        data[i + 1] = byte(v[1]);
        data[i + 2] = byte(v[2]);
      }
      data[i + 3] = 255;
    }
    if (now() - t0 > 10) {
      await breathe();
      t0 = now();
    }
  }
  return finish(new THREE.DataTexture(data, w, h), o);
}

/* ---------------------------------------------------------------- noise */

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
export function vnoise1(x: number) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
}

/* ---------------------------------------------------------------- guilloché + enamel */

export interface PatternOpts {
  cx?: number;
  cy?: number;
  rays?: number;
  freq?: number;
  lobes?: number;
}
export type Pattern = 'sunburst' | 'waves' | 'rings' | 'clous' | 'barley';

/** Engine-turned patterns for enamel faces, in planar face UVs (bump maps). */
export function guilloche(kind: Pattern, o: PatternOpts = {}, size = 1024, aniso = 1) {
  return pixelTexture(
    size,
    size,
    (u, v) => {
      const x = (u - 0.5 - (o.cx ?? 0)) * 2;
      const y = (v - 0.5 - (o.cy ?? 0)) * 2;
      const r = Math.hypot(x, y);
      const a = Math.atan2(y, x);
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
        const p = (x + y) * f;
        const q = (x - y) * f;
        const fx = Math.abs(p - Math.round(p));
        const fy = Math.abs(q - Math.round(q));
        h = 1 - 2 * Math.max(fx, fy);
      } else if (kind === 'barley') {
        const f = o.freq ?? 30;
        h = 0.5 + 0.5 * Math.cos(2 * Math.PI * (r * f + Math.sin(a * (o.lobes ?? 12)) * 0.35));
      }
      return h;
    },
    { anisotropy: aniso },
  );
}

export interface EnamelOpts {
  spread?: number;
  vignette?: number;
  glow?: number;
}

/**
 * Two-tone enamel colour: diagonal gradient with a soft radial vignette (as render3d), times a baked
 * contact shadow `shade(x, y)` (face coords -1..1, y up) standing in for the offline shadow map.
 */
export function enamelColorMap(c1: string, c2: string, o: EnamelOpts = {}, shade?: (x: number, y: number) => number) {
  const A = new THREE.Color(c1);
  const B = new THREE.Color(c2);
  A.convertLinearToSRGB();
  B.convertLinearToSRGB();
  const col = new THREE.Color();
  return pixelTexture(
    512,
    512,
    (u, v) => {
      const x = (u - 0.5) * 2;
      const y = (v - 0.5) * 2;
      const t = Math.min(1, Math.max(0, 0.5 + (x * 0.55 - y * 0.75) * (o.spread ?? 0.55)));
      const r = Math.hypot(x, y);
      const vig = 1 - (o.vignette ?? 0.32) * Math.pow(Math.min(1, r / 1.0), 2.2);
      const lift = 1 + (o.glow ?? 0.12) * Math.exp(-r * r * 3);
      col.copy(A).lerp(B, t);
      const k = vig * lift * (shade ? shade(x, -y) : 1) * 255;
      return [Math.min(255, col.r * k), Math.min(255, col.g * k), Math.min(255, col.b * k)] as const;
    },
    { srgb: true },
  );
}

/* ---------------------------------------------------------------- baked contact shadow */

export type Poly = { outer: number[][]; holes: number[][][] };

/**
 * A soft shadow mask (0..1) of 2D shapes on the face: drawn with canvas shadowBlur (works in every
 * Safari), offset down and right, away from the top-left key light. `toFace` maps shape units to
 * face coords (-1..1, y up).
 */
export function shadowMask(
  groups: { polys: Poly[]; scale: number; dx: number; dy: number }[],
  ri: number,
  o: { offset: [number, number]; blur: number; size?: number },
): (x: number, y: number) => number {
  const N = o.size ?? 256;
  const cv = document.createElement('canvas');
  cv.width = N;
  cv.height = N;
  const ctx = cv.getContext('2d');
  if (!ctx) return () => 0;
  const px = (fx: number) => (fx * 0.5 + 0.5) * N;
  const py = (fy: number) => (0.5 - fy * 0.5) * N;
  const FAR = N * 4;
  ctx.shadowColor = 'rgba(0,0,0,1)';
  ctx.shadowBlur = (o.blur / (2 * ri)) * N;
  ctx.shadowOffsetX = FAR + (o.offset[0] / (2 * ri)) * N;
  ctx.shadowOffsetY = (-o.offset[1] / (2 * ri)) * N;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  for (const g of groups) {
    const ring = (pts: number[][]) => {
      pts.forEach(([x, y], i) => {
        const fx = (x * g.scale + g.dx) / ri;
        const fy = (y * g.scale + g.dy) / ri;
        if (i === 0) ctx.moveTo(px(fx) - FAR, py(fy));
        else ctx.lineTo(px(fx) - FAR, py(fy));
      });
      ctx.closePath();
    };
    for (const p of g.polys) {
      ring(p.outer);
      p.holes.forEach(ring);
    }
  }
  ctx.fill('evenodd');
  const a = ctx.getImageData(0, 0, N, N).data;
  return (x, y) => {
    const ix = Math.min(N - 1, Math.max(0, Math.round((x * 0.5 + 0.5) * (N - 1))));
    const iy = Math.min(N - 1, Math.max(0, Math.round((0.5 - y * 0.5) * (N - 1))));
    return a[(iy * N + ix) * 4 + 3] / 255;
  };
}

/* ---------------------------------------------------------------- rim (reeded edge, crown) */

export function medalBumpTexture(
  pts: THREE.Vector2[],
  zones: string[],
  o: { reeds?: number; ticks?: number; flutes?: number } = {},
) {
  const W = 1024;
  const H = Math.max(256, pts.length * 4);
  const reeds = o.reeds ?? 150;
  const ticks = o.ticks ?? 0;
  return pixelTexture(W, H, (u, v, _px, py) => {
    // lathe v follows the profile index; the canvas grows downward and is flipped on upload
    const idx = Math.min(pts.length - 1, Math.round((1 - v) * (pts.length - 1)));
    const z = zones[idx];
    if (z === 'side') return reeds ? 0.5 + 0.5 * Math.cos(u * Math.PI * 2 * reeds) : 0.5;
    if (z === 'crown') {
      if (o.flutes) return Math.pow(0.5 + 0.5 * Math.cos(u * Math.PI * 2 * o.flutes), 0.6);
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

/* ---------------------------------------------------------------- back face */

const ROUNDED = 'ui-rounded, "SF Pro Rounded", -apple-system, system-ui, "Helvetica Neue", sans-serif';
const SYSTEM = '-apple-system, system-ui, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

export interface BackArt {
  title: string;
  line: string;
  progress?: number;
  /** The brand mark (g_mark polygons) engraved at the top. */
  mark?: Poly[];
}

/** Fit text to a width by shrinking the font. Returns the font size used. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, family: string, max: number, min: number, width: number) {
  let s = max;
  for (; s > min; s -= 2) {
    ctx.font = `${weight} ${s}px ${family}`;
    if (ctx.measureText(text).width <= width) break;
  }
  ctx.font = `${weight} ${s}px ${family}`;
  return s;
}

/** Draws the engraving (white = carved) for the back disc. Text reads correctly from behind. */
function drawEngraving(ctx: CanvasRenderingContext2D, N: number, art: BackArt) {
  const c = N / 2;
  ctx.clearRect(0, 0, N, N);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // border: a bold groove and a fine one inside it
  ctx.lineWidth = N * 0.0075;
  ctx.beginPath();
  ctx.arc(c, c, N * 0.465, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = N * 0.0028;
  ctx.beginPath();
  ctx.arc(c, c, N * 0.445, 0, Math.PI * 2);
  ctx.stroke();

  const locked = art.progress !== undefined;
  if (locked) {
    // progress track: a groove all the way round (the polished arc is painted separately)
    ctx.lineWidth = N * 0.02;
    ctx.beginPath();
    ctx.arc(c, c, N * 0.4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // brand mark at the top
  if (art.mark?.length) {
    let minx = Infinity;
    let miny = Infinity;
    let maxx = -Infinity;
    let maxy = -Infinity;
    for (const p of art.mark)
      for (const [x, y] of p.outer) {
        minx = Math.min(minx, x);
        maxx = Math.max(maxx, x);
        miny = Math.min(miny, y);
        maxy = Math.max(maxy, y);
      }
    const h = N * (locked ? 0.075 : 0.088);
    const s = h / (maxy - miny);
    const ox = c - ((minx + maxx) / 2) * s;
    const oy = N * (locked ? 0.215 : 0.2) + ((miny + maxy) / 2) * s;
    ctx.beginPath();
    const ring = (pts: number[][]) => {
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(ox + x * s, oy - y * s) : ctx.moveTo(ox + x * s, oy - y * s)));
      ctx.closePath();
    };
    for (const p of art.mark) {
      ring(p.outer);
      p.holes.forEach(ring);
    }
    ctx.fill('evenodd');
  }

  const width = N * (locked ? 0.6 : 0.68);
  fitFont(ctx, art.title, 700, ROUNDED, N * 0.112, N * 0.07, width);
  ctx.fillText(art.title, c, N * (locked ? 0.42 : 0.44));
  fitFont(ctx, art.line, 700, SYSTEM, N * (locked ? 0.08 : 0.074), N * 0.05, width);
  ctx.fillText(art.line, c, N * (locked ? 0.54 : 0.555));

  // "Get Gud", letter-spaced, low on the disc
  ctx.font = `700 ${Math.round(N * 0.052)}px ${SYSTEM}`;
  const tag = 'Get Gud';
  const spacing = N * 0.01;
  const widths = [...tag].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (tag.length - 1);
  let x = c - total / 2;
  ctx.textAlign = 'left';
  [...tag].forEach((ch, i) => {
    ctx.fillText(ch, x, N * (locked ? 0.7 : 0.735));
    x += widths[i] + spacing;
  });
}

/**
 * The back face: `surface` packs R = height (bump), G = roughness, B = metalness; `tint` darkens the
 * carving (an albedo multiplier, half size).
 * Field: circular-grained metal (fine concentric rings in the bump, grain in the roughness).
 * Engraving: carved, sandblasted (rough) and dark. A locked medal's progress is a polished inlaid arc.
 */
export async function backTextures(art: BackArt, size = 1024, aniso = 1): Promise<{ surface: THREE.DataTexture; tint: THREE.DataTexture }> {
  const N = size;
  const sharp = document.createElement('canvas');
  sharp.width = N;
  sharp.height = N;
  const sctx = sharp.getContext('2d');
  const soft = document.createElement('canvas');
  soft.width = N;
  soft.height = N;
  const bctx = soft.getContext('2d');
  if (!sctx || !bctx) throw new Error('no 2d canvas');
  drawEngraving(sctx, N, art);
  // a blurred copy rounds the carved edges (shadowBlur works in every Safari, unlike ctx.filter)
  bctx.shadowColor = '#fff';
  bctx.shadowBlur = N * 0.006;
  bctx.shadowOffsetX = N * 2;
  bctx.drawImage(sharp, -N * 2, 0);
  const E = sctx.getImageData(0, 0, N, N).data;
  const Bl = bctx.getImageData(0, 0, N, N).data;

  const p = art.progress;
  const arcR0 = N * 0.392;
  const arcR1 = N * 0.408;
  const arcEnd = p !== undefined ? Math.max(0, Math.min(1, p)) * Math.PI * 2 : 0;

  const data = new Uint8Array(N * N * 4);
  const H = N >> 1;
  const tint = new Uint8Array(H * H * 4);
  const c = (N - 1) / 2;
  let t0 = now();
  for (let y = 0; y < N; y++) {
    const row = N - 1 - y;
    for (let x = 0; x < N; x++) {
      const k = (y * N + x) * 4;
      const e = E[k + 3] / 255;
      const b = Bl[k + 3] / 255;
      const dx = x - c;
      const dy = y - c;
      const r = Math.hypot(dx, dy);
      // circular graining: fine concentric rings with a slow wander
      const grain = vnoise1(r * 0.9) - 0.5;
      const wander = vnoise1(r * 0.045 + 17) - 0.5;
      const carve = Math.min(1, e * 0.6 + b * 0.55);
      let h = 0.64 + grain * 0.035 + wander * 0.02 - carve * 0.5;
      let rough = 0.27 + grain * 0.06 + wander * 0.05;
      rough = rough * (1 - carve) + 0.66 * carve;
      let metal = 1 - 0.55 * carve;
      let albedo = 1 - 0.7 * carve + grain * 0.04;
      if (p !== undefined && r > arcR0 && r < arcR1) {
        // clockwise from 12 o'clock
        let a = Math.atan2(dx, -dy);
        if (a < 0) a += Math.PI * 2;
        if (a <= arcEnd) {
          const edge = Math.min(r - arcR0, arcR1 - r) / (arcR1 - arcR0);
          h = 0.5 + 0.08 * Math.min(1, edge * 4);
          rough = 0.1;
          metal = 1;
          albedo = 1;
        }
      }
      const i = (row * N + x) * 4;
      data[i] = byte(h * 255);
      data[i + 1] = byte(rough * 255);
      data[i + 2] = byte(metal * 255);
      data[i + 3] = 255;
      if (!(x & 1) && !(y & 1)) {
        const j = (((N - 2 - y) >> 1) * H + (x >> 1)) * 4;
        const t = byte(albedo * 255);
        tint[j] = t;
        tint[j + 1] = t;
        tint[j + 2] = t;
        tint[j + 3] = 255;
      }
    }
    if (now() - t0 > 10) {
      await breathe();
      t0 = now();
    }
  }
  return {
    surface: finish(new THREE.DataTexture(data, N, N), { anisotropy: aniso }),
    tint: finish(new THREE.DataTexture(tint, H, H), { anisotropy: aniso }),
  };
}

/** Concentric brushing direction for physical anisotropy (tangent space RG, strength B). Shared by every medal. */
export function grainDirection(size = 128) {
  return pixelTexture(size, size, (u, v) => {
    const x = u - 0.5;
    const y = 1 - v - 0.5; // texture v grows upward
    const r = Math.hypot(x, y) || 1;
    return [((-y / r) * 0.5 + 0.5) * 255, ((x / r) * 0.5 + 0.5) * 255, 255] as const;
  });
}

/** Warm light in the doorway of "Walked away" (planar UVs of the door shape). */
export function doorLight() {
  const a = new THREE.Color('#FFB800');
  const b = new THREE.Color('#FFF8E6');
  a.convertLinearToSRGB();
  b.convertLinearToSRGB();
  const col = new THREE.Color();
  return pixelTexture(
    256,
    256,
    (u, v) => {
      const d = Math.hypot((u - 0.5) * 1.6, (v - 0.32) * 1.0);
      const k = Math.exp(-d * d * 3.2);
      col.copy(a).lerp(b, Math.min(1, k * 1.2));
      return [col.r * 255, col.g * 255, col.b * 255] as const;
    },
    { srgb: true },
  );
}
