/**
 * One WebGL renderer for every live medal in the app.
 *
 * Only one live medal is on screen at a time (the Medals hero, the full-screen viewer over it, or a
 * celebration over everything), so a single canvas moves to whichever medal is on top. That keeps one
 * GL context, one environment map and one set of compiled shaders, so opening the viewer is instant.
 *
 * Look: render3d's studio, unchanged (RoomEnvironment plus soft boxes through PMREM, ACES filmic,
 * sRGB, the same key, rim and fill lights), minus shadow maps.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { BRAND_MARK, buildModel, type Built, type Shared } from './build';
import { grainDirection } from './textures';
import { MARGIN, type MedalModel } from './types';

const ENV_WALLS = 0.28;
const KEEP = 3; // built medals kept warm (LRU)

function buildEnvironment(renderer: THREE.WebGLRenderer) {
  const room = new RoomEnvironment();
  // darker studio: dim the bounce light so reflections keep contrast and colours stay saturated
  room.traverse((o) => {
    const light = o as THREE.PointLight;
    if (light.isPointLight) light.intensity *= ENV_WALLS;
    const mesh = o as THREE.Mesh;
    const mat = mesh.isMesh ? (mesh.material as THREE.MeshStandardMaterial) : null;
    // the room's big front panel sits right behind the camera; tame it so flat glossy faces keep their colour
    if (mat && mat.emissiveIntensity === 43) mat.emissiveIntensity = 10;
  });
  const extra: THREE.Mesh[] = [];
  const panel = (w: number, h: number, intensity: number, color: string, pos: [number, number, number]) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    room.add(m);
    extra.push(m);
  };
  panel(9, 6, 9, '#fff6ea', [-7, 7, 8]); // big warm key softbox, top left front
  panel(2.2, 12, 6, '#e8f0ff', [9, 1, -3]); // cool strip, right/behind = rim
  panel(14, 1.6, 2.5, '#ffffff', [0, -7, 6]); // low bounce card in front
  panel(6, 3, 3.0, '#ffffff', [3, 9, 6]); // high front card
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(room, 0.035).texture;
  pmrem.dispose();
  for (const m of extra) {
    m.geometry.dispose();
    (m.material as THREE.Material).dispose();
  }
  room.dispose();
  return tex;
}

export class Stage {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(20, 1, 0.1, 50);
  private key = new THREE.DirectionalLight('#fff3e6', 1.8);
  private rim = new THREE.DirectionalLight('#dce8ff', 3.0);
  private rim2 = new THREE.DirectionalLight('#ffffff', 1.35);
  private fill = new THREE.HemisphereLight('#e8eeff', '#1a1410', 0.35);
  private env: THREE.Texture;
  private shared: Promise<Shared> | null = null;
  private cache = new Map<string, Promise<Built>>();
  private current: Built | null = null;
  private warmed = new WeakSet<Built>();
  private css = 0;
  private dpr = 0;
  private gone = false;

  constructor(onLost: () => void) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      if (!this.gone) onLost();
    });
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
    });
    const r = this.renderer;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = false;
    r.setClearColor(0x000000, 0);
    r.transmissionResolutionScale = 0.75;
    this.env = buildEnvironment(r);
    this.key.position.set(-4, 5.5, 5);
    this.rim.position.set(5, 2.5, -4);
    this.rim2.position.set(-5, -2, -3.5);
    this.scene.add(this.key, this.rim, this.rim2, this.fill);
    this.scene.environment = this.env;
  }

  private sharedRes(): Promise<Shared> {
    if (!this.shared) {
      const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
      this.shared = grainDirection().then((grain) => ({ grain, maxAniso }));
    }
    return this.shared;
  }

  /** Builds (or reuses) a medal. Keeps the last few warm; older ones are disposed. */
  prepare(model: MedalModel): Promise<Built> {
    const key = `${model.spec}|${model.back.title}|${model.back.line}|${model.back.progress ?? ''}`;
    const hit = this.cache.get(key);
    if (hit) {
      this.cache.delete(key);
      this.cache.set(key, hit);
      return hit;
    }
    const p = this.sharedRes().then((shared) => buildModel(model.spec, model.back, BRAND_MARK, shared));
    this.cache.set(key, p);
    p.catch(() => this.cache.delete(key));
    this.evict();
    return p;
  }

  private evict() {
    for (const [k, p] of this.cache) {
      if (this.cache.size <= KEEP) break;
      this.cache.delete(k);
      p.then(
        (b) => {
          if (b === this.current) {
            this.scene.remove(b.pivot);
            this.current = null;
          }
          b.dispose();
        },
        () => {},
      );
    }
  }

  private show(b: Built) {
    if (this.current === b) return;
    if (this.current) this.scene.remove(this.current.pivot);
    this.scene.add(b.pivot);
    this.current = b;
  }

  private frame(b: Built, size: number) {
    const css = Math.round(size * MARGIN);
    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    if (css !== this.css || dpr !== this.dpr) {
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(css, css, true);
      this.css = css;
      this.dpr = dpr;
    }
    const c = this.camera;
    c.fov = b.camera.fov;
    c.position.set(...b.camera.position);
    c.lookAt(...b.camera.target);
    const side = b.frame.side * MARGIN;
    c.setViewOffset(1000, 1000, b.frame.cx - side / 2, b.frame.cy - side / 2, side, side);
    c.updateProjectionMatrix();
    this.key.intensity = b.rig.key;
    this.rim.intensity = b.rig.rim;
    this.rim2.intensity = b.rig.rim * 0.45;
    this.fill.intensity = b.rig.fill;
    this.scene.environmentIntensity = b.rig.env;
  }

  /** Compiles a medal's shaders off the main thread where the browser allows it. */
  async warm(b: Built, size: number) {
    if (this.warmed.has(b)) return;
    this.show(b);
    this.frame(b, size);
    // compile without blocking where the browser can (KHR_parallel_shader_compile); otherwise just compile
    if (this.renderer.extensions.has('KHR_parallel_shader_compile')) await this.renderer.compileAsync(this.scene, this.camera);
    else this.renderer.compile(this.scene, this.camera);
    this.warmed.add(b);
  }

  render(b: Built, q: THREE.Quaternion, size: number) {
    this.show(b);
    this.frame(b, size);
    b.pivot.quaternion.copy(q);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.gone = true;
    for (const p of this.cache.values()) p.then((b) => b.dispose(), () => {});
    this.cache.clear();
    this.shared?.then((s) => s.grain.dispose(), () => {});
    this.env.dispose();
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}
