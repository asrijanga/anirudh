import './style.css';

// The page's words are plain HTML and are readable immediately. The meadow is built after
// the first paint, scaled to the device, and is purely decoration (aria-hidden).

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function hasWebGL2() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

// Device class sets the starting quality; a frame-rate watcher can lower the resolution later.
function startingQuality() {
  const forced = Number(new URLSearchParams(location.search).get('quality'));
  if (forced > 0) return Math.min(forced, 1);
  const phone = window.matchMedia('(pointer: coarse)').matches || innerWidth < 760;
  const cores = navigator.hardwareConcurrency || 4;
  if (phone) return 0.4;
  return cores <= 4 ? 0.65 : 1;
}

async function grow() {
  const [{ createMeadow }, { createWalk }] = await Promise.all([import('./meadow/meadow.js'), import('./walk.js')]);
  const canvas = document.createElement('canvas');
  canvas.id = 'meadow';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const quality = startingQuality();
  const meadow = createMeadow(canvas, { quality, reducedMotion });
  const pixelRatios = [2, 1.5, 1.25, 1, 0.75];
  let prStep = quality < 0.6 ? 1 : 0;
  const resize = () => meadow.resize(innerWidth, innerHeight, pixelRatios[prStep]);
  addEventListener('resize', resize);
  resize();
  const walk = createWalk(meadow, { reducedMotion });

  // Lower the resolution if frames are slow (measured over 2 s windows, after a warm-up).
  let frames = 0, windowStart = 0, slowWindows = 0;
  function watchFrameRate(now) {
    if (frames < 30) return;
    if (!windowStart) windowStart = now;
    const elapsed = now - windowStart;
    if (elapsed < 2000) return;
    const fps = ((frames - 30) * 1000) / elapsed;
    frames = 30;
    windowStart = now;
    slowWindows = fps < 40 ? slowWindows + 1 : 0;
    if (slowWindows >= 1 && prStep < pixelRatios.length - 1) {
      prStep++;
      slowWindows = 0;
      resize();
    }
  }

  // plain timing: keeps three.js out of the entry chunk so the text paints with almost no JS
  const start = performance.now();
  let last = start;
  meadow.renderer.setAnimationLoop((now) => {
    if (document.hidden) return (last = now);
    walk.update(Math.min((now - last) / 1000, 0.1));
    last = now;
    meadow.render((now - start) / 1000);
    frames++;
    if (frames === 2) canvas.classList.add('ready'); // fade in once there's a real frame
    watchFrameRate(now);
  });
}

if (hasWebGL2()) {
  // let the text paint first, then grow the meadow
  requestAnimationFrame(() => setTimeout(() => grow().catch((e) => console.warn('meadow unavailable:', e)), 0));
}
