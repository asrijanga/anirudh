import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { heightAt } from './terrain.js';
import { fbm2, seeded, smoothstep } from './noise.js';

// We look down -z into the clearing. The sun sits low and a little to the right;
// Rainier rises far away on the left.
export const SUN = { elevation: 13, azimuth: 0.3 };
export function sunDirection(elevationDeg = SUN.elevation, azimuth = SUN.azimuth, out = new THREE.Vector3()) {
  const el = THREE.MathUtils.degToRad(elevationDeg);
  return out.set(Math.sin(azimuth) * Math.cos(el), Math.sin(el), -Math.cos(azimuth) * Math.cos(el));
}
export const HAZE = new THREE.Color('#c4c9c4');

/* ---------- sky ---------- */
export function createSky() {
  const sky = new Sky();
  sky.scale.setScalar(10000);
  const u = sky.material.uniforms;
  u.turbidity.value = 3.2;
  u.rayleigh.value = 1.2;
  u.mieCoefficient.value = 0.0035;
  u.mieDirectionalG.value = 0.8;
  return {
    mesh: sky,
    setSun(dir) {
      u.sunPosition.value.copy(dir).multiplyScalar(1000);
    },
  };
}

/* ---------- conifers: Douglas fir and western red cedar ---------- */
function coloured(geo, color) {
  const g = geo.toNonIndexed();
  g.deleteAttribute('uv');
  const c = new THREE.Color(color);
  const arr = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < arr.length; i += 3) arr.set([c.r, c.g, c.b], i);
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function conifer({ tiers, base, top, colors }) {
  // unit height 1; tiers of cones narrowing to a spire
  const parts = [coloured(new THREE.CylinderGeometry(0.012, 0.02, 0.25, 6).translate(0, 0.125, 0), '#4a3424')];
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const y0 = 0.12 + t * 0.7;
    const r = THREE.MathUtils.lerp(base, top, t);
    const h = 0.34 - t * 0.12;
    parts.push(coloured(new THREE.ConeGeometry(r, h, 9, 1).translate(0, y0 + h / 2, 0), colors[i % colors.length]));
  }
  return mergeGeometries(parts);
}

export function createWoods(quality) {
  const rand = seeded(42);
  const firGeo = conifer({ tiers: 6, base: 0.2, top: 0.05, colors: ['#1f3a22', '#244426', '#1b3320'] });
  const cedarGeo = conifer({ tiers: 5, base: 0.24, top: 0.07, colors: ['#2b4a26', '#30522a', '#26421f'] });
  const spots = [];
  const place = (count, rMin, rMax, keepOpen) => {
    for (let n = 0; n < count; n++) {
      const a = rand() * Math.PI * 2;
      const r = rMin + Math.sqrt(rand()) * (rMax - rMin);
      const x = Math.sin(a) * r, z = -Math.cos(a) * r;
      const ang = Math.abs(Math.atan2(x, -z)); // 0 = straight ahead
      if (ang < keepOpen && r < 170) continue; // keep the view into the clearing open
      if (rand() > 0.55 + 0.45 * smoothstep(-0.3, 0.3, fbm2(x * 0.02, z * 0.02, 2))) continue; // groves, not a grid
      spots.push({ x, z, h: 16 + rand() * 26 + (r > 150 ? 6 : 0), cedar: rand() < 0.35, tilt: (rand() - 0.5) * 0.06 });
    }
  };
  place(Math.round(1100 * quality), 32, 95, 0.62);
  place(Math.round(2600 * quality), 95, 420, 0.3);

  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  for (const [geo, cedar] of [[firGeo, false], [cedarGeo, true]]) {
    const list = spots.filter((s) => s.cedar === cedar);
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const tint = new THREE.Color();
    list.forEach((s, i) => {
      q.setFromEuler(new THREE.Euler(s.tilt, rand() * Math.PI * 2, s.tilt * 0.5));
      m.compose(new THREE.Vector3(s.x, heightAt(s.x, s.z) - 0.3, s.z), q, new THREE.Vector3(s.h * 0.95, s.h, s.h * 0.95));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, tint.setHSL(0.27 + rand() * 0.05, 0.25, 0.78 + rand() * 0.2));
    });
    group.add(mesh);
  }
  return group;
}

/* ---------- Rainier, hazy and snow-capped ---------- */
export function createRainier() {
  const geo = new THREE.CylinderGeometry(18, 560, 300, 96, 28, true);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const rock = new THREE.Color('#5d6c83');
  const snow = new THREE.Color('#f4f6fb');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const t = (y + 150) / 300; // 0 base → 1 summit
    // glaciers and ridges: radial noise, stronger lower down
    const ridge = fbm2(Math.cos(a) * 3 + 5, Math.sin(a) * 3 + t * 4, 4);
    const k = 1 + ridge * 0.18 * (1 - t * 0.6);
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
    pos.setY(i, y + fbm2(Math.cos(a) * 2, Math.sin(a) * 2, 3) * 18 * t);
    const snowLine = 0.42 + ridge * 0.18;
    c.copy(rock).lerp(snow, smoothstep(snowLine - 0.06, snowLine + 0.04, t));
    c.lerp(HAZE, 0.38); // aerial perspective: 100 km of air
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, fog: false }));
  const az = 0.08;
  mesh.position.set(Math.sin(az) * 1300, 105, -Math.cos(az) * 1300);
  return mesh;
}
