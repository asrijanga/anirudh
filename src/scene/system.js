import * as THREE from 'three';
import { createPlanetMesh } from './planet.js';

// Builds every world, its orbit ring and its motion. Decorations hook in via `decorate`.
export function createSystem(defs, decorate = () => null) {
  const root = new THREE.Group();
  root.name = 'system';
  const bodies = new Map();

  for (const def of defs) {
    const parent = def.parent ? bodies.get(def.parent).anchor : root;

    // `orbitPlane` carries the inclination; `anchor` moves around inside it.
    const orbitPlane = new THREE.Group();
    orbitPlane.rotation.x = def.inclination ?? 0;
    parent.add(orbitPlane);

    const anchor = new THREE.Group();
    anchor.name = def.id;
    orbitPlane.add(anchor);

    // Spin happens on `body`, tilted by the axial tilt.
    const tiltGroup = new THREE.Group();
    tiltGroup.rotation.z = def.tilt ?? 0;
    anchor.add(tiltGroup);

    const body = def.kind === 'station' ? createStationPlaceholder(def) : createPlanetMesh(def);
    tiltGroup.add(body);

    orbitPlane.add(createOrbitRing(def.orbit, def.kind === 'moon' ? 0.12 : 0.22));

    const entry = { def, anchor, body, tiltGroup, orbitPlane, extras: null };
    entry.extras = decorate(entry);
    bodies.set(def.id, entry);
  }

  const tmp = new THREE.Vector3();
  function update(t, orbitTime) {
    for (const { def, anchor, body, extras } of bodies.values()) {
      const a = def.phase + orbitTime * def.speed;
      anchor.position.set(Math.cos(a) * def.orbit, 0, Math.sin(a) * def.orbit);
      body.rotation.y = t * (def.kind === 'station' ? 0.25 : 0.12);
      body.userData.update?.(t);
      extras?.update?.(t, orbitTime);
    }
  }

  function worldPosition(id, target = tmp) {
    return bodies.get(id).anchor.getWorldPosition(target);
  }

  return { root, bodies, update, worldPosition };
}

function createOrbitRing(radius, opacity) {
  const segments = 256;
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
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
