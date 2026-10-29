import * as THREE from 'three';

// Night City Seattle: a rooftop above a neon skyline.
// The rooftop is at y = 0; the street is far below at y = STREET.
const STREET = -40;
const NEON = ['#ff2a6d', '#05d9e8', '#f9f002', '#b967ff', '#3cffa0'];
const NEEDLE_AT = { x: -62, z: -250 };
// Signs float in front of the skyline; buildings keep out of these spots so nothing swallows them.
const SIGNS = [
  { text: 'ANIRUDH', opts: { color: '#ff2a6d', vertical: true }, pos: [23, 7, -52], height: 21, rotY: -0.3 },
  { text: 'SEATTLE', opts: { color: '#05d9e8' }, pos: [-27, 21, -70], height: 7, rotY: 0.3 },
  { text: '#', opts: { color: '#f9f002', size: 220 }, pos: [-21, 6, -40], height: 8, rotY: 0.45 },
  { text: 'OPEN 24/7', opts: { color: '#b967ff', size: 120 }, pos: [31, 2, -38], height: 3.5, rotY: -0.5 },
  { text: 'RAILHEAD EXPRESS', opts: { color: '#3cffa0', size: 110 }, pos: [6, 34, -120], height: 6, rotY: 0 },
];
const KEEP_OUT = [{ x: NEEDLE_AT.x, z: NEEDLE_AT.z, r: 26 }, ...SIGNS.map((s) => ({ x: s.pos[0], z: s.pos[2], r: 12 }))];

function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function createCity() {
  const group = new THREE.Group();
  const updaters = [];
  const rand = seeded(2077);

  group.add(createSky());
  const skyline = createSkyline(rand);
  group.add(skyline.mesh);
  updaters.push(skyline.update);
  group.add(createStreet());
  group.add(createRooftop(rand));
  group.add(createNeedle());

  const signs = createSigns(rand);
  group.add(signs.group);
  updaters.push(signs.update);

  const traffic = createTraffic(rand);
  group.add(traffic.group);
  updaters.push(traffic.update);

  return {
    group,
    update(t, dt) {
      for (const u of updaters) u(t, dt);
    },
  };
}

/* ---------- sky: smoggy gradient, lit pink by the city ---------- */
function createSky() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(1200, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec3 vDir;
        void main(){
          float h = vDir.y;
          vec3 zenith = vec3(0.012, 0.008, 0.03);
          vec3 haze = vec3(0.22, 0.04, 0.2);
          vec3 low = vec3(0.05, 0.12, 0.2);
          vec3 col = mix(haze, zenith, smoothstep(-0.02, 0.45, h));
          col = mix(col, low, smoothstep(0.0, -0.2, h));
          gl_FragColor = vec4(col, 1.0);
        }`,
    })
  );
}

/* ---------- skyline: one instanced draw call, windows lit procedurally ---------- */
function createSkyline(rand) {
  const spots = [];
  for (let gx = -300; gx <= 300; gx += 22) {
    for (let gz = -420; gz <= 120; gz += 22) {
      const x = gx + (rand() - 0.5) * 10;
      const z = gz + (rand() - 0.5) * 10;
      if (Math.abs(x) < 26 && z > -30 && z < 40) continue; // our own building's block
      if (KEEP_OUT.some((k) => Math.hypot(x - k.x, z - k.z) < k.r)) continue;
      if (rand() < 0.12) continue;
      const dist = Math.hypot(x, z);
      const tall = Math.pow(rand(), 2.2);
      const h = 18 + tall * (dist < 120 ? 120 : 160) + (rand() < 0.04 ? 80 : 0);
      spots.push({ x, z, w: 8 + rand() * 11, d: 8 + rand() * 11, h });
    }
  }
  const count = spots.length;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const seeds = new Float32Array(count);
  const tints = new Float32Array(count * 3);
  const mat4 = new THREE.Matrix4();
  const tint = new THREE.Color();
  const mesh = new THREE.InstancedMesh(
    geo,
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uFog: { value: new THREE.Color('#1a0820') } },
      vertexShader: /* glsl */ `
        attribute float aSeed; attribute vec3 aTint;
        varying vec3 vLocal; varying vec3 vNormal; varying vec3 vScale; varying float vSeed; varying vec3 vTint; varying float vDist;
        void main(){
          vScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
          vLocal = position * vScale;
          vNormal = normal;
          vSeed = aSeed; vTint = aTint;
          vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
          vec4 mv = viewMatrix * wp;
          vDist = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform vec3 uFog;
        varying vec3 vLocal; varying vec3 vNormal; varying vec3 vScale; varying float vSeed; varying vec3 vTint; varying float vDist;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){
          vec3 col = vec3(0.012, 0.012, 0.025);
          if (abs(vNormal.y) < 0.5) {
            float u = abs(vNormal.x) > 0.5 ? vLocal.z : vLocal.x;
            vec2 cell = vec2(floor(u / 1.4), floor(vLocal.y / 1.9));
            vec2 f = vec2(fract(u / 1.4), fract(vLocal.y / 1.9));
            float win = step(0.18, f.x) * step(f.x, 0.82) * step(0.25, f.y) * step(f.y, 0.75);
            float h = hash(cell + vSeed * 17.0 + vNormal.xz * 3.0);
            float lit = step(0.62, h);
            // a few windows flicker off and on
            lit *= step(0.02, fract(h * 91.0 + floor(uTime * 0.25 + h * 13.0) * 0.37));
            vec3 warm = mix(vec3(1.0, 0.72, 0.4), vec3(0.45, 0.85, 1.0), step(0.85, h));
            warm = mix(warm, vTint, step(0.95, h));
            col += win * lit * warm * (0.55 + 0.6 * hash(cell * 1.7));
            // neon strip around the roofline
            float roof = smoothstep(vScale.y - 1.2, vScale.y - 0.6, vLocal.y) * (1.0 - smoothstep(vScale.y - 0.6, vScale.y - 0.2, vLocal.y));
            col += vTint * roof * step(0.45, fract(vSeed * 7.3)) * 2.2;
          }
          float fog = 1.0 - exp(-pow(vDist * 0.0042, 1.6));
          col = mix(col, uFog, fog);
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
    count
  );
  spots.forEach((s, i) => {
    mat4.compose(new THREE.Vector3(s.x, STREET, s.z), new THREE.Quaternion(), new THREE.Vector3(s.w, s.h, s.d));
    mesh.setMatrixAt(i, mat4);
    seeds[i] = rand();
    tint.set(NEON[(rand() * NEON.length) | 0]);
    tints.set([tint.r, tint.g, tint.b], i * 3);
  });
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tints, 3));
  mesh.frustumCulled = false;
  return { mesh, update: (t) => (mesh.material.uniforms.uTime.value = t) };
}

/* ---------- street: a dark plane glowing with reflected neon ---------- */
function createStreet() {
  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 1400),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#12061a') })
  );
  street.rotation.x = -Math.PI / 2;
  street.position.y = STREET;
  return street;
}

/* ---------- our rooftop: wet floor, parapet with a neon edge, a desk ---------- */
function createRooftop(rand) {
  const g = new THREE.Group();
  const wet = new THREE.MeshStandardMaterial({ color: '#0d0c14', roughness: 0.18, metalness: 0.7 });
  const concrete = new THREE.MeshStandardMaterial({ color: '#16151d', roughness: 0.85, metalness: 0.1 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), wet);
  floor.rotation.x = -Math.PI / 2;
  g.add(floor);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), concrete);
  tower.position.y = -20.01;
  g.add(tower);

  // parapet walls and their neon top edge
  const edgeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 2.2, 2.6) });
  for (const [x, z, w, d] of [[0, -20, 40, 0.5], [0, 20, 40, 0.5], [-20, 0, 0.5, 40], [20, 0, 0.5, 40]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, d), concrete);
    wall.position.set(x, 0.55, z);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.04, d + 0.02), edgeMat);
    strip.position.set(x, 1.12, z);
    g.add(wall, strip);
  }

  // rooftop clutter: AC units, a water tank, an antenna with a blinking light
  for (let i = 0; i < 7; i++) {
    const s = 0.8 + rand() * 1.6;
    const box = new THREE.Mesh(new THREE.BoxGeometry(s * 1.4, s, s), concrete);
    const a = rand() * Math.PI * 2;
    const r = 7 + rand() * 9;
    box.position.set(Math.cos(a) * r, s / 2, Math.sin(a) * r - 4);
    g.add(box);
  }
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3, 20), concrete);
  tank.position.set(-9, 4.5, -11);
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 3, 6, 1, true), concrete);
  legs.position.set(-9, 1.5, -11);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 9, 6), concrete);
  antenna.position.set(11, 4.5, -12);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.2, 0.3) }));
  beacon.position.set(11, 9.1, -12);
  beacon.name = 'beacon';
  g.add(tank, legs, antenna, beacon);

  // the desk the CRT sits on
  const deskMat = new THREE.MeshStandardMaterial({ color: '#1e1b26', roughness: 0.4, metalness: 0.5 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 1.6), deskMat);
  top.position.y = 0.92;
  g.add(top);
  for (const [x, z] of [[-1.5, -0.7], [1.5, -0.7], [-1.5, 0.7], [1.5, 0.7]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.92, 0.06), deskMat);
    leg.position.set(x, 0.46, z);
    g.add(leg);
  }
  const deskStrip = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.006, 0.006), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 0.15, 0.5) }));
  deskStrip.position.set(0, 0.88, 0.8);
  g.add(deskStrip);
  return g;
}

/* ---------- the Space Needle, in neon ---------- */
function createNeedle() {
  const pts = [];
  const H = 150; // tall enough to rise well above our roof
  const ring = (y, r, n = 48) => {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a0) * r, y, Math.sin(a0) * r), new THREE.Vector3(Math.cos(a1) * r, y, Math.sin(a1) * r));
    }
  };
  // three leg pairs pinched at the waist (the hourglass)
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    for (const off of [-0.18, 0.18]) {
      let prev = null;
      for (let s = 0; s <= 24; s++) {
        const t = s / 24;
        const y = t * H * 0.78;
        const r = 3 + 11 * Math.pow(Math.abs(t - 0.38) / 0.62, 1.6) * (t < 0.38 ? 1.7 : 0.55);
        const p = new THREE.Vector3(Math.cos(a + off) * r, y, Math.sin(a + off) * r);
        if (prev) pts.push(prev, p);
        prev = p;
      }
    }
  }
  ring(H * 0.38, 4.2); // the waist ring
  ring(H * 0.78, 13); // the saucer
  ring(H * 0.8, 15.5);
  ring(H * 0.83, 12);
  pts.push(new THREE.Vector3(0, H * 0.83, 0), new THREE.Vector3(0, H, 0)); // spire
  const lines = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: new THREE.Color(0.25, 2.4, 2.8), fog: false })
  );
  lines.position.set(NEEDLE_AT.x, STREET, NEEDLE_AT.z);
  return lines;
}

/* ---------- neon signs ---------- */
function neonTexture(text, { color, vertical = false, size = 160, font = '700' } = {}) {
  const c = document.createElement('canvas');
  const chars = [...text];
  const pad = size * 0.5;
  c.width = vertical ? size + pad * 2 : chars.length * size * 0.66 + pad * 2;
  c.height = vertical ? chars.length * size * 0.95 + pad * 2 : size + pad * 2;
  const ctx = c.getContext('2d');
  ctx.font = `${font} ${size}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = color;
  // a pale core in the tube's own colour, not pure white, so bloom doesn't wash it out
  ctx.fillStyle = `color-mix(in srgb, ${color} 45%, white)`;
  ctx.lineWidth = size * 0.06;
  const draw = (blur) => {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    chars.forEach((ch, i) => {
      const x = vertical ? c.width / 2 : pad + (i + 0.5) * size * 0.66;
      const y = vertical ? pad + (i + 0.5) * size * 0.95 : c.height / 2;
      ctx.strokeText(ch, x, y);
      ctx.fillText(ch, x, y);
    });
  };
  draw(size * 0.6);
  draw(size * 0.15);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, aspect: c.width / c.height };
}

function createSigns(rand) {
  const group = new THREE.Group();
  const signs = [];
  const add = (text, opts, pos, height, rotY = 0) => {
    const { tex, aspect } = neonTexture(text, opts);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    mat.color.setScalar(0.85);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(height * aspect, height), mat);
    mesh.position.copy(pos);
    mesh.rotation.y = rotY;
    group.add(mesh);
    signs.push({ mat, phase: rand() * 100, base: 0.85 });
  };
  for (const s of SIGNS) add(s.text, s.opts, new THREE.Vector3(...s.pos), s.height, s.rotY);
  return {
    group,
    update(t) {
      // neon buzz: mostly steady, the odd stutter
      for (const s of signs) {
        const k = Math.sin(t * 0.7 + s.phase) > 0.985 ? (Math.sin(t * 60) > 0 ? 0.3 : 1) : 1;
        s.mat.color.setScalar(s.base * k);
      }
    },
  };
}

/* ---------- flying cars on traffic lanes ---------- */
function createTraffic(rand) {
  const lanes = [];
  for (let i = 0; i < 9; i++) {
    lanes.push({ y: 6 + i * 6 + rand() * 4, z: -40 - i * 18 - rand() * 10, dir: i % 2 ? 1 : -1, speed: 18 + rand() * 22 });
  }
  const count = 70;
  const cars = Array.from({ length: count }, (_, i) => ({ lane: lanes[i % lanes.length], x: (rand() - 0.5) * 600, jitter: rand() }));
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.35, 0.35), new THREE.MeshBasicMaterial({ fog: false }), count);
  const color = new THREE.Color();
  cars.forEach((c, i) => {
    // heading towards us: white headlights; away: red tail lights
    color.set(c.lane.dir > 0 ? '#ff2a4d' : '#ffffff').multiplyScalar(2.2);
    if (c.jitter > 0.85) color.set('#05d9e8').multiplyScalar(2.4);
    mesh.setColorAt(i, color);
  });
  mesh.frustumCulled = false;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3(3.2, 1, 1);
  const group = new THREE.Group();
  group.add(mesh);
  return {
    group,
    update(t, dt) {
      cars.forEach((c, i) => {
        c.x += c.lane.dir * c.lane.speed * dt;
        if (c.x > 320) c.x = -320;
        if (c.x < -320) c.x = 320;
        p.set(c.x, c.lane.y + Math.sin(t * 0.8 + c.jitter * 9) * 0.4, c.lane.z + c.jitter * 6);
        m4.compose(p, q, s);
        mesh.setMatrixAt(i, m4);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
