import * as THREE from 'three';
import { noise } from '../shaders/noise.js';

// Per-world props that say what each world stands for.
// Things on `body` spin with the surface; things on `tiltGroup` stay put relative to the equator.
export const controlsState = { trainSpeed: 1 };

const builders = {
  emerald: decorateEmerald,
  hashport: decorateHashport,
  ares: decorateAres,
  railhead: decorateRailhead,
  ferris: decorateFerris,
  verdance: decorateVerdance,
};

export function decorate(entry) {
  return builders[entry.def.id]?.(entry) ?? null;
}

const UP = new THREE.Vector3(0, 1, 0);

function placeOnSurface(obj, radius, lat, lon, sink = 0) {
  const dir = new THREE.Vector3(
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.sin(lon)
  );
  obj.position.copy(dir).multiplyScalar(radius - sink);
  obj.quaternion.setFromUnitVectors(UP, dir);
  return obj;
}

function randomSurfacePoint(rand) {
  return { lat: Math.asin(rand() * 2 - 1), lon: rand() * Math.PI * 2 };
}

// Deterministic so the worlds look the same on every visit.
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ---------------- Emerald: Seattle ---------------- */
function decorateEmerald({ def, body }) {
  const r = def.radius;
  const lit = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2 });

  // The Space Needle, exaggerated so it reads from orbit.
  const needle = new THREE.Group();
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.035, 0.3, 6), lit('#d9dde6'));
  legs.position.y = 0.15;
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.03, 0.035, 16), lit('#f4f6fb'));
  saucer.position.y = 0.31;
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.006, 6, 24), lit('#ffb347'));
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.31;
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.008, 0.12, 4), lit('#ffffff'));
  spire.position.y = 0.39;
  needle.add(legs, saucer, halo, spire);
  body.add(placeOnSurface(needle, r, 0.83, 0.4, 0.01));

  // Rainier: a broad cone with a snow cap, off to the south-east.
  const mountain = new THREE.Group();
  const rock = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.22, 20), lit('#4a5b52'));
  rock.position.y = 0.09;
  const snow = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.11, 20), lit('#ffffff'));
  snow.position.y = 0.155;
  mountain.add(rock, snow);
  body.add(placeOnSurface(mountain, r, 0.72, 0.62, 0.03));

  // Cloud shell: noise-masked, drifting independently of the surface.
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(r * 1.035, 64, 64),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec3 vObj; varying vec3 vWorld; varying vec3 vN;
        void main(){
          vObj = position;
          vec4 w = modelMatrix * vec4(position,1.0);
          vWorld = w.xyz; vN = normalize(mat3(modelMatrix)*normal);
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; varying vec3 vObj; varying vec3 vWorld; varying vec3 vN;
        ${noise}
        void main(){
          vec3 p = normalize(vObj) * 2.6 + vec3(uTime*0.03, 0.0, uTime*0.015);
          float c = smoothstep(0.05, 0.55, fbm(p));
          float light = 0.15 + 0.85 * max(dot(normalize(vN), normalize(-vWorld)), 0.0);
          gl_FragColor = vec4(vec3(0.92,0.95,1.0) * light, c * 0.75);
        }`,
    })
  );

  // Rain: short streaks falling towards the surface, recycled in the shader.
  const drops = 700;
  const rand = seeded(42);
  const pos = new Float32Array(drops * 2 * 3);
  const phase = new Float32Array(drops * 2);
  const dir = new THREE.Vector3();
  for (let i = 0; i < drops; i++) {
    const { lat, lon } = randomSurfacePoint(rand);
    dir.set(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
    const ph = rand();
    // both ends store the direction; the shader decides where along the fall each one is
    pos.set([dir.x, dir.y, dir.z, dir.x, dir.y, dir.z], i * 6);
    phase[i * 2] = ph;
    phase[i * 2 + 1] = ph + 0.03;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  rainGeo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const rain = new THREE.LineSegments(
    rainGeo,
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uR: { value: r } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aPhase; uniform float uTime; uniform float uR; varying float vA;
        void main(){
          float f = fract(aPhase + uTime * 0.6);
          float h = mix(uR * 1.25, uR * 1.0, f);
          vA = sin(f * 3.14159) * 0.6;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position * h, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main(){ gl_FragColor = vec4(vec3(0.6,0.8,1.0)*vA, vA); }`,
    })
  );
  rain.frustumCulled = false;

  const sky = new THREE.Group();
  sky.add(clouds, rain);
  body.parent.add(sky);

  return {
    update(t) {
      clouds.material.uniforms.uTime.value = t;
      rain.material.uniforms.uTime.value = t;
      sky.rotation.y = t * 0.05;
    },
  };
}

/* ---------------- Hashport: Slack ---------------- */
function decorateHashport({ def, body }) {
  const colors = ['#36c5f0', '#2eb67d', '#ecb22e', '#e01e5a'];
  const hash = new THREE.Group();
  const len = 2.2;
  const gap = 0.42;
  const geo = new THREE.CapsuleGeometry(0.16, len, 6, 16);

  // Two vertical and two horizontal bars, offset like a channel symbol.
  const bars = [
    { x: -gap, y: 0, rot: 0 },
    { x: gap, y: 0, rot: 0 },
    { x: 0, y: gap, rot: Math.PI / 2 },
    { x: 0, y: -gap, rot: Math.PI / 2 },
  ];
  bars.forEach((b, i) => {
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color: colors[i],
        emissive: colors[i],
        emissiveIntensity: 0.25,
        roughness: 0.35,
        metalness: 0.3,
      })
    );
    m.position.set(b.x, b.y, 0);
    m.rotation.z = b.rot;
    hash.add(m);
  });
  hash.rotation.z = 0.18; // a little slant, like a typed #
  hash.scale.setScalar(def.radius * 0.55);
  body.add(hash);

  // Pings: bright motes travelling along each bar, like messages in flight.
  const pingGeo = new THREE.SphereGeometry(0.07, 10, 10);
  const pings = [];
  for (let i = 0; i < 8; i++) {
    const bar = bars[i % 4];
    const mesh = new THREE.Mesh(pingGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true }));
    hash.add(mesh);
    pings.push({ mesh, bar, offset: i * 0.37, speed: 0.4 + (i % 3) * 0.15 });
  }

  // Docking lights around the station.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(def.radius * 1.15, 0.015, 6, 96),
    new THREE.MeshBasicMaterial({ color: '#c9b6ff', transparent: true, opacity: 0.45 })
  );
  ring.rotation.x = Math.PI / 2;
  body.parent.add(ring);

  let burst = 0;
  return {
    ping() {
      burst = 1;
    },
    update(t) {
      burst = Math.max(0, burst - 0.01);
      for (const p of pings) {
        const f = ((t * p.speed + p.offset) % 1) * 2 - 1; // -1..1 along the bar
        const along = (f * len) / 2;
        if (p.bar.rot === 0) p.mesh.position.set(p.bar.x, along, 0.17);
        else p.mesh.position.set(along, p.bar.y, 0.17);
        p.mesh.material.opacity = 0.35 + 0.65 * Math.sin((f * 0.5 + 0.5) * Math.PI);
        p.mesh.scale.setScalar(1 + burst * 2);
      }
      ring.rotation.z = -t * 0.2;
    },
  };
}

/* ---------------- Ares Archive: Mars data ---------------- */
function decorateAres({ def, body }) {
  const r = def.radius;
  const rand = seeded(7);
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; varying vec2 vUv;
      void main(){
        float fade = pow(1.0 - vUv.y, 1.6);
        float pulse = 0.5 + 0.5 * sin(vUv.y * 18.0 - uTime * 4.0);
        float a = fade * (0.45 + 0.55 * pulse);
        gl_FragColor = vec4(vec3(1.0, 0.62, 0.38) * a, a);
      }`,
  });
  const beacons = [];
  for (let i = 0; i < 14; i++) {
    const { lat, lon } = randomSurfacePoint(rand);
    const g = new THREE.Group();
    const h = 0.35 + rand() * 0.55;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, h, 6, 1, true), beamMat);
    beam.position.y = h / 2;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: '#ffd2b0' }));
    g.add(beam, cap);
    body.add(placeOnSurface(g, r, lat, lon));
    beacons.push({ g, phase: rand() * Math.PI * 2 });
  }
  return {
    update(t) {
      beamMat.uniforms.uTime.value = t;
      for (const b of beacons) b.g.scale.y = 0.6 + 0.4 * Math.sin(t * 1.3 + b.phase);
    },
  };
}

/* ---------------- Railhead: train-game ---------------- */
function decorateRailhead({ def, tiltGroup }) {
  const trackR = def.radius * 1.45;
  const railMat = new THREE.MeshStandardMaterial({ color: '#c8ccd6', metalness: 0.8, roughness: 0.3 });
  const track = new THREE.Group();
  for (const off of [-0.05, 0.05]) {
    const rail = new THREE.Mesh(new THREE.TorusGeometry(trackR + off, 0.012, 6, 200), railMat);
    rail.rotation.x = Math.PI / 2;
    track.add(rail);
  }

  // Sleepers, instanced around the loop.
  const tieCount = 160;
  const ties = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.035, 0.012, 0.16),
    new THREE.MeshStandardMaterial({ color: '#5a3b24', roughness: 0.9 }),
    tieCount
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3(1, 1, 1);
  const p = new THREE.Vector3();
  for (let i = 0; i < tieCount; i++) {
    const a = (i / tieCount) * Math.PI * 2;
    p.set(Math.cos(a) * trackR, -0.012, Math.sin(a) * trackR);
    q.setFromAxisAngle(UP, -a);
    ties.setMatrixAt(i, m.compose(p, q, s));
  }
  track.add(ties);

  // A faint ring of track-bed so the loop reads from far away.
  const bed = new THREE.Mesh(
    new THREE.RingGeometry(trackR - 0.12, trackR + 0.12, 160),
    new THREE.MeshBasicMaterial({ color: '#f1d29a', transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })
  );
  bed.rotation.x = -Math.PI / 2;
  bed.position.y = -0.02;
  track.add(bed);
  tiltGroup.add(track);

  // The train: a locomotive and five cars in tycoon colours.
  const train = new THREE.Group();
  const carColors = ['#c0392b', '#2c3e50', '#16a085', '#f39c12', '#8e44ad', '#2980b9'];
  const cars = carColors.map((color, i) => {
    const car = new THREE.Group();
    const isEngine = i === 0;
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(isEngine ? 0.3 : 0.24, 0.1, 0.11),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 })
    );
    box.position.y = 0.06;
    car.add(box);
    if (isEngine) {
      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.1), box.material);
      cab.position.set(-0.08, 0.14, 0);
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.08, 8), railMat);
      stack.position.set(0.08, 0.15, 0);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshBasicMaterial({ color: '#fff3c4' }));
      lamp.position.set(0.155, 0.07, 0);
      car.add(cab, stack, lamp);
    }
    train.add(car);
    return car;
  });
  tiltGroup.add(train);

  // Smoke puffs that drift up from the stack and fade.
  const puffs = Array.from({ length: 10 }, (_, i) => {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshBasicMaterial({ color: '#e8e2d8', transparent: true, depthWrite: false })
    );
    tiltGroup.add(puff);
    return { puff, offset: i / 10 };
  });

  let angle = 0;
  let last = 0;
  const spacing = 0.13;
  return {
    update(t) {
      const dt = Math.min(t - last, 0.1);
      last = t;
      angle += dt * 0.35 * controlsState.trainSpeed;
      cars.forEach((car, i) => {
        const a = angle - i * spacing;
        car.position.set(Math.cos(a) * trackR, 0, Math.sin(a) * trackR);
        car.rotation.y = -a - Math.PI / 2;
      });
      for (const { puff, offset } of puffs) {
        const life = (t * 0.8 + offset) % 1;
        const a = angle + 0.03 - life * 0.25;
        puff.position.set(Math.cos(a) * trackR, 0.2 + life * 0.35, Math.sin(a) * trackR);
        puff.scale.setScalar(0.6 + life * 2.2);
        puff.material.opacity = (1 - life) * 0.55;
      }
    },
  };
}

/* ---------------- Ferris: Rust & Bevy ---------------- */
function decorateFerris({ def, body }) {
  // Two little claws, so the crab is unmistakable up close.
  const mat = new THREE.MeshStandardMaterial({ color: '#f26b2a', roughness: 0.5 });
  const claws = [-1, 1].map((side) => {
    const claw = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.22, 6), mat);
    arm.position.y = 0.1;
    const pincer = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), mat);
    pincer.scale.set(1, 1.3, 0.7);
    pincer.position.y = 0.24;
    claw.add(arm, pincer);
    body.add(placeOnSurface(claw, def.radius, 0.35, Math.PI / 2 + side * 0.55, 0.02));
    return claw;
  });
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#1a0d06' });
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
    body.add(placeOnSurface(eye, def.radius, 0.45, Math.PI / 2 + side * 0.2, 0.01));
  });
  return {
    update(t) {
      claws.forEach((c, i) => (c.children[1].rotation.z = Math.sin(t * 3 + i * Math.PI) * 0.4));
    },
  };
}

/* ---------------- Verdance: garden-game ---------------- */
function decorateVerdance({ def, body }) {
  const r = def.radius;
  const count = 520;
  const rand = seeded(2024);
  const petals = ['#ff8fb1', '#ffd36e', '#f7f7ff', '#c49bff', '#ff7a59', '#7fd4ff'];

  const stems = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.004, 0.006, 1, 4).translate(0, 0.5, 0),
    new THREE.MeshStandardMaterial({ color: '#3f7a2e', roughness: 0.8 }),
    count
  );
  const heads = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: '#331a2a', emissiveIntensity: 0.4 }),
    count
  );
  const flowers = [];
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const { lat, lon } = randomSurfacePoint(rand);
    const dir = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
    const height = 0.05 + rand() * 0.08;
    flowers.push({ dir, height, phase: rand() * Math.PI * 2, size: 0.016 + rand() * 0.018 });
    heads.setColorAt(i, color.set(petals[(rand() * petals.length) | 0]));
  }
  stems.frustumCulled = heads.frustumCulled = false;
  body.add(stems, heads);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sway = new THREE.Quaternion();
  const axis = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const camLocal = new THREE.Vector3();
  let bloom = 0;

  return {
    // Flowers open as the camera approaches.
    setCameraDistance(d) {
      const target = THREE.MathUtils.clamp(1 - (d - r * 3) / (r * 10), 0.35, 1);
      bloom += (target - bloom) * 0.05;
    },
    update(t) {
      for (let i = 0; i < count; i++) {
        const f = flowers[i];
        q.setFromUnitVectors(UP, f.dir);
        axis.set(f.dir.z, 0, -f.dir.x);
        if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0);
        sway.setFromAxisAngle(axis.normalize(), Math.sin(t * 1.6 + f.phase) * 0.25);
        q.premultiply(sway);
        pos.copy(f.dir).multiplyScalar(r * 0.995);
        stems.setMatrixAt(i, m.compose(pos, q, scl.set(1, f.height, 1)));
        // head sits at the top of the (swayed) stem
        camLocal.set(0, f.height, 0).applyQuaternion(q);
        pos.add(camLocal);
        const s = f.size * (0.4 + bloom * 0.9);
        heads.setMatrixAt(i, m.compose(pos, q, scl.set(s, s * 0.7, s)));
      }
      stems.instanceMatrix.needsUpdate = true;
      heads.instanceMatrix.needsUpdate = true;
    },
  };
}
