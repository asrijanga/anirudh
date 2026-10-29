import * as THREE from 'three';
import { createPlanetMesh } from './planet.js';
import { mu, stateAt, ellipsePoints, DEG, AU_KM } from '../physics/kepler.js';
import { AU, SUN } from '../data/worlds.js';

// Ecliptic (z up) → three.js (y up).
const toScene = (p, scale, out) => out.set(p[0] * scale, p[2] * scale, -p[1] * scale);
const MAX_SPIN = Math.PI * 2 * 0.25; // cap visible spin at a quarter turn per second

// Builds every world and moves it along its real Keplerian orbit.
// Distances are true to scale. Sizes blend between `readable` (sizeMix = 1) and true (sizeMix = 0).
export function createSystem(defs, decorate = () => null) {
  const root = new THREE.Group();
  root.name = 'system';
  const bodies = new Map();
  const byId = Object.fromEntries(defs.map((d) => [d.id, d]));

  for (const def of defs) {
    const parentEntry = def.parent ? bodies.get(def.parent) : null;
    const host = def.trojanOf ? byId[def.trojanOf] : null;

    const anchor = new THREE.Group();
    anchor.name = def.id;
    (parentEntry ? parentEntry.anchor : root).add(anchor);

    // Spin happens on `body`, tilted by the axial tilt. Sizes scale on `tiltGroup`.
    const tiltGroup = new THREE.Group();
    tiltGroup.rotation.z = (def.tiltDeg ?? 0) * DEG;
    anchor.add(tiltGroup);
    const body = def.kind === 'station' ? createStationPlaceholder(def) : createPlanetMesh(def);
    tiltGroup.add(body);

    const elements = host ? { ...host.orbit, M0: host.orbit.M0 + def.lead } : def.orbit;
    const gm = parentEntry ? mu(parentEntry.def.mass, def.mass) : mu(SUN.mass, host ? host.mass : def.mass);
    const trueRadius = (def.radiusKm / AU_KM) * AU;

    // Moon distances get the same square-root compression as sizes, relative to the parent,
    // so the moon stays outside its (enlarged) parent while keeping the true period.
    let moonFactor = 1;
    if (parentEntry) {
      const aUnits = elements.a * AU;
      moonFactor = (parentEntry.def.radius * Math.sqrt(aUnits / parentEntry.trueRadius)) / aUnits;
    }

    // Trojans share their host's orbit line; everyone else draws their own ellipse.
    let orbitLine = null;
    if (!host) {
      orbitLine = createOrbitLine(elements, parentEntry ? 0.18 : 0.22);
      (parentEntry ? parentEntry.anchor : root).add(orbitLine);
    }

    const entry = { def, anchor, body, tiltGroup, elements, gm, trueRadius, moonFactor, orbitLine, spin: 0, extras: null };
    entry.extras = decorate(entry);
    bodies.set(def.id, entry);
  }

  let sizeMix = 1;
  let sizeTarget = 1;
  const pos = [0, 0, 0];

  function update(t, simDays, dtSec, dtDays) {
    sizeMix += (sizeTarget - sizeMix) * Math.min(1, dtSec * 2.5);
    if (Math.abs(sizeTarget - sizeMix) < 1e-4) sizeMix = sizeTarget;

    for (const e of bodies.values()) {
      const { def, anchor, body, tiltGroup, extras } = e;
      stateAt(e.elements, e.gm, simDays, pos);
      const local = def.parent ? Math.pow(e.moonFactor, sizeMix) : 1;
      toScene(pos, AU * local, anchor.position);
      if (e.orbitLine && def.parent) e.orbitLine.scale.setScalar(local);

      tiltGroup.scale.setScalar(Math.pow(e.trueRadius / def.radius, 1 - sizeMix));

      // Real rotation rate, capped so fast warps don't strobe.
      const rate = (Math.PI * 2 * dtDays) / (def.dayHours / 24);
      e.spin += Math.min(rate, MAX_SPIN * dtSec);
      body.rotation.y = e.spin;

      body.userData.update?.(t);
      extras?.update?.(t, simDays);
    }
  }

  const tmp = new THREE.Vector3();
  return {
    root,
    bodies,
    update,
    worldPosition: (id, target = tmp) => bodies.get(id).anchor.getWorldPosition(target),
    currentRadius: (id) => bodies.get(id).def.radius * bodies.get(id).tiltGroup.scale.x,
    setTrueScale: (on) => (sizeTarget = on ? 0 : 1),
    get trueScale() {
      return sizeTarget === 0;
    },
    get sizeMix() {
      return sizeMix;
    },
  };
}

function createOrbitLine(elements, opacity) {
  const v = new THREE.Vector3();
  const pts = ellipsePoints(elements, 360).map((p) => toScene(p, AU, v).clone());
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x8fa6ff, transparent: true, opacity, depthWrite: false })
  );
  line.name = 'orbit';
  return line;
}

// Stations are built entirely by decorations; this invisible sphere is what you click.
function createStationPlaceholder(def) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(def.radius * 1.3, 12, 12),
    new THREE.MeshBasicMaterial({ visible: false })
  );
}

export { toScene };
