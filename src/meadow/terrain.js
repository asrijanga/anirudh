import * as THREE from 'three';
import { fbm2, smoothstep } from './noise.js';

// A gently rolling meadow: flat-ish clearing in the middle, a small rise in the
// foreground where we stand, hills climbing into the woods all around.
export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  let h = fbm2(x * 0.012, z * 0.012) * 3.2 + fbm2(x * 0.05 + 7, z * 0.05 - 3, 3) * 0.5;
  h += smoothstep(55, 240, r) * 18 * (0.65 + 0.35 * fbm2(x * 0.005, z * 0.005, 2));
  h += Math.exp(-(x * x) / 500 - ((z - 26) * (z - 26)) / 260) * 1.4;
  return h;
}

export function createTerrain() {
  const size = 900;
  const seg = 260;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const meadow = new THREE.Color('#5d7f2e');
  const dry = new THREE.Color('#9a8f45');
  const forest = new THREE.Color('#263a1c');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
    const r = Math.hypot(x, z);
    c.copy(meadow).lerp(dry, smoothstep(-0.1, 0.5, fbm2(x * 0.03 + 11, z * 0.03, 3)) * 0.55);
    c.lerp(forest, smoothstep(40, 110, r));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.name = 'terrain';
  return mesh;
}
