import * as THREE from 'three';
import './cyber.css';
import { createCanvasTerminal } from './canvasTerminal.js';
import { createCRT, createKeyboard, barrel } from './crt.js';
import { createCity } from './city.js';
import { createPost } from './post.js';
import { createResumeShell } from '../ui/resumeCommands.js';

const DESK_TOP = 0.96;
const LAYOUTS = {
  // screen size in world units, terminal canvas size in pixels, font size in canvas pixels
  landscape: { w: 1.6, h: 1.2, cw: 1600, ch: 1200, font: 31 },
  portrait: { w: 1.2, h: 1.6, cw: 1080, ch: 1440, font: 34 },
};

export async function startNightCity() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = window.matchMedia('(pointer: coarse)').matches;

  // ---- the only DOM: a canvas, an invisible input for the keyboard, a screen-reader log ----
  const canvas = document.createElement('canvas');
  canvas.id = 'nightcity';
  canvas.setAttribute('aria-label', 'A CRT terminal on a rooftop in a neon city. Type help.');
  const form = document.createElement('form');
  form.className = 'cy-form';
  form.autocomplete = 'off';
  const input = document.createElement('input');
  input.className = 'cy-input';
  input.setAttribute('aria-label', 'Terminal command line. Type help for commands.');
  input.spellcheck = false;
  input.autocapitalize = 'off';
  input.setAttribute('autocorrect', 'off');
  input.enterKeyHint = 'go';
  form.appendChild(input);
  const srLog = document.createElement('div');
  srLog.className = 'sr-only';
  srLog.setAttribute('role', 'log');
  srLog.setAttribute('aria-live', 'polite');
  document.body.append(canvas, form, srLog);
  const bootEl = document.getElementById('cy-boot');

  await Promise.race([document.fonts.load('27px "JetBrains Mono"'), new Promise((r) => setTimeout(r, 2500))]);

  // ---- renderer, scene, camera ----
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#1a0820', 0.004);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 3000);

  scene.add(new THREE.AmbientLight('#3a2a5a', 0.6));
  scene.add(new THREE.HemisphereLight('#ff2a6d', '#05d9e8', 0.35));
  const signLight = new THREE.PointLight('#ff2a6d', 30, 40, 1.5);
  signLight.position.set(8, 6, -6);
  scene.add(signLight);

  const city = createCity({ reducedMotion });
  scene.add(city.group);

  // ---- the terminal ----
  const shell = createResumeShell({ host: 'nightcity', themes: ['neon', 'amber', 'green'], reducedMotion });
  const term = createCanvasTerminal({ commands: shell.commands, complete: shell.complete, host: 'nightcity', form, input, srLog });

  const keyboard = createKeyboard();
  keyboard.group.position.set(0, DESK_TOP + 0.03, 0.5);
  keyboard.group.rotation.x = 0.06;
  scene.add(keyboard.group);

  let layoutName = null;
  let crt = null;
  function buildMonitor() {
    const L = LAYOUTS[layoutName];
    term.resize(L.cw, L.ch, L.font);
    if (crt) {
      scene.remove(crt.group);
      crt.texture.dispose();
    }
    crt = createCRT({ canvas: term.canvas, screenW: L.w, screenH: L.h, reducedMotion });
    crt.group.position.set(0, DESK_TOP + crt.standHeight, -0.25);
    crt.setGlow(term.colors.glow);
    scene.add(crt.group);
  }
  term.onTheme = (_, T) => {
    crt.setGlow(T.glow);
    keyboard.setColor(T.glow);
  };

  // ---- camera framing: fit the monitor, leave a little city around it ----
  const screenCenter = new THREE.Vector3();
  const finalPos = new THREE.Vector3();
  const finalLook = new THREE.Vector3();
  function frame() {
    const L = LAYOUTS[layoutName];
    crt.screen.getWorldPosition(screenCenter);
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // landscape leaves room for the city and the keyboard; phones favour readable text
    const fill = layoutName === 'portrait' ? 0.86 : 0.7;
    const d = Math.max((L.h + 0.45) / (2 * tanH * fill), (L.w + 0.45) / (2 * tanH * camera.aspect * fill));
    finalLook.copy(screenCenter).add(new THREE.Vector3(0, -0.14 * L.h, 0));
    finalPos.copy(screenCenter).add(new THREE.Vector3(0, 0.22 * L.h, d));
  }

  let width = 0, height = 0;
  const post = createPost(renderer, scene, camera, { reducedMotion });
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    post.setSize(width, height, Math.min(pr, width < 760 ? 1.5 : 2));
    const next = width / height < 0.8 ? 'portrait' : 'landscape';
    if (next !== layoutName) {
      layoutName = next;
      buildMonitor();
    }
    frame();
  }
  window.addEventListener('resize', resize);
  resize();

  // ---- the intro: fly in from over the skyline, then the tube warms up and the shell boots ----
  const introFrom = new THREE.Vector3(-18, 26, 46);
  const introLook = new THREE.Vector3(0, 18, -120);
  const introStart = performance.now();
  const INTRO_MS = reducedMotion ? 0 : 4200;
  let power = reducedMotion ? 1 : 0;
  let booted = false;

  // drag to look around the rooftop; it eases back when you let go
  const look = { yaw: 0, pitch: 0, tyaw: 0, tpitch: 0 };
  const mouse = { x: 0, y: 0 };

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pickScreen(clientX, clientY) {
    ndc.set((clientX / width) * 2 - 1, -(clientY / height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(crt.screen)[0];
    if (!hit) return null;
    const [u, v] = barrel(hit.uv.x, hit.uv.y);
    if (u < 0 || u > 1 || v < 0 || v > 1) return { onScreen: true, link: null };
    return { onScreen: true, link: term.hitTest(u * term.canvas.width, (1 - v) * term.canvas.height) };
  }

  let down = null;
  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, lastY: e.clientY, moved: false, onScreen: !!pickScreen(e.clientX, e.clientY)?.onScreen };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / width) * 2 - 1;
    mouse.y = (e.clientY / height) * 2 - 1;
    if (down) {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) down.moved = true;
      if (down.moved && down.onScreen && e.pointerType !== 'mouse') {
        // touch-drag on the glass scrolls the terminal
        term.scroll((e.clientY - down.lastY) / 18);
      } else if (down.moved) {
        look.tyaw = THREE.MathUtils.clamp(look.tyaw - e.movementX * 0.004, -0.9, 0.9);
        look.tpitch = THREE.MathUtils.clamp(look.tpitch - e.movementY * 0.003, -0.25, 0.35);
      }
      down.lastY = e.clientY;
      return;
    }
    const hit = pickScreen(e.clientX, e.clientY);
    canvas.style.cursor = hit?.link ? 'pointer' : hit?.onScreen ? 'text' : 'grab';
  });
  canvas.addEventListener('pointerup', (e) => {
    const wasDrag = down?.moved;
    down = null;
    if (wasDrag) return;
    const hit = pickScreen(e.clientX, e.clientY);
    if (hit?.link) term.activate(hit.link);
    input.focus({ preventScroll: true });
  });
  canvas.addEventListener('dblclick', () => (look.tyaw = look.tpitch = 0));
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    term.scroll(-Math.sign(e.deltaY) * Math.max(1, Math.round(Math.abs(e.deltaY) / 40)));
  }, { passive: false });

  input.addEventListener('keydown', (e) => keyboard.press(e.key));
  window.addEventListener('keydown', (e) => {
    if (e.target === input || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length === 1 || e.key === 'Enter' || e.key === 'Backspace') input.focus({ preventScroll: true });
  });
  // let go of the look-around when you start typing
  input.addEventListener('input', () => (look.tyaw = look.tpitch = 0));

  // ---- loop ----
  const timer = new THREE.Timer();
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  renderer.setAnimationLoop((now) => {
    timer.update(now);
    const t = timer.getElapsed();
    const dt = Math.min(timer.getDelta(), 0.1);

    const k = INTRO_MS ? Math.min((now - introStart) / INTRO_MS, 1) : 1;
    const e = ease(k);
    camPos.lerpVectors(introFrom, finalPos, e);
    camLook.lerpVectors(introLook, finalLook, Math.min(1, e * 1.15));

    // drag-to-look orbits around the screen; the mouse adds a little parallax
    look.yaw += (look.tyaw - look.yaw) * Math.min(1, dt * 6);
    look.pitch += (look.tpitch - look.pitch) * Math.min(1, dt * 6);
    if (!down) (look.tyaw *= 1 - Math.min(1, dt * 0.35)), (look.tpitch *= 1 - Math.min(1, dt * 0.35));
    offset.subVectors(camPos, camLook);
    offset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, look.yaw);
    offset.y += Math.sin(look.pitch) * offset.length();
    const par = reducedMotion ? 0 : 0.05 * k;
    camera.position.copy(camLook).add(offset).add(new THREE.Vector3(mouse.x * par, -mouse.y * par * 0.6, 0));
    camera.lookAt(camLook);

    if (k > 0.82 && power < 1) power = Math.min(1, power + dt * 2.2);
    if (power >= 1 && !booted) {
      booted = true;
      bootEl?.classList.add('done');
      shell.boot(term, { onDone: () => !touch && input.focus({ preventScroll: true }) });
    }

    city.update(t, dt);
    keyboard.update(dt);
    if (term.tick(now)) crt.texture.needsUpdate = true;
    crt.update(t, power);
    post.update(t);
    post.composer.render();
  });

  // hide the boot overlay once the first frames are on screen
  requestAnimationFrame(() => requestAnimationFrame(() => bootEl?.classList.add('done')));
}
