// Orb, mood shapes, ring trophy, gate shield and the app icon mark.
import * as THREE from 'three';
import { mergeVertices, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

export function makeScenes(K) {
  const { C, IOS, addRig, metal, extrudeNamed, latheZ, filletPath, canvasTexture, guilloche, SHAPES, bounds, planarUV } = K;

  // ================================================================ shared GLSL
  const NOISE = /* glsl */`
  vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
  vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
  vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
    vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
    float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
    return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
  float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*snoise(p);p=p*2.03+vec3(1.7,-3.1,2.3);a*=.5;}return s;}
  vec3 toSRGB(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
  vec3 filmic(vec3 c){ // ACES fitted (Narkowicz) so the orb matches the rest of the set
    c*=0.6;return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);}
  `;

  // ================================================================ urge orb
  function orb(p) {
    const glow = !!p.glow;
    const scene = new THREE.Scene();
    const H = 1.56; // sphere diameter = 64% of the canvas; the halo fades out inside the frame
    const camera = new THREE.OrthographicCamera(-H, H, H, -H, 0.1, 20);
    camera.position.set(0, 0, 10);
    const R = glow ? 1.08 : 1.0;
    const gain = glow ? 1.45 : 1.0;
    const lin = (hex) => { const c = C(hex); return new THREE.Vector3(c.r, c.g, c.b); };
    const U = {
      uR: { value: R }, uGain: { value: gain },
      cA: { value: lin(IOS.cyan) }, cB: { value: lin(IOS.indigo) }, cC: { value: lin(IOS.purple) },
      cW: { value: lin('#E8FBFF') },
    };
    const premul = {
      transparent: true, depthWrite: false, blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    };

    // ---- outer halo (behind)
    const haloFrag = (maskOnly) => /* glsl */`
      ${NOISE}
      uniform float uR, uGain; uniform vec3 cA, cB, cC;
      varying vec2 vUv;
      void main(){
        vec2 q = (vUv - .5) * 2. * ${H.toFixed(4)};
        float d = length(q) / uR;
        float e = max(d - 1., 0.);
        float g = 0.5 * exp(-e * 5.0) + 0.4 * exp(-e * 14.0);
        g *= smoothstep(${(1.5 / (glow ? 1.08 : 1.0)).toFixed(3)}, 1.0, d);   // fully gone inside the canvas
        g *= smoothstep(0.96, 1.0, d) * 0.85 + 0.15;
        g *= ${glow ? '1.0' : '0.55'};
        float t = clamp(0.5 + dot(normalize(q + 1e-5), normalize(vec2(.6,-.8))) * .5, 0., 1.);
        vec3 col = mix(cA, cB, smoothstep(.15, .85, t));
        col = mix(col, cC, smoothstep(.75, 1., t) * .35);
        float a = clamp(g, 0., 1.);
        ${maskOnly ? 'gl_FragColor = vec4(vec3(a), a);' : 'vec3 c = toSRGB(filmic(col * 1.2 * uGain)); gl_FragColor = vec4(c * a, a);'}
      }`;
    const haloVert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }';
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(2 * H, 2 * H),
      new THREE.ShaderMaterial({ uniforms: U, vertexShader: haloVert, fragmentShader: haloFrag(false), ...premul }));
    halo.userData.mask = new THREE.ShaderMaterial({ uniforms: U, vertexShader: haloVert, fragmentShader: haloFrag(true), ...premul });
    halo.position.z = -3;
    halo.renderOrder = 0;
    scene.add(halo);

    // ---- the sphere: volumetric light inside frosted glass
    const sphereFrag = /* glsl */`
      ${NOISE}
      uniform float uR, uGain; uniform vec3 cA, cB, cC, cW;
      varying vec3 vObj;
      void main(){
        vec2 q = vObj.xy / uR;                       // unit disc
        float r2 = dot(q, q), rr = sqrt(r2);
        float mu = sqrt(max(1. - r2, 0.));           // = N.V for an orthographic view
        vec3 N = vec3(q, mu);
        vec3 L = normalize(vec3(-.55, .7, .55));
        // colour field: cyan (top-left) -> indigo -> a hint of purple (bottom-right)
        float t = clamp(.5 + dot(q, normalize(vec2(.62, -.78))) * .6, 0., 1.);
        // integrate light along the view chord (refracted toward the centre a little, like a lens)
        vec3 acc = vec3(0.);
        vec3 corePos = vec3(-.1, .12, .05);
        for (int i = 0; i < 12; i++) {
          float z = mix(-mu, mu, (float(i) + .5) / 12.);
          vec3 P = vec3(q * .86, z);
          float n = fbm(P * 1.25 + vec3(0., 0., 3.1));
          float w = .3 + .7 * smoothstep(-.35, .75, n);                 // soft clouds
          float rib = 1. - abs(snoise(P * 1.9 + vec3(5.2, 1.3, 0.)));
          w += .3 * pow(rib, 18.);                                     // faint luminous filaments
          float tt = clamp(t + .25 * n, 0., 1.);
          vec3 c = mix(cA, cB, smoothstep(.02, .6, tt));
          c = mix(c, cC, smoothstep(.58, .98, tt) * .65);
          float cg = exp(-dot(P - corePos, P - corePos) * 3.0);
          acc += c * w * .3 + mix(cA, cW, .35) * cg * .8;
        }
        acc *= (2. * mu) / 12.;
        vec3 deep = mix(cB * .07, cC * .07, smoothstep(.5, 1., t));     // the dark body of the glass
        vec3 light = deep + acc;
        // caustic crescent opposite the light, just inside the rim
        vec2 ld = normalize(vec2(.55, -.72));
        float ang = dot(normalize(q + 1e-5), ld);
        float crescent = smoothstep(.35, 1., ang) * smoothstep(.55, .9, rr) * smoothstep(1., .9, rr);
        light += mix(cA, cW, .12) * crescent * .5;
        // frosted glass: soft fresnel rim + broad window reflection + small glint
        float fr = pow(1. - mu, 3.);
        light += mix(cA, cB, .45) * fr * .55 + cW * pow(1. - mu, 9.) * .35;
        vec3 Rf = reflect(vec3(0., 0., -1.), N);
        float win = pow(max(dot(Rf, L), 0.), 18.);
        light += cW * win * .16;
        light += vec3(1.) * pow(max(dot(Rf, L), 0.), 600.) * 1.1;
        light *= uGain;
        vec3 c = toSRGB(filmic(light * 1.15));
        gl_FragColor = vec4(c, 1.);
      }`;
    const sphere = new THREE.Mesh(new THREE.CircleGeometry(R, 256),
      new THREE.ShaderMaterial({
        uniforms: U, vertexShader: 'varying vec3 vObj; void main(){ vObj = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
        fragmentShader: sphereFrag, transparent: false,
      }));
    sphere.renderOrder = 1;
    scene.add(sphere);
    return { scene, camera, tone: THREE.NoToneMapping };
  }

  // ================================================================ mood shapes
  const MOOD_COLORS = {
    1: ['#E33CF7', '#3A1FB0'],
    2: ['#B04CF8', '#4F44E2'],
    3: ['#7070FF', '#2B58E8'],
    4: ['#3FB0FF', '#0068E0'],
    5: ['#2FCBFA', '#00A894'],
    6: ['#E6D515', '#22B24E'],
    7: ['#FFC21A', '#FF7F24'],
  };

  function hash3(i) { const s = Math.sin(i * 91.345 + 47.853) * 43758.5453; return s - Math.floor(s); }
  function fibDirs(n, seed) {
    const out = [];
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i + 0.5) * 2 / n;
      const r = Math.sqrt(1 - y * y);
      const th = ga * i + seed;
      const v = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);
      v.x += (hash3(i + seed * 10) - 0.5) * 0.25; v.y += (hash3(i + 7 + seed * 10) - 0.5) * 0.25; v.z += (hash3(i + 13 + seed * 10) - 0.5) * 0.25;
      out.push(v.normalize());
    }
    return out;
  }
  // cheap smooth 3D value noise for crumple detail
  function vnoise3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const s = (t) => t * t * (3 - 2 * t);
    const h = (a, b, c) => hash3(a * 157 + b * 113 + c * 271);
    const u = s(xf), v = s(yf), w = s(zf);
    const l = (a, b, t) => a + (b - a) * t;
    return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), u), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
      l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w);
  }
  function ridged(x, y, z) {
    let s = 0, a = 0.5, f = 1;
    for (let i = 0; i < 3; i++) { s += a * (1 - Math.abs(vnoise3(x * f, y * f, z * f) * 2 - 1)); f *= 2.1; a *= 0.5; }
    return s;
  }

  function moodGeometry(level) {
    let g = new THREE.IcosahedronGeometry(1, level <= 2 ? 110 : 80);
    g.deleteAttribute('normal'); g.deleteAttribute('uv');
    g = mergeVertices(g);
    const pos = g.attributes.position;
    const d = new THREE.Vector3();
    const neg = Math.max(0, (4 - level) / 3), posv = Math.max(0, (level - 4) / 3);
    const spikeN = { 1: 26, 2: 14, 3: 9 }[level] ?? 0;
    const dirs = spikeN ? fibDirs(spikeN, level * 1.7) : [];
    const sharp = { 1: 70, 2: 16, 3: 6 }[level] ?? 1;
    const amp = { 1: 0.7, 2: 0.36, 3: 0.17 }[level] ?? 0;
    const crumple = { 1: 0.1, 2: 0.07, 3: 0.022 }[level] ?? 0;
    const crumpleF = { 1: 3.4, 2: 2.6, 3: 2.0 }[level] ?? 2;
    const petals = { 5: 4, 6: 6, 7: 8 }[level] ?? 0;
    const pAmp = { 5: 0.16, 6: 0.3, 7: 0.42 }[level] ?? 0;
    const pPow = { 5: 1.0, 6: 0.8, 7: 0.6 }[level] ?? 1;
    for (let i = 0; i < pos.count; i++) {
      d.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
      let r = 1;
      let x, y, z;
      if (level < 4) {
        let sp = 0;
        dirs.forEach((s, k) => { const len = 0.75 + 0.5 * hash3(k * 3 + level); sp += len * Math.pow(Math.max(0, d.dot(s)), sharp); });
        r += amp * sp;
        r += crumple * (ridged(d.x * crumpleF + level, d.y * crumpleF, d.z * crumpleF) - 0.5) * 2;
        r *= 1 - 0.08 * neg;
        x = d.x * r; y = d.y * r; z = d.z * r;
      } else if (level === 4) {
        r += 0.025 * (vnoise3(d.x * 1.5 + 3, d.y * 1.5, d.z * 1.5) - 0.5);
        x = d.x * r * 1.06; y = d.y * r * 0.96; z = d.z * r * 0.86;
      } else {
        const phi = Math.atan2(d.y, d.x) + Math.PI / 2;
        const rho = Math.sqrt(d.x * d.x + d.y * d.y);
        // rounded petals with soft notches between them
        const L = Math.pow(Math.abs(Math.cos(petals * phi / 2)) * 0.96 + 0.04, pPow);
        const k = 1 + pAmp * (L - 0.45) * Math.pow(rho, 1.5);
        x = d.x * k; y = d.y * k;
        z = d.z * (1 - 0.42 * posv);
        // petal tips curl toward the viewer, centre cups in
        z += 0.32 * posv * L * Math.pow(rho, 4);
        if (d.z > 0) z -= 0.22 * posv * Math.exp(-(rho * rho) / 0.09) * d.z;
        x *= 1 + 0.02 * (vnoise3(d.x * 2 + 9, d.y * 2, d.z * 2) - 0.5);
      }
      pos.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals();
    // vertex colours: diagonal two-tone (top-left light -> bottom-right deep); radial for the bloom
    const [ca, cb] = MOOD_COLORS[level].map((h) => C(h));
    const col = new Float32Array(pos.count * 3);
    g.computeBoundingSphere();
    const R = g.boundingSphere.radius;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / R, y = pos.getY(i) / R;
      let t = THREE.MathUtils.clamp(0.5 + (x * 0.55 - y * 0.8) * 0.75, 0, 1);
      if (level >= 5) {
        const rr = Math.hypot(x, y);
        t = THREE.MathUtils.lerp(t, THREE.MathUtils.clamp(rr * 1.25, 0, 1), posv * 0.85);
      }
      const c = ca.clone().lerp(cb, t);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }

  function mood(p) {
    const level = p.level;
    const scene = new THREE.Scene();
    addRig(scene, { shadow: false, key: 1.6, env: 0.85 });
    const g = moodGeometry(level);
    const [ca] = MOOD_COLORS[level];
    const mat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff', vertexColors: true, roughness: 0.36, metalness: 0, specularIntensity: 0.35,
      clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.2, sheenColor: C(ca).lerp(C('#ffffff'), 0.4), sheenRoughness: 0.4,
      envMapIntensity: 0.8,
    });
    const m = new THREE.Mesh(g, mat);
    const rot = { 1: [0.3, 0.5, 0.2], 2: [0.6, -0.4, 0.3], 3: [0.1, 0.8, -0.2], 4: [-0.25, 0.35, 0.15], 5: [-0.22, 0.2, 0.3], 6: [-0.26, 0.24, 0.1], 7: [-0.3, 0.26, 0.12] }[level];
    m.rotation.set(...rot);
    scene.add(m);
    if (level === 7) {
      // a small glossy seed head in the cup of the bloom
      const sg = new THREE.SphereGeometry(0.27, 128, 96);
      const sp = sg.attributes.position;
      for (let i = 0; i < sp.count; i++) {
        const v = new THREE.Vector3(sp.getX(i), sp.getY(i), sp.getZ(i));
        const n = v.clone().normalize();
        const bump = 0.012 * Math.sin(n.x * 38) * Math.sin(n.y * 38) * Math.max(0, n.z);
        v.addScaledVector(n, bump);
        sp.setXYZ(i, v.x, v.y, v.z);
      }
      sg.computeVertexNormals();
      const seed = new THREE.Mesh(sg, new THREE.MeshPhysicalMaterial({
        color: C('#FFC21A'), roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.15,
        emissive: C('#FFB800'), emissiveIntensity: 0.1,
      }));
      seed.scale.set(1, 1, 0.55);
      seed.position.set(0, 0, 0.42);
      m.add(seed);
    }
    const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 50);
    camera.position.set(0, 0, 8);
    return { scene, camera };
  }

  // ================================================================ ring trophy
  function trophy() {
    const scene = new THREE.Scene();
    addRig(scene, { shadowExtent: 2.2, shadowSoft: 6, shadowIntensity: 0.6 });
    const group = new THREE.Group();
    scene.add(group);
    const a = 1.0, b = 0.55;
    const curves = [
      (t) => new THREE.Vector3(a * Math.cos(t), b * Math.sin(t), 0),
      (t) => new THREE.Vector3(0, a * Math.cos(t), b * Math.sin(t)),
      (t) => new THREE.Vector3(b * Math.sin(t), 0, a * Math.cos(t)),
    ];
    const cols = [IOS.orange, IOS.cyan, IOS.green];
    const deep = ['#FF7A12', '#12B4F2', '#22C24C'];
    const rings = new THREE.Group();
    curves.forEach((f, i) => {
      class E extends THREE.Curve { getPoint(t, o = new THREE.Vector3()) { return o.copy(f(t * Math.PI * 2)); } }
      const curve = new E();
      const core = new THREE.Mesh(new THREE.TubeGeometry(curve, 400, 0.066, 48, true), new THREE.MeshPhysicalMaterial({
        color: C(deep[i]), metalness: 0.0, roughness: 0.3, specularIntensity: 0.3,
        emissive: C(cols[i]), emissiveIntensity: 0.22, envMapIntensity: 0.55,
      }));
      core.castShadow = true; core.receiveShadow = true;
      const shell = new THREE.Mesh(new THREE.TubeGeometry(curve, 400, 0.13, 64, true), new THREE.MeshPhysicalMaterial({
        color: "#ffffff", metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.05, ior: 1.25,
        attenuationColor: C(cols[i]).lerp(C("#ffffff"), 0.3), attenuationDistance: 2.5, specularIntensity: 1.0, thicknessMap: null,
        envMapIntensity: 1.0,
      }));
      shell.renderOrder = 2;
      // coverage for compositing: clear glass lets ~45% of whatever is behind show through
      shell.userData.mask = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false });
      rings.add(core, shell);
    });
    rings.rotation.set(THREE.MathUtils.degToRad(28), THREE.MathUtils.degToRad(-38), THREE.MathUtils.degToRad(8));
    rings.updateMatrixWorld(true);
    // lowest point of the ring assembly -> stand
    let minY = Infinity, minP = new THREE.Vector3();
    curves.forEach((f) => {
      for (let i = 0; i < 2000; i++) {
        const v = f(i / 2000 * Math.PI * 2).applyMatrix4(rings.matrixWorld);
        if (v.y < minY) { minY = v.y; minP.copy(v); }
      }
    });
    rings.position.set(-minP.x, 0, -minP.z);
    group.add(rings);
    const ringBottom = minY - 0.13;
    // gold stand: stepped plinth + slender post
    const gold = metal('gold', { rough: 0.22 });
    const goldPol = metal('gold_bright', { rough: 0.1 });
    const baseTop = ringBottom - 0.42;
    const prof = filletPath([
      [0, baseTop - 0.26, 0], [0.62, baseTop - 0.26, 0.05], [0.62, baseTop - 0.12, 0.04], [0.5, baseTop - 0.07, 0.03],
      [0.46, baseTop, 0.03], [0, baseTop, 0],
    ], 10);
    const base = new THREE.Mesh(new THREE.LatheGeometry(prof, 256), gold);
    base.receiveShadow = true; base.castShadow = true;
    group.add(base);
    // dark enamel band
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.626, 0.626, 0.05, 256, 1, true), new THREE.MeshPhysicalMaterial({ color: '#111216', roughness: 0.3, clearcoat: 1 }));
    band.position.y = baseTop - 0.19;
    group.add(band);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, ringBottom - baseTop + 0.08, 64), goldPol);
    post.position.y = (ringBottom + baseTop) / 2 + 0.04;
    post.castShadow = true;
    group.add(post);
    const cup = new THREE.Mesh(new THREE.SphereGeometry(0.09, 48, 32), goldPol);
    cup.position.y = ringBottom + 0.05;
    group.add(cup);
    group.rotation.x = THREE.MathUtils.degToRad(6);
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    const ctr = box.getCenter(new THREE.Vector3());
    group.position.sub(ctr);
    const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 50);
    camera.position.set(0, 0.4, 9.5);
    camera.lookAt(0, 0, 0);
    return { scene, camera };
  }

  // ================================================================ gate shield
  function shield() {
    const scene = new THREE.Scene();
    addRig(scene, { shadowExtent: 1.6 });
    const group = new THREE.Group();
    scene.add(group);
    const S = 1.55;
    // back plate (deep green guilloché enamel) seen through the glass
    const back = extrudeNamed('shield', { scale: S, depth: 0.08, bevel: 0.03, segs: 4 });
    back.translate(0, 0, -0.2);
    const bb = bounds(SHAPES.shield);
    const backMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff', map: K.enamelColorMap('#1FBF5A', '#04411D', { spread: 0.7, vignette: 0.45, glow: 0.25 }),
      roughness: 0.45, specularIntensity: 0.3, bumpMap: guilloche('sunburst', { rays: 72, cy: 0.06 }), bumpScale: 0.5,
      emissive: C('#0B6B2E'), emissiveIntensity: 0.12,
    });
    planarUV(back, S * 0.62);
    const backM = new THREE.Mesh(back, backMat);
    backM.receiveShadow = true;
    group.add(backM);
    // glass pillow
    const glassG = extrudeNamed('shield_inner', { scale: S, depth: 0.04, bevel: 0.11, bevelSize: 0.09, segs: 10, crease: 70 });
    glassG.translate(0, 0, -0.12);
    const glass = new THREE.Mesh(glassG, new THREE.MeshPhysicalMaterial({
      color: '#ffffff', roughness: 0.03, transmission: 1, thickness: 0.35, ior: 1.5,
      attenuationColor: C('#2FD866'), attenuationDistance: 0.9, specularIntensity: 1, envMapIntensity: 1.2,
      iridescence: 0.15, iridescenceIOR: 1.3,
    }));
    glass.renderOrder = 2;
    group.add(glass);
    // gold frame
    const frame = extrudeNamed('shield_frame', { scale: S, depth: 0.2, bevel: 0.035, segs: 6 });
    frame.translate(0, 0, -0.22);
    const fm = new THREE.Mesh(frame, [metal('gold', { rough: 0.22, env: 1.3 }), metal('gold_bright', { rough: 0.08, env: 1.2 })]);
    fm.castShadow = true;
    group.add(fm);
    // check mark: a polished gold rod with rounded ends, resting on the glass
    const k = S * 0.6;
    const P = [[-0.41, 0.005], [-0.13, -0.285], [0.41, 0.285]].map(([x, y]) => new THREE.Vector3(x * k, (y - 0.01) * k, 0));
    const fil = 0.07 * k;
    const dirA = P[0].clone().sub(P[1]).normalize(), dirB = P[2].clone().sub(P[1]).normalize();
    const pa = P[1].clone().addScaledVector(dirA, fil), pb = P[1].clone().addScaledVector(dirB, fil);
    const path = new THREE.CurvePath();
    path.add(new THREE.LineCurve3(P[0], pa));
    path.add(new THREE.QuadraticBezierCurve3(pa, P[1].clone(), pb));
    path.add(new THREE.LineCurve3(pb, P[2]));
    const rr = 0.088 * k / 0.6 * 0.62;
    const checkMat = metal('gold_bright', { rough: 0.14, env: 1.4, color: '#FFD47A' });
    const rod = new THREE.Mesh(new THREE.TubeGeometry(path, 300, rr, 64, false), checkMat);
    rod.castShadow = true;
    const chk = new THREE.Group();
    chk.add(rod);
    for (const e of [P[0], P[2]]) { const c = new THREE.Mesh(new THREE.SphereGeometry(rr, 64, 48), checkMat); c.position.copy(e); chk.add(c); }
    chk.position.z = 0.14 + rr * 0.55;
    group.add(chk);
    group.rotation.set(THREE.MathUtils.degToRad(-6), THREE.MathUtils.degToRad(16), 0, 'YXZ');
    const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 50);
    camera.position.set(0, 0, 8);
    return { scene, camera };
  }

  // ================================================================ app icon mark
  function gmark(p) {
    const scene = new THREE.Scene();
    addRig(scene, { shadowExtent: 1.4, shadowSoft: 8, shadowIntensity: 0.55, key: 2.2 });
    const group = new THREE.Group();
    scene.add(group);
    const pts = SHAPES.g_path[0].outer.map(([x, y]) => new THREE.Vector3(x, y, 0));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const tubeR = 0.118;
    const goldMat = metal('gold', { rough: 0.17, env: 1.35, color: '#FFC94D' });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 600, tubeR, 64, false), goldMat);
    tube.castShadow = true;
    group.add(tube);
    for (const e of [pts[0], pts[pts.length - 1]]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(tubeR, 64, 48), goldMat);
      cap.position.copy(e);
      group.add(cap);
    }
    if (p.glassDisc !== false) {
      // frosted glass lens behind the G (iOS 26 layered glass)
      const prof = filletPath([[0, -0.07, 0], [0.74, -0.07, 0.06], [0.74, 0.07, 0.06], [0, 0.07, 0]], 12);
      const disc = new THREE.Mesh(latheZ(prof, 256), new THREE.MeshPhysicalMaterial({
        color: '#ffffff', roughness: 0.42, transmission: 1, thickness: 0.3, ior: 1.45,
        attenuationColor: C('#6D7CFF'), attenuationDistance: 0.6, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.04,
        emissive: C('#3A40B8'), emissiveIntensity: 0.32, iridescence: 0.25, iridescenceIOR: 1.3,
      }));
      disc.position.z = -0.32;
      disc.receiveShadow = true;
      disc.renderOrder = 2;
      group.add(disc);
    }
    group.rotation.set(THREE.MathUtils.degToRad(-4), THREE.MathUtils.degToRad(8), 0);
    const dist = p.dist ?? 5.6;
    const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 50);
    camera.position.set(0, 0, dist);
    if (p.background) {
      // the icon's own backdrop (exactly fills the frame), so the glass refracts something real
      const zb = -1.4;
      const size = 2 * (dist - zb) * Math.tan(THREE.MathUtils.degToRad(10));
      const tex = canvasTexture(1024, 1024, (u, v) => {
        const top = [0.035, 0.035, 0.06], bot = [0.085, 0.09, 0.25];
        const t = Math.min(1, Math.max(0, v * 0.9 + u * 0.12));
        let c = top.map((a, i) => a * (1 - t) + bot[i] * t);
        const d = Math.hypot(u - 0.5, v - 0.48);
        const gl = Math.exp(-((d / 0.3) ** 2));
        c = c.map((a, i) => a + gl * [0.2, 0.13, 0.03][i] * 0.5);
        const ind = Math.exp(-(((u - 0.5) ** 2) / 0.25 + ((v - 1.05) ** 2) / 0.08));
        c = c.map((a, i) => a + ind * [0.1, 0.1, 0.3][i] * 0.5);
        return c.map((a) => Math.min(255, a * 255));
      }, { srgb: true });
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      bg.position.z = zb;
      scene.add(bg);
    }
    return { scene, camera };
  }

  return { orb, mood, trophy, shield, gmark };
}
