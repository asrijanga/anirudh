import * as THREE from 'three';
import { noise } from '../shaders/noise.js';

// Anirudh — the star at the centre of the system.
export function createStar(radius = 4) {
  const group = new THREE.Group();
  group.name = 'star';

  const surface = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 96, 96),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec3 vPos; varying vec3 vNormal; varying vec3 vView;
        void main(){
          vPos = position;
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec3 vPos; varying vec3 vNormal; varying vec3 vView;
        ${noise}
        void main(){
          vec3 p = normalize(vPos) * 2.2;
          float n = fbm(p + vec3(0.0, uTime*0.04, uTime*0.02));
          float cells = snoise(p*4.0 - uTime*0.08) * 0.5 + 0.5;
          float heat = clamp(n*0.6 + cells*0.55, 0.0, 1.0);
          vec3 deep = vec3(0.95, 0.32, 0.08);
          vec3 mid  = vec3(1.0, 0.62, 0.2);
          vec3 hot  = vec3(1.0, 0.95, 0.78);
          vec3 col = mix(deep, mid, smoothstep(0.15, 0.55, heat));
          col = mix(col, hot, smoothstep(0.55, 0.95, heat));
          float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.0);
          col += vec3(1.0, 0.55, 0.2) * fres * 0.8;
          gl_FragColor = vec4(col * 1.35, 1.0);
        }`,
    })
  );
  group.add(surface);

  // Additive halo: a camera-facing sprite with a radial falloff.
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 7, radius * 7),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          // billboard: keep the quad facing the camera
          vec4 mv = modelViewMatrix * vec4(0.0,0.0,0.0,1.0);
          mv.xy += position.xy;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; varying vec2 vUv;
        void main(){
          vec2 c = vUv - 0.5;
          float d = length(c) * 2.0;
          float a = atan(c.y, c.x);
          float rays = 0.85 + 0.15 * sin(a*12.0 + uTime*0.3) * sin(a*7.0 - uTime*0.2);
          float glow = pow(max(1.0 - d, 0.0), 2.2) * rays * 1.6;
          gl_FragColor = vec4(vec3(1.0, 0.62, 0.28) * glow * 1.1, glow);
        }`,
    })
  );
  halo.renderOrder = -1;
  group.add(halo);

  const light = new THREE.PointLight(0xfff1d6, 2.2, 0, 0);
  group.add(light);

  group.userData.update = (t) => {
    surface.material.uniforms.uTime.value = t;
    halo.material.uniforms.uTime.value = t;
    surface.rotation.y = t * 0.02;
  };
  group.userData.surface = surface;
  return group;
}
