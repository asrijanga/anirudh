import * as THREE from 'three';
import { heightAt } from './terrain.js';
import { fbm2, seeded } from './noise.js';

// Shared GLSL: wind, the pointer pushing plants aside, simple sun lighting and fog.
export const WIND_GLSL = /* glsl */ `
  uniform float uTime, uBreeze, uPointerOn;
  uniform vec3 uPointer;
  vec2 windDir(){ return normalize(vec2(1.0, -0.35)); }
  // returns a horizontal offset for a point at normalised height k (0 root → 1 tip)
  vec2 sway(vec3 root, float k, float stiffness){
    float phase = dot(root.xz, windDir()) * 0.16 - uTime * 1.3;
    float gust = pow(0.5 + 0.5 * sin(phase), 3.0) * uBreeze;
    float flutter = sin(uTime * 2.1 + root.x * 1.7 + root.z * 1.3) * 0.07;
    vec2 bend = windDir() * (0.12 + gust * 0.6 + flutter) * k * k / stiffness;
    vec2 d = root.xz - uPointer.xz;
    float dl = length(d);
    bend += (d / max(dl, 1e-3)) * smoothstep(2.4, 0.0, dl) * 0.75 * uPointerOn * k * k;
    return bend;
  }
`;
export const LIGHT_GLSL = /* glsl */ `
  uniform vec3 uSunDir, uSunColor, uSkyColor, uFogColor;
  uniform float uFogDensity;
  vec3 shade(vec3 albedo, vec3 n, vec3 world, float translucency){
    vec3 V = normalize(world - cameraPosition);
    float diff = 0.45 + 0.55 * max(dot(n, uSunDir), 0.0);
    float back = pow(max(dot(V, uSunDir), 0.0), 5.0) * translucency;
    vec3 col = albedo * (uSkyColor * 0.55 + uSunColor * diff * 0.95) + albedo * uSunColor * back * 1.6;
    float dist = length(world - cameraPosition);
    float f = 1.0 - exp(-pow(uFogDensity * dist, 2.0));
    return mix(col, uFogColor, f);
  }
`;

export function sharedUniforms() {
  return {
    uTime: { value: 0 },
    uBreeze: { value: 0.45 },
    uPointer: { value: new THREE.Vector3(9999, 0, 9999) },
    uPointerOn: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color('#ffd7a0') },
    uSkyColor: { value: new THREE.Color('#9fb8d8') },
    uFogColor: { value: new THREE.Color('#c4c9c4') },
    uFogDensity: { value: 0.0024 },
  };
}

// The meadow's area: where grass and flowers grow densely.
export const MEADOW = { x0: -34, x1: 34, z0: -52, z1: 32 };

export function createGrass(uniforms, count) {
  // one blade: 3 segments tapering to a point, unit width and height
  const ys = [0, 0.3, 0.62, 1];
  const ws = [1, 0.82, 0.5, 0];
  const pos = [];
  ys.forEach((y, i) => {
    pos.push(-0.5 * ws[i], y, 0);
    if (i < 3) pos.push(0.5 * ws[i], y, 0);
  });
  const idx = [0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 4, 5, 6];
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);

  const rand = seeded(7);
  const offsets = new Float32Array(count * 3);
  const params = new Float32Array(count * 4);
  let n = 0;
  while (n < count) {
    const x = MEADOW.x0 + rand() * (MEADOW.x1 - MEADOW.x0);
    const z = MEADOW.z0 + rand() * (MEADOW.z1 - MEADOW.z0);
    // tussocks: denser where the noise is high
    if (rand() > 0.35 + 0.65 * (0.5 + 0.5 * fbm2(x * 0.09, z * 0.09, 3))) continue;
    offsets.set([x, heightAt(x, z) - 0.02, z], n * 3);
    const tall = 0.5 + 0.5 * fbm2(x * 0.04 + 3, z * 0.04, 2);
    params.set([rand() * Math.PI, 0.25 + rand() * 0.35 + tall * 0.3, 0.035 + rand() * 0.03, rand()], n * 4);
    n++;
  }
  geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
  geo.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 4));
  geo.instanceCount = count;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -10), 80);

  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec3 aOffset; attribute vec4 aParams;
      varying float vK; varying float vDry; varying vec3 vWorld;
      ${WIND_GLSL}
      void main(){
        float k = position.y;
        vec3 p = vec3(position.x * aParams.z, k * aParams.y, 0.0);
        float c = cos(aParams.x), s = sin(aParams.x);
        p = vec3(p.x * c, p.y, p.x * s);
        vec2 b = sway(aOffset, k, 1.0) * aParams.y;
        p.xz += b;
        p.y -= dot(b, b) * 0.45; // keep the blade roughly its length as it bends
        vec3 world = aOffset + p;
        vK = k; vDry = aParams.w; vWorld = world;
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying float vK; varying float vDry; varying vec3 vWorld;
      ${LIGHT_GLSL}
      void main(){
        vec3 root = vec3(0.07, 0.15, 0.04);
        vec3 tip = mix(vec3(0.34, 0.5, 0.14), vec3(0.62, 0.55, 0.26), smoothstep(0.55, 1.0, vDry));
        vec3 albedo = mix(root, tip, smoothstep(0.0, 0.9, vK));
        gl_FragColor = vec4(shade(albedo, vec3(0.0, 1.0, 0.0), vWorld, vK), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  return mesh;
}
