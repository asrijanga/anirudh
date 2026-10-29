// 2D simplex noise (after Stefan Gustavson) and fbm, seeded for a stable meadow.
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const GRAD = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];

function makePerm(seed) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed >>> 0;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
}
const perm = makePerm(1997);

export function noise2(x, y) {
  const s = (x + y) * F2;
  const i = Math.floor(x + s), j = Math.floor(y + s);
  const t = (i + j) * G2;
  const x0 = x - (i - t), y0 = y - (j - t);
  const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
  const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
  const ii = i & 255, jj = j & 255;
  let n = 0;
  for (const [cx, cy, gi] of [
    [x0, y0, perm[ii + perm[jj]]],
    [x1, y1, perm[ii + i1 + perm[jj + j1]]],
    [x2, y2, perm[ii + 1 + perm[jj + 1]]],
  ]) {
    let tt = 0.5 - cx * cx - cy * cy;
    if (tt > 0) {
      const g = GRAD[gi & 7];
      tt *= tt;
      n += tt * tt * (g[0] * cx + g[1] * cy);
    }
  }
  return 70 * n; // roughly -1..1
}

export function fbm2(x, y, octaves = 4) {
  let v = 0, a = 0.5, f = 1;
  for (let o = 0; o < octaves; o++) {
    v += a * noise2(x * f, y * f);
    f *= 2.03;
    a *= 0.5;
  }
  return v;
}

// Deterministic random numbers, so the meadow looks the same on every visit.
export function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
