import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';
import { createStarfield } from './scene/starfield.js';
import { createStar } from './scene/star.js';
import { createSystem } from './scene/system.js';
import { decorate } from './scene/decorations.js';
import { createCameraDirector } from './scene/cameraDirector.js';
import { createLabels } from './ui/labels.js';
import { createStoryCard } from './ui/storyCard.js';
import { worlds, star as starDef } from './data/worlds.js';

const STAR_RADIUS = 4;
const TOUR = ['star', 'emerald', 'hashport', 'railhead', 'ferris', 'verdance', 'ares', 'swift'];
const canvas = document.getElementById('scene');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 2;
  controls.maxDistance = 160;
  controls.enablePan = false;
  controls.autoRotateSpeed = 0.25;

  const starfield = createStarfield();
  const star = createStar(STAR_RADIUS);
  const system = createSystem(worlds, decorate);
  scene.add(starfield, star, system.root);
  scene.add(new THREE.AmbientLight(0x404a70, 0.35));

  // ---- lookup helpers ----
  const defs = new Map([['star', starDef], ...worlds.map((w) => [w.id, w])]);
  const getTarget = (id, out) => (id === 'star' ? out.set(0, 0, 0) : system.worldPosition(id, out));
  const viewInfo = (id) => {
    if (id === 'star') return { offset: new THREE.Vector3(6, 4, 15) };
    const def = defs.get(id);
    const k = { railhead: 4.4, hashport: 5.5, ferris: 6 }[id] ?? 4.8;
    return { distance: def.radius * k + 1.2 };
  };

  const director = createCameraDirector({ camera, controls, getTarget, reducedMotion });

  // Pause the idle drift while someone is steering, resume after a few seconds.
  let idleTimer;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    clearTimeout(idleTimer);
  });
  controls.addEventListener('end', () => {
    idleTimer = setTimeout(() => {
      controls.autoRotate = director.mode === 'overview' && !reducedMotion;
    }, 6000);
  });

  // ---- labels ----
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
    (id) => visit(id)
  );

  // ---- story card & voyage ----
  const title = document.getElementById('title');
  const hud = document.getElementById('hud');
  const cardEl = document.getElementById('card');
  let tourIndex = -1;

  const card = createStoryCard(cardEl, {
    onClose: () => leave(),
    onPrev: () => step(-1),
    onNext: () => step(1),
  });
  card.buildDots(
    TOUR.map((id) => defs.get(id)),
    (i) => visit(TOUR[i])
  );

  function visit(id) {
    tourIndex = TOUR.indexOf(id);
    director.focus(id, viewInfo(id));
    card.show(defs.get(id), tourIndex);
    labels.setActive(id);
    document.body.classList.add('focused');
    title.classList.add('dim');
    hud.classList.add('hidden');
    resize();
  }

  function step(delta) {
    const next = (tourIndex + delta + TOUR.length) % TOUR.length;
    visit(TOUR[next]);
  }

  function leave() {
    if (director.mode === 'overview') return;
    tourIndex = -1;
    director.overview();
    card.hide();
    labels.setActive(null);
    document.body.classList.remove('focused');
    title.classList.remove('dim');
    hud.classList.remove('hidden');
    resize();
  }

  document.getElementById('voyage').addEventListener('click', () => visit(TOUR[0]));

  window.addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea')) return;
    if (e.key === 'ArrowRight') step(tourIndex < 0 ? 0 : 1);
    else if (e.key === 'ArrowLeft') step(tourIndex < 0 ? 0 : -1);
    else if (e.key === 'Escape') leave();
  });

  // ---- picking: a click (not a drag) on a world flies there ----
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pickables = [star.userData.surface];
  star.userData.surface.userData.worldId = 'star';
  for (const [id, entry] of system.bodies) {
    entry.body.userData.worldId = id;
    pickables.push(entry.body);
  }
  let downAt = null;
  canvas.addEventListener('pointerdown', (e) => (downAt = { x: e.clientX, y: e.clientY }));
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickables, true)[0];
    let o = hit?.object;
    while (o && !o.userData.worldId) o = o.parent;
    if (o) visit(o.userData.worldId);
  });

  // ---- sizing: shift the projection so the focused world sits beside the card ----
  let width = 0;
  let height = 0;
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const focused = document.body.classList.contains('focused');
    const mobile = width < 760;
    if (focused && mobile) camera.setViewOffset(width, height, 0, height * 0.22, width, height);
    else if (focused) camera.setViewOffset(width, height, Math.min(220, width * 0.17), 0, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    starfield.userData.setPixelRatio(pr);
  }
  window.addEventListener('resize', resize);
  resize();

  director.intro();

  const timer = new THREE.Timer();
  const orbitSpeed = reducedMotion ? 0.25 : 1;
  renderer.setAnimationLoop((now) => {
    timer.update(now);
    const t = timer.getElapsed();
    starfield.userData.update(t);
    star.userData.update(t);
    system.update(t, t * orbitSpeed);
    system.bodies.get('verdance').extras.setCameraDistance(camera.position.distanceTo(system.worldPosition('verdance')));
    starfield.rotation.y = t * 0.003;
    director.update();
    renderer.render(scene, camera);
    labels.update(width, height);
  });
}
