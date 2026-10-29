import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Bloom for the neon, then a lens pass: chromatic aberration, film grain and a vignette.
export function createPost(renderer, scene, camera, { reducedMotion }) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.05, 0.55, 0.62);
  composer.addPass(bloom);
  const lens = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAberration: { value: 0.0035 }, uGrain: { value: reducedMotion ? 0.015 : 0.03 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse; uniform float uTime, uAberration, uGrain; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 d = vUv - 0.5;
        vec2 off = d * dot(d, d) * uAberration * 4.0;
        vec3 col;
        col.r = texture2D(tDiffuse, vUv + off).r;
        col.g = texture2D(tDiffuse, vUv).g;
        col.b = texture2D(tDiffuse, vUv - off).b;
        col += (hash(vUv * 900.0 + fract(uTime) * 100.0) - 0.5) * uGrain;
        col *= 1.0 - smoothstep(0.45, 0.95, length(d * vec2(1.1, 1.0)));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  composer.addPass(lens);
  composer.addPass(new OutputPass());
  return {
    composer,
    bloom,
    update: (t) => (lens.uniforms.uTime.value = t),
    setSize(w, h, pr) {
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
    },
  };
}
