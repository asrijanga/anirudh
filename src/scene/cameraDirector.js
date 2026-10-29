import * as THREE from 'three';

// Moves the camera between the overview and individual worlds, following them as they orbit.
export function createCameraDirector({ camera, controls, getTarget, reducedMotion = false }) {
  const HOME_POS = new THREE.Vector3(0, 26, 70);
  const HOME_TARGET = new THREE.Vector3(0, 0, 0);
  const UP = new THREE.Vector3(0, 1, 0);

  let mode = 'overview';
  let focusId = null;
  let transition = null; // { from, fromTarget, start, duration }
  const lastTargetPos = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const side = new THREE.Vector3();
  const scratch = new THREE.Vector3();

  // Look at a world from its sunlit side, slightly off-axis so the star isn't dead behind us.
  function viewpointFor(id, info, out) {
    getTarget(id, pos);
    if (info.offset) return out.copy(pos).add(info.offset);
    const dir = scratch.copy(pos).normalize();
    side.crossVectors(UP, dir).normalize();
    return out
      .copy(dir)
      .multiplyScalar(-0.85)
      .addScaledVector(side, 0.6)
      .addScaledVector(UP, 0.38)
      .normalize()
      .multiplyScalar(info.distance)
      .add(pos);
  }

  function begin(duration) {
    transition = {
      from: camera.position.clone(),
      fromTarget: controls.target.clone(),
      start: performance.now(),
      duration: reducedMotion ? 1 : duration,
    };
    controls.enabled = false;
    controls.autoRotate = false;
  }

  let focusInfo = null;
  function focus(id, info) {
    mode = 'focus';
    focusId = id;
    focusInfo = info;
    begin(2200);
  }

  function overview(duration = 2200) {
    mode = 'overview';
    focusId = null;
    begin(duration);
  }

  function intro() {
    camera.position.set(-40, 90, 260);
    controls.target.copy(HOME_TARGET);
    overview(4200);
  }

  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  function update() {
    if (transition) {
      const k = Math.min((performance.now() - transition.start) / transition.duration, 1);
      const e = ease(k);
      let endPos, endTarget;
      if (mode === 'focus') {
        endTarget = getTarget(focusId, new THREE.Vector3());
        endPos = viewpointFor(focusId, focusInfo, desired);
      } else {
        endTarget = HOME_TARGET;
        endPos = HOME_POS;
      }
      controls.target.lerpVectors(transition.fromTarget, endTarget, e);
      camera.position.lerpVectors(transition.from, endPos, e);
      // arc upwards a little mid-flight so long hops don't clip through the star
      camera.position.y += Math.sin(e * Math.PI) * transition.from.distanceTo(endPos) * 0.12;
      camera.lookAt(controls.target);
      if (k >= 1) {
        transition = null;
        controls.enabled = true;
        controls.autoRotate = mode === 'overview' && !reducedMotion;
        if (mode === 'focus') lastTargetPos.copy(endTarget);
      }
      return;
    }

    if (mode === 'focus') {
      // carry the camera along with the orbiting world, keep user orbiting around it
      getTarget(focusId, pos);
      scratch.subVectors(pos, lastTargetPos);
      camera.position.add(scratch);
      controls.target.copy(pos);
      lastTargetPos.copy(pos);
    }
    controls.update();
  }

  return {
    focus,
    overview,
    intro,
    update,
    get mode() {
      return mode;
    },
    get focusId() {
      return focusId;
    },
    get busy() {
      return !!transition;
    },
  };
}
