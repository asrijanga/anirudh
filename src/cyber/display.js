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
