import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Light shafts: march from each pixel towards the sun, collecting the bright sky
// that shows between the trees. Then a gentle golden-hour grade. (No bloom: the sky
// already draws the sun's glow, and bloom on an HDR sky hazes the whole meadow.)
export function createPost(renderer, scene, camera, { samples = 48 } = {}) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const shafts = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uSun: { value: new THREE.Vector2(0.5, 0.5) },
      uIntensity: { value: 0 },
    },
    defines: { SAMPLES: samples },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse; uniform vec2 uSun; uniform float uIntensity; varying vec2 vUv;
      void main(){
        // the sky's sun disc is HDR enough to overflow half-float targets; clamp before anything blurs it
        vec3 base = min(texture2D(tDiffuse, vUv).rgb, vec3(48.0));
        vec2 delta = (uSun - vUv) / float(SAMPLES) * 0.9;
        vec2 p = vUv;
        float decay = 1.0, light = 0.0;
        for (int i = 0; i < SAMPLES; i++) {
          p += delta;
          vec3 s = min(texture2D(tDiffuse, clamp(p, 0.0, 1.0)).rgb, vec3(48.0));
          light += clamp(dot(s, vec3(0.3, 0.59, 0.11)) - 3.0, 0.0, 3.0) * decay;
          decay *= 0.935;
        }
        vec3 col = base + vec3(1.0, 0.78, 0.48) * light * uIntensity / float(SAMPLES) * 0.08;
        col *= vec3(1.04, 1.0, 0.93); // warm highlights, cooler blues
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  composer.addPass(shafts);
  composer.addPass(new OutputPass());

  const sunNdc = new THREE.Vector3();
  return {
    composer,
    // project the sun; fade the shafts as it leaves the screen or goes behind us
    update(sunDir) {
      sunNdc.copy(camera.position).addScaledVector(sunDir, 1000).project(camera);
      shafts.uniforms.uSun.value.set(sunNdc.x * 0.5 + 0.5, sunNdc.y * 0.5 + 0.5);
      const off = Math.max(Math.abs(sunNdc.x), Math.abs(sunNdc.y));
      shafts.uniforms.uIntensity.value = sunNdc.z < 1 ? THREE.MathUtils.clamp(1.6 - off, 0, 1) : 0;
    },
    setSize(w, h, pr) {
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
    },
  };
}
