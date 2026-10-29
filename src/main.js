import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';
import { createStarfield } from './scene/starfield.js';
import { createStar } from './scene/star.js';
import { createSystem } from './scene/system.js';
import { decorate } from './scene/decorations.js';
import { createLabels } from './ui/labels.js';
import { worlds, star as starDef } from './data/worlds.js';

const STAR_RADIUS = 4;
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
  camera.position.set(0, 26, 70);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 3;
  controls.maxDistance = 160;
  controls.enablePan = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.25;

  const starfield = createStarfield();
  const star = createStar(STAR_RADIUS);
  const system = createSystem(worlds, decorate);
  scene.add(starfield, star, system.root);
  scene.add(new THREE.AmbientLight(0x404a70, 0.35));

  // Pause the idle drift while someone is steering, resume after a few seconds.
  let idleTimer;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    clearTimeout(idleTimer);
  });
  controls.addEventListener('end', () => {
    idleTimer = setTimeout(() => (controls.autoRotate = true), 6000);
  });

  const labelLayer = document.createElement('div');
  labelLayer.className = 'labels';
  document.body.appendChild(labelLayer);
  const up = new THREE.Vector3();
  const labels = createLabels(
    labelLayer,
    [
      { id: 'star', name: starDef.name, tag: 'the star', getPosition: (v) => v.set(0, STAR_RADIUS * 1.25, 0) },
      ...worlds.map((w) => ({
        id: w.id,
        name: w.name,
        tag: w.tag,
        getPosition: (v) => system.worldPosition(w.id, v).add(up.set(0, w.radius * 1.5, 0)),
      })),
    ],
    camera,
    STAR_RADIUS,
    (id) => labels.setActive(id)
  );

  let width = 0;
  let height = 0;
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    starfield.userData.setPixelRatio(pr);
  }
  window.addEventListener('resize', resize);
  resize();

  const timer = new THREE.Timer();
  renderer.setAnimationLoop((now) => {
    timer.update(now);
    const t = timer.getElapsed();
    starfield.userData.update(t);
    star.userData.update(t);
    system.update(t, t);
    const verdance = system.bodies.get('verdance');
    verdance.extras.setCameraDistance(camera.position.distanceTo(system.worldPosition('verdance')));
    starfield.rotation.y = t * 0.003;
    controls.update();
    renderer.render(scene, camera);
    labels.update(width, height);
  });
}
