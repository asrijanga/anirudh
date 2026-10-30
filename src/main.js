import * as THREE from 'three';
import './style.css';
import { createMeadow } from './meadow/meadow.js';
import { createWalk } from './walk.js';

const canvas = document.createElement('canvas');
canvas.id = 'meadow';
canvas.setAttribute('aria-hidden', 'true');
document.body.prepend(canvas);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const forced = Number(new URLSearchParams(location.search).get('quality'));
const quality = forced > 0 ? Math.min(forced, 1) : window.matchMedia('(pointer: coarse)').matches ? 0.4 : 1;
const meadow = createMeadow(canvas, { quality, reducedMotion });

function resize() {
  meadow.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
resize();
const walk = createWalk(meadow, { reducedMotion });

const timer = new THREE.Timer();
let frames = 0;
meadow.renderer.setAnimationLoop((now) => {
  timer.update(now);
  walk.update(Math.min(timer.getDelta(), 0.1));
  meadow.render(timer.getElapsed());
  if (++frames === 2) canvas.classList.add('ready'); // fade in once there's a real frame
});
