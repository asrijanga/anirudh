import * as THREE from 'three';
import './style.css';
import { createStarfield } from './scene/starfield.js';
import { createStar } from './scene/star.js';

const canvas = document.getElementById('scene');

function hasWebGL() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

if (!hasWebGL()) {
  document.getElementById('nowebgl').hidden = false;
  canvas.remove();
} else {
  start();
}

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x05060f, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 3000);
  camera.position.set(0, 14, 46);
  camera.lookAt(0, 0, 0);

  const starfield = createStarfield();
  const star = createStar();
  scene.add(starfield, star);
  scene.add(new THREE.AmbientLight(0x404a70, 0.35));

  const updatables = [starfield, star];

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    starfield.userData.setPixelRatio(pr);
  }
  window.addEventListener('resize', resize);
  resize();

  const timer = new THREE.Timer();
  renderer.setAnimationLoop((now) => {
    timer.update(now);
    const t = timer.getElapsed();
    for (const o of updatables) o.userData.update(t);
    starfield.rotation.y = t * 0.003;
    renderer.render(scene, camera);
  });
}
