import * as THREE from 'three';
import { noise } from '../shaders/noise.js';

// Procedural, star-lit planet surface. Lighting comes from the star at the origin.
export function createPlanetMesh(def) {
  const [low, mid, high] = def.palette.map((c) => new THREE.Color(c));
  const seed = hashString(def.id);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uLow: { value: low },
      uMid: { value: mid },
      uHigh: { value: high },
      uScale: { value: def.noiseScale ?? 2 },
      uSeed: { value: seed },
      uOcean: { value: def.ocean ?? -1 },
      uCraters: { value: def.craters ? 1 : 0 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vObj; varying vec3 vWorld; varying vec3 vNormalW;
      void main(){
        vObj = position;
        vec4 w = modelMatrix * vec4(position,1.0);
        vWorld = w.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uLow, uMid, uHigh;
      uniform float uScale, uSeed, uOcean, uCraters, uTime;
      varying vec3 vObj; varying vec3 vWorld; varying vec3 vNormalW;
      ${noise}
      void main(){
        vec3 p = normalize(vObj) * uScale + uSeed;
        float h = fbm(p) * 0.5 + 0.5;
        // latitude bands give gas-giant-ish worlds some structure
        float lat = normalize(vObj).y;
        h += 0.08 * sin(lat * 9.0 + fbm(p*0.7) * 3.0);

        vec3 col;
        if (uOcean > 0.0) {
          float land = smoothstep(uOcean, uOcean + 0.04, h);
          vec3 sea = mix(uLow * 0.7, uLow * 1.3, smoothstep(0.2, uOcean, h));
          vec3 ground = mix(uMid, uMid * 0.6, smoothstep(uOcean, 0.75, h));
          col = mix(sea, ground, land);
          // polar caps
          col = mix(col, uHigh, smoothstep(0.78, 0.9, abs(lat) + h * 0.1));
        } else {
          col = mix(uLow, uMid, smoothstep(0.25, 0.55, h));
          col = mix(col, uHigh, smoothstep(0.6, 0.85, h));
        }

        if (uCraters > 0.5) {
          float c = snoise(p * 3.5);
          float rim = smoothstep(0.55, 0.62, c) - smoothstep(0.62, 0.75, c);
          col *= 1.0 - smoothstep(0.6, 0.8, c) * 0.35;
          col += rim * 0.12;
        }

        vec3 L = normalize(-vWorld);
        vec3 N = normalize(vNormalW);
        float diff = max(dot(N, L), 0.0);
        float wrap = smoothstep(-0.2, 0.4, dot(N, L));
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        vec3 lit = col * (0.09 + 1.15 * diff) + col * 0.12 * wrap + fres * col * 0.25 * wrap;
        gl_FragColor = vec4(lit, 1.0);
      }`,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(def.radius, 64, 64), material);
  mesh.userData.update = (t) => (material.uniforms.uTime.value = t);

  if (def.atmosphere) mesh.add(createAtmosphere(def.radius, def.atmosphere));
  return mesh;
}

// Back-faced shell with a fresnel glow, brightest on the star-facing limb.
function createAtmosphere(radius, color) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.12, 48, 48),
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) } },
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec3 vNormalW; varying vec3 vWorld;
        void main(){
          vec4 w = modelMatrix * vec4(position,1.0);
          vWorld = w.xyz;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying vec3 vNormalW; varying vec3 vWorld;
        void main(){
          vec3 V = normalize(cameraPosition - vWorld);
          float rim = pow(1.0 - abs(dot(normalize(vNormalW), V)), 1.5);
          float halo = pow(max(dot(normalize(vNormalW), V) * -1.0, 0.0), 2.5);
          float sun = smoothstep(-0.3, 0.6, dot(normalize(vNormalW), normalize(-vWorld)));
          float a = halo * sun * 0.9;
          gl_FragColor = vec4(uColor * a, a);
        }`,
    })
  );
}

function hashString(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 1000;
  return h / 10;
}
