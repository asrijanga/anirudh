import * as THREE from 'three';

// HTML labels pinned to 3D anchors. Hidden when behind the camera or behind the star.
export function createLabels(container, entries, camera, starRadius, onSelect) {
  const items = entries.map(({ id, name, tag, getPosition }) => {
    const el = document.createElement('button');
    el.className = 'label';
    el.type = 'button';
    el.innerHTML = `<span class="label-name">${name}</span><span class="label-tag">${tag}</span>`;
    el.addEventListener('click', () => onSelect(id));
    container.appendChild(el);
    return { id, el, getPosition };
  });

  const p = new THREE.Vector3();
  const toP = new THREE.Vector3();
  const closest = new THREE.Vector3();

  function update(width, height) {
    for (const item of items) {
      item.getPosition(p);
      const occluded = behindStar(camera.position, p, starRadius);
      toP.copy(p).project(camera);
      const visible = toP.z < 1 && !occluded && Math.abs(toP.x) < 1.1 && Math.abs(toP.y) < 1.1;
      item.el.classList.toggle('hidden', !visible);
      if (!visible) continue;
      const x = (toP.x * 0.5 + 0.5) * width;
      const y = (-toP.y * 0.5 + 0.5) * height;
      item.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  }

  function behindStar(cam, target, r) {
    if (r <= 0) return false;
    // distance from origin to the segment cam→target
    const d = toP.copy(target).sub(cam);
    const len = d.length();
    d.divideScalar(len);
    const tProj = THREE.MathUtils.clamp(-cam.dot(d), 0, len);
    closest.copy(cam).addScaledVector(d, tProj);
    return closest.length() < r && tProj < len - 0.01;
  }

  function setActive(id) {
    for (const item of items) item.el.classList.toggle('active', item.id === id);
  }

  return { update, setActive, items };
}
