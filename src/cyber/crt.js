import * as THREE from 'three';

// Barrel distortion shared by the shader and the click picking, so clicks land on the right cell.
export const BARREL = 0.055;
export function barrel(u, v) {
  const x = u * 2 - 1;
  const y = v * 2 - 1;
  const k = 1 + BARREL * (x * x + y * y);
  return [(x * k) * 0.5 + 0.5, (y * k) * 0.5 + 0.5];
}

// A chunky CRT monitor whose screen shows the terminal canvas.
export function createCRT({ canvas, screenW, screenH, reducedMotion }) {
  const group = new THREE.Group();
  group.name = 'crt';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;

  // Screen: a plane bulging gently towards the viewer, like real CRT glass.
  const geo = new THREE.PlaneGeometry(screenW, screenH, 40, 40);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = (pos.getX(i) / screenW) * 2;
    const y = (pos.getY(i) / screenH) * 2;
    pos.setZ(i, 0.06 * (1 - x * x * 0.5 - y * y * 0.5));
  }
  geo.computeVertexNormals();

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uTime: { value: 0 },
      uMotion: { value: reducedMotion ? 0 : 1 },
      uLines: { value: canvas.height * 0.5 },
      uGlow: { value: new THREE.Color('#05d9e8') },
      uBarrel: { value: BARREL },
      uPower: { value: 0 }, // 0 → 1 as the tube warms up
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; uniform float uTime, uMotion, uLines, uBarrel, uPower; uniform vec3 uGlow;
      varying vec2 vUv;
      vec2 barrel(vec2 uv){ vec2 c = uv * 2.0 - 1.0; c *= 1.0 + uBarrel * dot(c, c); return c * 0.5 + 0.5; }
      void main(){
        vec2 uv = barrel(vUv);
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
        // power-on: the picture opens from a bright horizontal line
        float open = smoothstep(0.0, 1.0, uPower);
        if (abs(uv.y - 0.5) > open * 0.5 + 0.002) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
        float ab = 0.0012;
        vec3 col;
        col.r = texture2D(uMap, uv + vec2(ab, 0.0)).r;
        col.g = texture2D(uMap, uv).g;
        col.b = texture2D(uMap, uv - vec2(ab, 0.0)).b;
        float scan = 0.8 + 0.2 * sin(uv.y * uLines * 6.28318);
        float vig = pow(16.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y), 0.22);
        float band = 1.0 + uMotion * 0.07 * exp(-pow((fract(uv.y - uTime * 0.11) - 0.5) * 16.0, 2.0));
        float flick = 1.0 + uMotion * 0.018 * sin(uTime * 113.0);
        col = col * scan * vig * band * flick * 1.45;
        col += uGlow * 0.035 * vig;
        col += vec3(1.0) * (1.0 - smoothstep(0.0, 0.08, open)) * step(abs(uv.y - 0.5), 0.004) * 3.0;
        // a soft glare on the glass
        float glare = smoothstep(0.45, 0.0, length((vUv - vec2(0.28, 0.82)) * vec2(1.0, 1.8)));
        col += vec3(0.6, 0.8, 1.0) * glare * 0.05;
        gl_FragColor = vec4(col * mix(0.6, 1.0, open), 1.0);
      }`,
  });
  const screen = new THREE.Mesh(geo, material);
  screen.name = 'screen';
  group.add(screen);

  const plastic = new THREE.MeshStandardMaterial({ color: '#1b1a24', roughness: 0.55, metalness: 0.25 });

  // Bezel: a rounded frame around the glass.
  const m = 0.16; // margin
  const outer = roundedRect(screenW + m * 2.4, screenH + m * 2.4, 0.12);
  outer.holes.push(roundedRect(screenW + 0.02, screenH + 0.02, 0.06));
  const bezel = new THREE.Mesh(
    new THREE.ExtrudeGeometry(outer, { depth: 0.14, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 3, curveSegments: 10 }),
    plastic
  );
  bezel.position.z = -0.06;
  group.add(bezel);

  // Body: a deep box that tapers towards the back.
  const bodyGeo = new THREE.BoxGeometry(screenW + m * 2.2, screenH + m * 2.2, 1.0, 1, 1, 1);
  const bp = bodyGeo.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    if (bp.getZ(i) < 0) {
      bp.setX(i, bp.getX(i) * 0.62);
      bp.setY(i, bp.getY(i) * 0.62 - 0.08);
    }
  }
  bodyGeo.computeVertexNormals();
  const body = new THREE.Mesh(bodyGeo, plastic);
  body.position.z = -0.56;
  group.add(body);

  // Power LED and a little badge.
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 3, 1.2) }));
  led.position.set(screenW / 2 + m * 0.6, -screenH / 2 - m * 0.75, 0.09);
  group.add(led);

  // Stand.
  const stand = new THREE.Mesh(new THREE.BoxGeometry(screenW * 0.4, 0.12, 0.7), plastic);
  stand.position.set(0, -screenH / 2 - m * 1.2 - 0.06, -0.45);
  group.add(stand);

  // A screen-glow light so the desk and keyboard pick up the phosphor colour.
  const glow = new THREE.PointLight('#05d9e8', 4, 5, 1.6);
  glow.position.set(0, 0, 0.6);
  group.add(glow);

  return {
    group,
    screen,
    texture,
    standHeight: screenH / 2 + m * 1.2 + 0.12,
    setGlow(color) {
      material.uniforms.uGlow.value.set(color);
      glow.color.set(color);
    },
    update(t, power) {
      material.uniforms.uTime.value = t;
      material.uniforms.uPower.value = power;
    },
  };
}

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
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
