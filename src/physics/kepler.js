// Two-body orbital mechanics in AU, days and solar masses.
// Ecliptic frame: x towards the vernal equinox, z towards the ecliptic north pole.

export const K = 0.01720209895; // Gaussian gravitational constant, AU^1.5 / day
export const GM_SUN = K * K; // AU^3 / day^2 for one solar mass
export const AU_KM = 149597870.7;
export const DEG = Math.PI / 180;

export const mu = (centralMass, bodyMass = 0) => GM_SUN * (centralMass + bodyMass);
export const meanMotion = (a, m) => Math.sqrt(m / (a * a * a)); // rad / day
export const period = (a, m) => (2 * Math.PI) / meanMotion(a, m); // days

// Solve M = E - e sin E for the eccentric anomaly (Newton, good for e < 0.99).
export function solveKepler(M, e) {
  M = ((M % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
  let E = e < 0.8 ? M : Math.PI * Math.sign(M || 1);
  for (let i = 0; i < 30; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return E;
}

// Rotate a perifocal vector (x along periapsis, y in-plane) into the ecliptic frame.
function toEcliptic(x, y, el, out) {
  const w = el.peri * DEG;
  const O = el.node * DEG;
  const i = el.i * DEG;
  const cw = Math.cos(w), sw = Math.sin(w);
  const cO = Math.cos(O), sO = Math.sin(O);
  const ci = Math.cos(i), si = Math.sin(i);
  out[0] = (cO * cw - sO * sw * ci) * x + (-cO * sw - sO * cw * ci) * y;
  out[1] = (sO * cw + cO * sw * ci) * x + (-sO * sw + cO * cw * ci) * y;
  out[2] = sw * si * x + cw * si * y;
  return out;
}

// Position and velocity (AU, AU/day) at time t (days since epoch).
// `el` = { a, e, i, node, peri, M0 } with angles in degrees; `m` = μ of the central body.
export function stateAt(el, m, t, pos = [0, 0, 0], vel = null) {
  const n = meanMotion(el.a, m);
  const E = solveKepler(el.M0 * DEG + n * t, el.e);
  const cosE = Math.cos(E), sinE = Math.sin(E);
  const b = el.a * Math.sqrt(1 - el.e * el.e);
  toEcliptic(el.a * (cosE - el.e), b * sinE, el, pos);
  if (vel) {
    const r = el.a * (1 - el.e * cosE);
    const f = Math.sqrt(m * el.a) / r;
    toEcliptic(-f * sinE, f * Math.sqrt(1 - el.e * el.e) * cosE, el, vel);
  }
  return pos;
}

// Points around the full ellipse, for drawing orbit paths.
export function ellipsePoints(el, segments = 256) {
  const pts = [];
  const b = el.a * Math.sqrt(1 - el.e * el.e);
  for (let k = 0; k <= segments; k++) {
    const E = (k / segments) * Math.PI * 2;
    pts.push(toEcliptic(el.a * (Math.cos(E) - el.e), b * Math.sin(E), el, [0, 0, 0]));
  }
  return pts;
}

// Osculating semi-major axis and eccentricity from a relative state vector.
export function elementsFromState(r, v, m) {
  const rr = Math.hypot(r[0], r[1], r[2]);
  const v2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
  const a = 1 / (2 / rr - v2 / m);
  const hx = r[1] * v[2] - r[2] * v[1];
  const hy = r[2] * v[0] - r[0] * v[2];
  const hz = r[0] * v[1] - r[1] * v[0];
  const h2 = hx * hx + hy * hy + hz * hz;
  const e = Math.sqrt(Math.max(0, 1 - h2 / (m * a)));
  return { a, e };
}

// Hill radius of a body of mass m (solar masses) orbiting a central mass M at a.
export const hillRadius = (a, e, m, M = 1) => a * (1 - e) * Math.cbrt(m / (3 * M));
