import * as THREE from 'three';

// A slim widescreen panel: flat glass, crisp text, a neon edge that glows (the text itself never blooms).
export function createDisplay({ canvas, screenW, screenH }) {
  const group = new THREE.Group();
  group.name = 'display';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;

  // Unlit and not tone-mapped, so the terminal colours reach the screen exactly as drawn.
  // Brightness tops out below the bloom threshold, which keeps letters sharp.
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  material.color.setScalar(0);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), material);
  screen.name = 'screen';
  screen.position.z = 0.031;
  group.add(screen);

  // Frame: a thin dark slab, barely wider than the glass.
  const m = 0.05;
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(screenW + m * 2, screenH + m * 2, 0.06),
    new THREE.MeshStandardMaterial({ color: '#101018', roughness: 0.35, metalness: 0.8 })
  );
  group.add(frame);

  // Neon edge: cyan along the top and left, magenta along the bottom and right.
  const edges = [];
  const edge = (w, h, x, y, color) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.012), new THREE.MeshBasicMaterial({ color: new THREE.Color(color) }));
    mesh.position.set(x, y, 0.032);
    group.add(mesh);
    edges.push({ mesh, base: new THREE.Color(color) });
  };
  const t = 0.008;
  const W = screenW + m * 2, H = screenH + m * 2;
  edge(W, t, 0, H / 2 - t / 2, '#05d9e8');
  edge(t, H, -W / 2 + t / 2, 0, '#05d9e8');
  edge(W, t, 0, -H / 2 + t / 2, '#ff2a6d');
  edge(t, H, W / 2 - t / 2, 0, '#ff2a6d');

  // Stand: a slim neck and foot.
  const metal = new THREE.MeshStandardMaterial({ color: '#16161f', roughness: 0.3, metalness: 0.85 });
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.08, screenH * 0.5, 0.05), metal);
  neck.position.set(0, -screenH * 0.5, -0.08);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(screenW * 0.32, 0.025, 0.36), metal);
  foot.position.set(0, -screenH / 2 - m - screenH * 0.18, -0.08);
  group.add(neck, foot);

  // Screen light so the desk and keyboard pick up the theme colour.
  const glow = new THREE.PointLight('#05d9e8', 3, 5, 1.6);
  glow.position.set(0, 0, 0.7);
  group.add(glow);

  return {
    group,
    screen,
    texture,
    standHeight: screenH / 2 + m + screenH * 0.18 + 0.0125,
    setGlow(color) {
      glow.color.set(color);
    },
    // power: 0 → 1 fades the panel on; the edge neon pulses very gently.
    update(time, power) {
      material.color.setScalar(0.88 * power);
      const pulse = 2.2 + 0.25 * Math.sin(time * 1.4);
      for (const e of edges) e.mesh.material.color.copy(e.base).multiplyScalar(pulse * power + 0.05);
    },
  };
}

// A mechanical keyboard; keys flash neon as you type.
const ROWS = ['1234567890-=', 'qwertyuiop[]', "asdfghjkl;'", 'zxcvbnm,./'];
export function createKeyboard() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 0.07, 0.72),
    new THREE.MeshStandardMaterial({ color: '#15141c', roughness: 0.5, metalness: 0.4 })
  );
  group.add(base);

  const keys = [];
  const map = new Map();
  ROWS.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      const x = -0.9 + c * 0.145 + r * 0.04;
      const z = -0.24 + r * 0.14;
      map.set(ch, keys.length);
      keys.push({ x, z, w: 0.12 });
    });
  });
  // modifier blocks and the space bar
  const special = { Enter: [0.96, -0.03, 0.2], Backspace: [0.92, -0.24, 0.22], Tab: [-0.98, -0.1, 0.12], ' ': [0.02, 0.32, 0.9] };
  for (const [k, [x, z, w]] of Object.entries(special)) {
    map.set(k, keys.length);
    keys.push({ x, z, w });
  }

  // Dark keycaps lit by the screen, plus an additive glow layer that's black (invisible) until pressed.
  const capGeo = new THREE.BoxGeometry(1, 0.05, 0.11);
  const caps = new THREE.InstancedMesh(capGeo, new THREE.MeshStandardMaterial({ color: '#24222e', roughness: 0.45, metalness: 0.2 }), keys.length);
  const glowCaps = new THREE.InstancedMesh(
    capGeo,
    new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }),
    keys.length
  );
  const base0 = new THREE.Color(0, 0, 0);
  const m4 = new THREE.Matrix4();
  keys.forEach((k, i) => {
    m4.compose(new THREE.Vector3(k.x, 0.06, k.z), new THREE.Quaternion(), new THREE.Vector3(k.w, 1, 1));
    caps.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(k.x, 0.061, k.z), new THREE.Quaternion(), new THREE.Vector3(k.w * 1.02, 1.04, 1.02));
    glowCaps.setMatrixAt(i, m4);
    glowCaps.setColorAt(i, base0);
  });
  group.add(caps, glowCaps);

  const heat = new Float32Array(keys.length);
  let neon = new THREE.Color('#05d9e8');
  const c = new THREE.Color();
  return {
    group,
    press(key) {
      const i = map.get(key.length === 1 ? key.toLowerCase() : key) ?? map.get(' ');
      heat[i] = 1;
    },
    setColor(color) {
      neon = new THREE.Color(color);
    },
    update(dt) {
      let changed = false;
      for (let i = 0; i < heat.length; i++) {
        if (heat[i] <= 0) continue;
        heat[i] = Math.max(0, heat[i] - dt * 2.2);
        c.copy(base0).lerp(neon.clone().multiplyScalar(1.4), heat[i]);
        glowCaps.setColorAt(i, c);
        changed = true;
      }
      if (changed) glowCaps.instanceColor.needsUpdate = true;
    },
  };
}
