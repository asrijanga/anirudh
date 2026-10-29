// N-body stability check for System Anirudh.
// Integrates the star and every world with full pairwise gravity (kick-drift-kick leapfrog,
// which is symplectic, so energy errors stay bounded) and fails if anything goes wrong.
//
//   node scripts/stability.mjs [years]
//
// Run A: star + planets for 10,000 years (dt = 0.5 day), with hashport and the comet as test particles.
// Run B: star + railhead + ferris for 300 years (dt = 0.02 day) to resolve the moon's 7-day orbit.

import { worlds, comet, SUN } from '../src/data/worlds.js';
import { GM_SUN, mu, stateAt, elementsFromState, hillRadius, period } from '../src/physics/kepler.js';

const YEARS = Number(process.argv[2] ?? 10000);
const byId = Object.fromEntries(worlds.map((w) => [w.id, w]));
let failures = 0;
const check = (ok, msg) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};

// ---- initial conditions ----
function heliocentric(def, t = 0) {
  const pos = [0, 0, 0];
  const vel = [0, 0, 0];
  if (def.trojanOf) {
    const host = byId[def.trojanOf];
    const el = { ...host.orbit, M0: host.orbit.M0 + def.lead };
    stateAt(el, mu(SUN.mass, host.mass), t, pos, vel);
  } else {
    stateAt(def.orbit, mu(SUN.mass, def.mass), t, pos, vel);
  }
  return { pos, vel };
}

function makeBody(id, m, pos, vel) {
  return { id, m, gm: GM_SUN * m, x: [...pos], v: [...vel], a: [0, 0, 0] };
}

// Shift everything (massive bodies and test particles alike) into the barycentric frame.
function toBarycentric(bodies, tests = []) {
  const M = bodies.reduce((s, b) => s + b.m, 0);
  for (let k = 0; k < 3; k++) {
    const p = bodies.reduce((s, b) => s + b.m * b.x[k], 0) / M;
    const v = bodies.reduce((s, b) => s + b.m * b.v[k], 0) / M;
    for (const b of [...bodies, ...tests]) {
      b.x[k] -= p;
      b.v[k] -= v;
    }
  }
}

// ---- integrator ----
function accelerations(massive, tests) {
  for (const b of massive) b.a.fill(0);
  for (const b of tests) b.a.fill(0);
  for (let i = 0; i < massive.length; i++) {
    const bi = massive[i];
    for (let j = i + 1; j < massive.length; j++) {
      const bj = massive[j];
      const dx = bj.x[0] - bi.x[0], dy = bj.x[1] - bi.x[1], dz = bj.x[2] - bi.x[2];
      const r2 = dx * dx + dy * dy + dz * dz;
      const inv = 1 / (r2 * Math.sqrt(r2));
      bi.a[0] += bj.gm * dx * inv; bi.a[1] += bj.gm * dy * inv; bi.a[2] += bj.gm * dz * inv;
      bj.a[0] -= bi.gm * dx * inv; bj.a[1] -= bi.gm * dy * inv; bj.a[2] -= bi.gm * dz * inv;
    }
    for (const t of tests) {
      const dx = bi.x[0] - t.x[0], dy = bi.x[1] - t.x[1], dz = bi.x[2] - t.x[2];
      const r2 = dx * dx + dy * dy + dz * dz;
      const inv = 1 / (r2 * Math.sqrt(r2));
      t.a[0] += bi.gm * dx * inv; t.a[1] += bi.gm * dy * inv; t.a[2] += bi.gm * dz * inv;
    }
  }
}

function energy(massive) {
  let E = 0;
  for (let i = 0; i < massive.length; i++) {
    const b = massive[i];
    E += 0.5 * b.m * (b.v[0] ** 2 + b.v[1] ** 2 + b.v[2] ** 2);
    for (let j = i + 1; j < massive.length; j++) {
      const c = massive[j];
      E -= (GM_SUN * b.m * c.m) / Math.hypot(c.x[0] - b.x[0], c.x[1] - b.x[1], c.x[2] - b.x[2]);
    }
  }
  return E;
}

function integrate(massive, tests, dt, steps, every, observe) {
  const all = [...massive, ...tests];
  accelerations(massive, tests);
  for (let s = 1; s <= steps; s++) {
    for (const b of all) for (let k = 0; k < 3; k++) { b.v[k] += 0.5 * dt * b.a[k]; b.x[k] += dt * b.v[k]; }
    accelerations(massive, tests);
    for (const b of all) for (let k = 0; k < 3; k++) b.v[k] += 0.5 * dt * b.a[k];
    if (s % every === 0) observe(s * dt);
  }
}

const rel = (b, c) => [b.x[0] - c.x[0], b.x[1] - c.x[1], b.x[2] - c.x[2]];
const relv = (b, c) => [b.v[0] - c.v[0], b.v[1] - c.v[1], b.v[2] - c.v[2]];
const lon = (r) => Math.atan2(r[1], r[0]);

// ============ Run A: planets ============
const planets = worlds.filter((w) => !w.parent && !w.trojanOf).sort((p, q) => p.orbit.a - q.orbit.a);
console.log(`\nSystem Anirudh: N-body stability check\n`);
console.log(`Run A: star + ${planets.length} planets, ${YEARS.toLocaleString()} years, dt = 0.5 day`);

console.log('\n  initial spacing (mutual Hill radii; > ~10 is long-term stable for multi-planet systems)');
for (let k = 0; k + 1 < planets.length; k++) {
  const p = planets[k], q = planets[k + 1];
  const rh = Math.cbrt((p.mass + q.mass) / 3) * (p.orbit.a + q.orbit.a) / 2;
  const delta = (q.orbit.a - p.orbit.a) / rh;
  check(delta > 10, `${p.id} ↔ ${q.id}: Δ = ${delta.toFixed(1)}`);
}

const sun = makeBody('star', SUN.mass, [0, 0, 0], [0, 0, 0]);
const massiveA = [sun, ...planets.map((p) => { const s = heliocentric(p); return makeBody(p.id, p.mass, s.pos, s.vel); })];
const hash = byId.hashport;
const testsA = [hash, comet].map((d) => {
  const s = d.trojanOf ? heliocentric(d) : (() => { const pos = [0, 0, 0], vel = [0, 0, 0]; stateAt(d.orbit, mu(SUN.mass), 0, pos, vel); return { pos, vel }; })();
  return makeBody(d.id, 0, s.pos, s.vel);
});
toBarycentric(massiveA, testsA);

const track = Object.fromEntries(planets.map((p) => [p.id, { aMin: Infinity, aMax: -Infinity, eMin: Infinity, eMax: -Infinity }]));
const closest = {};
let trojanMin = Infinity, trojanMax = -Infinity;
let cometRailMin = Infinity;
const E0 = energy(massiveA);
const B = Object.fromEntries([...massiveA, ...testsA].map((b) => [b.id, b]));
const t0 = performance.now();

integrate(massiveA, testsA, 0.5, Math.round((YEARS * 365.25) / 0.5), 20, () => {
  for (const p of planets) {
    const b = B[p.id];
    const { a, e } = elementsFromState(rel(b, sun), relv(b, sun), mu(SUN.mass, p.mass));
    const tr = track[p.id];
    tr.aMin = Math.min(tr.aMin, a); tr.aMax = Math.max(tr.aMax, a);
    tr.eMin = Math.min(tr.eMin, e); tr.eMax = Math.max(tr.eMax, e);
  }
  for (let k = 0; k + 1 < planets.length; k++) {
    const p = planets[k], q = planets[k + 1];
    const d = Math.hypot(...rel(B[p.id], B[q.id]));
    const rh = Math.cbrt((p.mass + q.mass) / 3) * (p.orbit.a + q.orbit.a) / 2;
    const key = `${p.id} ↔ ${q.id}`;
    closest[key] = Math.min(closest[key] ?? Infinity, d / rh);
  }
  let dl = (lon(rel(B.hashport, sun)) - lon(rel(B.emerald, sun))) / (Math.PI / 180);
  dl = ((dl + 540) % 360) - 180;
  trojanMin = Math.min(trojanMin, dl); trojanMax = Math.max(trojanMax, dl);
  cometRailMin = Math.min(cometRailMin, Math.hypot(...rel(B.comet, B.railhead)));
});

console.log(`\n  orbits after ${YEARS.toLocaleString()} years  (${((performance.now() - t0) / 1000).toFixed(1)}s)`);
for (const p of planets) {
  const tr = track[p.id];
  const da = (tr.aMax - tr.aMin) / p.orbit.a;
  check(da < 0.01 && tr.eMax < 0.35,
    `${p.id.padEnd(9)} a ${tr.aMin.toFixed(4)}–${tr.aMax.toFixed(4)} AU (±${(da * 50).toFixed(3)}%)   e ${tr.eMin.toFixed(3)}–${tr.eMax.toFixed(3)}   P ${(period(p.orbit.a, mu(SUN.mass, p.mass)) / 365.25).toFixed(2)} yr`);
}
console.log('\n  closest approaches (mutual Hill radii; < ~3.5 would mean a close encounter)');
for (const [key, v] of Object.entries(closest)) check(v > 3.5, `${key}: ${v.toFixed(1)}`);

const dE = Math.abs((energy(massiveA) - E0) / E0);
console.log('\n  integrator');
check(dE < 1e-5, `relative energy error ${dE.toExponential(2)}`);

console.log('\n  hashport at emerald L4');
check(trojanMin > 15 && trojanMax < 165,
  `stays on a tadpole orbit around L4: ${trojanMin.toFixed(1)}° to ${trojanMax.toFixed(1)}° ahead of emerald (L4 = 60°)`);

console.log('\n  comet (massless, allowed to be perturbed)');
console.log(`  info  closest approach to railhead: ${cometRailMin.toFixed(2)} AU (railhead Hill radius ${hillRadius(byId.railhead.orbit.a, byId.railhead.orbit.e, byId.railhead.mass).toFixed(2)} AU)`);

// ============ Run B: the moon ============
const MOON_YEARS = 300;
const rail = byId.railhead, fer = byId.ferris;
console.log(`\nRun B: star + railhead + ferris, ${MOON_YEARS} years, dt = 0.02 day`);
const rh = hillRadius(rail.orbit.a, rail.orbit.e, rail.mass);
const frac = fer.orbit.a / rh;
check(frac < 0.33, `ferris orbits at ${(frac * 100).toFixed(1)}% of railhead's Hill radius (prograde moons are stable inside ~1/3 to 1/2)`);

const rs = heliocentric(rail);
const fp = [0, 0, 0], fv = [0, 0, 0];
stateAt(fer.orbit, mu(rail.mass, fer.mass), 0, fp, fv);
const sunB = makeBody('star', SUN.mass, [0, 0, 0], [0, 0, 0]);
const railB = makeBody('railhead', rail.mass, rs.pos, rs.vel);
const ferB = makeBody('ferris', fer.mass, rs.pos.map((x, k) => x + fp[k]), rs.vel.map((v, k) => v + fv[k]));
const massiveB = [sunB, railB, ferB];
toBarycentric(massiveB);
let fa = [Infinity, -Infinity], fe = [Infinity, -Infinity];
integrate(massiveB, [], 0.02, Math.round((MOON_YEARS * 365.25) / 0.02), 50, () => {
  const { a, e } = elementsFromState(rel(ferB, railB), relv(ferB, railB), mu(rail.mass, fer.mass));
  fa = [Math.min(fa[0], a), Math.max(fa[1], a)];
  fe = [Math.min(fe[0], e), Math.max(fe[1], e)];
});
const fda = (fa[1] - fa[0]) / fer.orbit.a;
check(fda < 0.01 && fe[1] < 0.05,
  `ferris stays bound: a ${(fa[0] * 1.496e8).toFixed(0)}–${(fa[1] * 1.496e8).toFixed(0)} km, e ${fe[0].toFixed(4)}–${fe[1].toFixed(4)}, P ${period(fer.orbit.a, mu(rail.mass, fer.mass)).toFixed(2)} days`);

console.log(failures ? `\n${failures} check(s) failed: the system is not stable.\n` : '\nAll checks passed: the system is stable.\n');
process.exit(failures ? 1 : 0);
