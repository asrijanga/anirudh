import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Bloom for the neon, then a soft vignette. No aberration or grain: they cost readability.
export function createPost(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // The threshold sits above the screen's brightest text, so only real neon blooms.
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.5, 0.92));
  composer.addPass(
    new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse; varying vec2 vUv;
        void main(){
          vec3 col = texture2D(tDiffuse, vUv).rgb;
          col *= 1.0 - smoothstep(0.55, 1.05, length((vUv - 0.5) * vec2(1.1, 1.0)));
          gl_FragColor = vec4(col, 1.0);
        }`,
    })
  );
  composer.addPass(new OutputPass());
  return {
    composer,
    setSize(w, h, pr) {
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
    },
  };
}
