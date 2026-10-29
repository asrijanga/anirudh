import { createMeadow } from './meadow/meadow.js';
import * as THREE from 'three';

const canvas = document.createElement('canvas');
canvas.id = 'meadow';
canvas.setAttribute('aria-hidden', 'true');
canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;display:block';
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
meadow.setView(0, 22, 1.5, 0, 5, -60);

const timer = new THREE.Timer();
meadow.renderer.setAnimationLoop((now) => {
  timer.update(now);
  meadow.render(timer.getElapsed());
});
