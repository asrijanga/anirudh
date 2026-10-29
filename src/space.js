import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import './style.css';
import { createStarfield } from './scene/starfield.js';
import { createStar } from './scene/star.js';
import { createSystem } from './scene/system.js';
import { decorate, controlsState } from './scene/decorations.js';
import { createComet } from './scene/comet.js';
import { createCameraDirector } from './scene/cameraDirector.js';
import { createLabels } from './ui/labels.js';
import { createStoryCard } from './ui/storyCard.js';
import { createTerminal } from './ui/terminal.js';
import { createCommands } from './ui/commands.js';
import { mountVariantBar } from './ui/variantBar.js';
import { worlds, star as starDef, comet as cometDef, profile, SUN, AU } from './data/worlds.js';
import { AU_KM } from './physics/kepler.js';
import { describeOrbit } from './physics/describe.js';

const STAR_RADIUS = SUN.displayRadius;
const STAR_TRUE_RADIUS = (SUN.radiusKm / AU_KM) * AU;
// Outward from home, then the rest of the system.
const TOUR = ['star', 'emerald', 'hashport', 'verdance', 'ares', 'railhead', 'ferris', 'swift', 'comet'];
const WARPS = { pause: 0, '1d': 1, '1w': 7, '1m': 30.44, '1y': 365.25 };
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
  document.getElementById('loader').remove();
  canvas.remove();
} else {
  start();
}

mountVariantBar('space');

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080c);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 6000);
  camera.position.set(-40, 90, 260);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 0.002;
  controls.maxDistance = 480;
  controls.enablePan = false;
  controls.autoRotateSpeed = 0.25;

  const starfield = createStarfield();
  const star = createStar(STAR_RADIUS);
  const system = createSystem(worlds, decorate);
  const comet = createComet(cometDef);
  scene.add(starfield, star, system.root, comet.group);
  scene.add(new THREE.AmbientLight(0x404a70, 0.35));

  // ---- lookup helpers ----
  const defs = new Map([['star', starDef], ...worlds.map((w) => [w.id, w]), ['comet', cometDef]]);
  const byId = Object.fromEntries(defs);
  const starRadius = () => STAR_RADIUS * star.scale.x;
  const getTarget = (id, out) => {
    if (id === 'star') return out.set(0, 0, 0);
    if (id === 'comet') return comet.getPosition(out);
    return system.worldPosition(id, out);
  };
  // Frame each world by its current (readable or true) size.
  const viewInfo = (id) => {
    if (id === 'star') return { offset: new THREE.Vector3(1.5, 1, 3.8).multiplyScalar(starRadius()) };
    if (id === 'comet') return { distance: 9 };
    const k = { railhead: 4.6, hashport: 5.5, ferris: 6 }[id] ?? 5;
    return { distance: system.currentRadius(id) * k };
  };

  const director = createCameraDirector({
    camera,
    controls,
    getTarget,
    reducedMotion,
    home: new THREE.Vector3(0, 62, 128),
    introFrom: new THREE.Vector3(-90, 210, 470),
  });

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
      { id: 'star', name: 'anirudh', tag: 'the star', getPosition: (v) => v.set(0, starRadius() * 1.25, 0) },
      ...worlds.map((w) => ({
        id: w.id,
        name: w.id,
        tag: w.tag,
        getPosition: (v) => system.worldPosition(w.id, v).add(up.set(0, system.currentRadius(w.id) * 1.5, 0)),
        // moons only get a label once you're close enough to tell them apart
        showWhen: w.parent ? (p) => camera.position.distanceTo(p) < 30 : undefined,
      })),
      { id: 'comet', name: 'comet', tag: 'the journey', getPosition: (v) => comet.getPosition(v).add(up.set(0, 1, 0)) },
    ],
    camera,
    starRadius,
    (id) => visit(id)
  );

  // ---- story card & voyage ----
  const title = document.getElementById('title');
  let currentId = null;

  const card = createStoryCard(document.getElementById('card'), {
    onClose: () => leave(),
    onPrev: () => step(-1),
    onNext: () => step(1),
  });

  function visit(id) {
    currentId = id;
    director.focus(id, viewInfo(id));
    card.show(defs.get(id), TOUR.indexOf(id), TOUR.length, describeOrbit(defs.get(id), byId));
    labels.setActive(id);
    document.body.classList.add('focused');
    title.classList.add('dim');
    term?.renderPrompt();
    resize();
  }

  function step(delta) {
    const i = currentId ? TOUR.indexOf(currentId) : -1;
    const next = i < 0 ? 0 : (i + delta + TOUR.length) % TOUR.length;
    visit(TOUR[next]);
  }

  function leave() {
    if (!currentId) return;
    currentId = null;
    director.overview();
    card.hide();
    labels.setActive(null);
    document.body.classList.remove('focused');
    title.classList.remove('dim');
    term?.renderPrompt();
    resize();
  }

  // ---- easter eggs ----
  const toastEl = document.getElementById('toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
  }

  const pings = [];
  const pingGeo = new THREE.SphereGeometry(0.18, 10, 10);
  function slackPing() {
    system.bodies.get('hashport').extras.ping();
    const from = new THREE.Vector3();
    for (const id of [...system.bodies.keys(), 'comet']) {
      const mesh = new THREE.Mesh(pingGeo, new THREE.MeshBasicMaterial({ color: '#ecb22e', transparent: true }));
      scene.add(mesh);
      pings.push({ mesh, from: getTarget(id, from).clone(), start: performance.now(), dur: 1400 + Math.random() * 600 });
    }
    toast(`#general · ${system.bodies.size + 1} worlds said hi to anirudh`);
  }
  function updatePings() {
    const now = performance.now();
    for (let i = pings.length - 1; i >= 0; i--) {
      const p = pings[i];
      const k = (now - p.start) / p.dur;
      if (k >= 1) {
        scene.remove(p.mesh);
        p.mesh.material.dispose();
        pings.splice(i, 1);
        continue;
      }
      const e = 1 - Math.pow(1 - k, 3);
      p.mesh.position.copy(p.from).multiplyScalar(1 - e);
      p.mesh.position.y += Math.sin(e * Math.PI) * 3;
      p.mesh.material.opacity = 1 - k * 0.6;
    }
  }

  let chooTimer;
  function choo() {
    controlsState.trainSpeed = 7;
    clearTimeout(chooTimer);
    chooTimer = setTimeout(() => (controlsState.trainSpeed = 1), 8000);
    toast('railhead express: all aboard');
  }

  // ---- simulated time: days since the page loaded, starting from today's date ----
  const epoch = new Date();
  let simDays = 0;
  let warp = reducedMotion ? WARPS['1d'] : WARPS['1w'];
  const statusEl = document.getElementById('status');
  const warpLabel = () => Object.entries(WARPS).find(([, v]) => v === warp)?.[0] ?? `${warp}d`;
  function renderStatus() {
    const date = new Date(epoch.getTime() + simDays * 86400000).toISOString().slice(0, 10);
    const rate = warp === 0 ? 'paused' : `${warpLabel()}/s`;
    statusEl.textContent = `${date} · ${rate} · sizes ${system.trueScale ? 'true' : 'compressed √'} · distances true`;
  }
  const sim = {
    warps: Object.keys(WARPS),
    setWarp(name) {
      if (!(name in WARPS)) return false;
      warp = WARPS[name];
      renderStatus();
      return true;
    },
    get warp() {
      return warpLabel();
    },
    setTrueScale(on) {
      system.setTrueScale(on);
      renderStatus();
      // re-frame whatever we're looking at once the sizes have settled
      if (currentId) setTimeout(() => currentId && director.focus(currentId, viewInfo(currentId)), 900);
    },
    get date() {
      return new Date(epoch.getTime() + simDays * 86400000);
    },
  };

  // ---- the shell ----
  const shell = createCommands({
    tour: TOUR,
    defs,
    profile,
    visit,
    leave,
    step,
    current: () => currentId,
    slackPing,
    choo,
    sim,
    describe: (id) => describeOrbit(defs.get(id), byId),
  });
  const term = createTerminal(document.getElementById('term'), {
    commands: shell.commands,
    complete: shell.complete,
    prompt: () => (!currentId || currentId === 'star' ? '~' : `~/worlds/${currentId}`),
  });

  window.addEventListener('keydown', (e) => {
    const typing = e.target === term.input;
    const empty = !term.input.value;
    if (e.key === 'Escape') {
      term.input.blur();
      leave();
    } else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && (!typing || empty)) {
      e.preventDefault();
      step(e.key === 'ArrowRight' ? 1 : -1);
    } else if (!typing && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && !e.target.closest?.('a, button')) {
      // like a real terminal: start typing anywhere and it lands on the prompt
      term.input.focus();
    }
  });

  // ---- picking: a click (not a drag) on a world flies there ----
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pickables = [star.userData.surface, comet.head];
  star.userData.surface.userData.worldId = 'star';
  comet.head.userData.worldId = 'comet';
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

  // ---- post-processing: a little bloom on the star, glows and comet ----
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.3, 0.9));
  composer.addPass(new OutputPass());

  // ---- sizing: shift the projection so the focused world sits beside the card ----
  let width = 0;
  let height = 0;
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio, 2);
    const mobile = width < 760;
    renderer.setPixelRatio(pr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const focused = document.body.classList.contains('focused');
    if (focused && mobile) camera.setViewOffset(width, height, 0, height * 0.24, width, height);
    else if (focused) camera.setViewOffset(width, height, Math.min(240, width * 0.17), 0, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    starfield.userData.setPixelRatio(pr);
    comet.setPixelRatio(pr);
    composer.setPixelRatio(mobile ? Math.min(pr, 1.5) : pr);
    composer.setSize(width, height);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---- boot: compile shaders behind the loader, then fly in ----
  const loader = document.getElementById('loader');
  const steps = [...loader.querySelectorAll('li')];
  const stepDelay = reducedMotion ? 0 : 160;
  const ticking = Promise.all(
    steps.map((li, i) => new Promise((r) => setTimeout(() => (li.classList.add('on'), r()), i * stepDelay)))
  );
  Promise.all([renderer.compileAsync(scene, camera).catch(() => {}), ticking]).then(() => {
    setTimeout(() => {
      loader.classList.add('done');
      director.intro();
      shell.welcome(term);
      // deep links like space.html#railhead fly straight to a world after the intro
      const target = decodeURIComponent(location.hash.slice(1));
      if (defs.has(target)) setTimeout(() => visit(target), reducedMotion ? 0 : 3800);
    }, stepDelay * 2);
  });

  const timer = new THREE.Timer();
  let lastT = 0;
  let statusTick = 0;
  renderer.setAnimationLoop((now) => {
    timer.update(now);
    const t = timer.getElapsed();
    starfield.userData.update(t);
    star.userData.update(t);
    const dt = Math.min(t - lastT, 0.1);
    lastT = t;
    const dtDays = dt * warp;
    simDays += dtDays;
    if ((statusTick += dt) > 0.25) (statusTick = 0), renderStatus();
    system.update(t, simDays, dt, dtDays);
    star.scale.setScalar(Math.pow(STAR_TRUE_RADIUS / STAR_RADIUS, 1 - system.sizeMix));
    comet.update(t, simDays);
    updatePings();
    system.bodies.get('verdance').extras.setCameraDistance(camera.position.distanceTo(system.worldPosition('verdance')));
    starfield.rotation.y = t * 0.003;
    director.update();
    // keep depth precision sensible from orbit-wide views down to true-scale planets
    camera.near = THREE.MathUtils.clamp(camera.position.distanceTo(controls.target) * 0.02, 0.0002, 0.5);
    camera.updateProjectionMatrix();
    composer.render();
    labels.update(width, height);
  });
}
