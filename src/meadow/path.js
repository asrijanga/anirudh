// Where the camera stands for each section of the page: [x, z, eye height].
// Flowers keep clear of this path so nothing grows right in front of the lens.
export const STANDS = {
  top: [0, 22, 1.5],
  work: [-2, 12, 1.3],
  making: [1, 4, 0.95],
  photos: [4, -5, 1.15],
  contact: [0, -13, 1.35],
};

const points = Object.values(STANDS);
export function distanceToPath(x, z) {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i], [bx, bz] = points[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
  }
  return best;
}
