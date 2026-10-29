import * as THREE from 'three';
import { createTerrain, heightAt } from './terrain.js';
import { createSky, createWoods, createRainier, sunDirection, SUN, HAZE } from './landscape.js';
import { createGrass, sharedUniforms } from './grass.js';
import { createFlowers } from './flowers.js';
import { createButterflies, createPollen } from './life.js';
import { createPost } from './post.js';

// The whole scene: a sunlit clearing at the edge of the woods, Rainier beyond.
export function createMeadow(canvas, { quality = 1, reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.52;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(HAZE, 0.0024);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 12000);

  const sunDir = sunDirection();
  const sky = createSky();
  sky.setSun(sunDir);
  scene.add(sky.mesh);

  const sun = new THREE.DirectionalLight('#ffd9a8', 2.6);
  sun.position.copy(sunDir).multiplyScalar(200);
  scene.add(sun, new THREE.HemisphereLight('#a8c4e6', '#4d5e2b', 0.9));

  const uniforms = sharedUniforms();
  uniforms.uSunDir.value.copy(sunDir);
  uniforms.uFogColor.value.copy(HAZE);

  scene.add(createTerrain(), createWoods(quality), createRainier());
  scene.add(createGrass(uniforms, Math.round(110000 * quality)));
  scene.add(createFlowers(uniforms, Math.round(9000 * quality)));
  const butterflies = createButterflies(quality < 0.6 ? 4 : 7);
  const pollen = createPollen(Math.round(700 * quality));
  scene.add(butterflies.group, pollen.points);

  const post = createPost(renderer, scene, camera, { samples: quality < 0.6 ? 28 : 48 });

  let pixelRatio = 1;
  function resize(w, h, maxPr = 2) {
    pixelRatio = Math.min(window.devicePixelRatio, maxPr);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    post.setSize(w, h, pixelRatio);
  }

  // Place the camera at (x, z) a given height above the ground, looking at a point.
  const look = new THREE.Vector3();
  function setView(x, z, eye, lx, ly, lz) {
    camera.position.set(x, heightAt(x, z) + eye, z);
    look.set(lx, ly, lz);
    camera.lookAt(look);
  }

  function setSunElevation(deg) {
    sunDirection(deg, SUN.azimuth, sunDir);
    sky.setSun(sunDir);
    sun.position.copy(sunDir).multiplyScalar(200);
    uniforms.uSunDir.value.copy(sunDir);
    // lower sun → warmer light
    const warm = THREE.MathUtils.clamp((14 - deg) / 8, 0, 1);
    uniforms.uSunColor.value.set('#ffd7a0').lerp(new THREE.Color('#ffb070'), warm);
    sun.color.copy(uniforms.uSunColor.value);
  }

  function render(t) {
    uniforms.uTime.value = reducedMotion ? 0 : t;
    butterflies.update(t, reducedMotion);
    pollen.update(reducedMotion ? 0 : t, sunDir, pixelRatio);
    post.update(sunDir);
    post.composer.render();
  }

  return { renderer, scene, camera, uniforms, butterflies, resize, setView, setSunElevation, render, heightAt };
}
