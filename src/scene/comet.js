import * as THREE from 'three';

// The 2014 Comet: an eccentric Kepler orbit with an ion tail that always points away from the star.
export function createComet({ a = 52, e = 0.72, period = 70, inclination = 0.32, node = 1.1 } = {}) {
  const group = new THREE.Group();
  group.name = 'comet';
  const plane = new THREE.Group();
  plane.rotation.set(inclination, node, 0, 'YXZ');
  group.add(plane);

  const b = a * Math.sqrt(1 - e * e);
  const focusOffset = a * e; // star sits at one focus

  // Dashed orbit path
  const pts = [];
  for (let i = 0; i <= 360; i++) {
    const E = (i / 360) * Math.PI * 2;
    pts.push(new THREE.Vector3(a * Math.cos(E) - focusOffset, 0, b * Math.sin(E)));
  }
  const path = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineDashedMaterial({ color: 0x9fe6ff, transparent: true, opacity: 0.22, dashSize: 0.8, gapSize: 0.8 })
  );
  path.computeLineDistances();
  plane.add(path);

  const head = new THREE.Group();
  plane.add(head);
  const nucleus = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 2), new THREE.MeshStandardMaterial({ color: '#cfe9ff', emissive: '#7fd4ff', emissiveIntensity: 1.4 }));
  head.add(nucleus);

  // Coma: a soft additive billboard around the nucleus.
  const coma = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 3.2),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(0.0,0.0,0.0,1.0); mv.xy += position.xy; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        void main(){ float d = length(vUv-0.5)*2.0; float g = pow(max(1.0-d,0.0), 2.5); gl_FragColor = vec4(vec3(0.55,0.85,1.0)*g, g); }`,
    })
  );
  head.add(coma);

  // Tail particles live in world space so they trail behind correctly.
  const COUNT = 900;
  const positions = new Float32Array(COUNT * 3);
  const ages = new Float32Array(COUNT).fill(1);
  const velocities = new Float32Array(COUNT * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aAge', new THREE.BufferAttribute(ages, 1));
  const tail = new THREE.Points(
    geo,
    new THREE.ShaderMaterial({
      uniforms: { uPixelRatio: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aAge; uniform float uPixelRatio; varying float vAge;
        void main(){
          vAge = aAge;
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_PointSize = (1.0 - aAge) * 90.0 * uPixelRatio / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vAge;
        void main(){
          float d = length(gl_PointCoord-0.5);
          float a = smoothstep(0.5,0.0,d) * pow(1.0 - vAge, 1.5) * 0.7;
          vec3 c = mix(vec3(0.75,0.92,1.0), vec3(0.35,0.55,1.0), vAge);
          gl_FragColor = vec4(c*a, a);
        }`,
    })
  );
  tail.frustumCulled = false;
  group.add(tail);

  const headWorld = new THREE.Vector3();
  const away = new THREE.Vector3();
  let cursor = 0;
  let last = 0;
  let spawnAcc = 0;

  function solveKepler(M) {
    let E = M;
    for (let i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    return E;
  }

  function update(t, orbitTime) {
    const M = ((orbitTime / period) * Math.PI * 2 + 2.4) % (Math.PI * 2);
    const E = solveKepler(M);
    head.position.set(a * Math.cos(E) - focusOffset, 0, b * Math.sin(E));
    head.getWorldPosition(headWorld);
    nucleus.rotation.y = t * 0.6;

    const dt = Math.min(t - last, 0.05);
    last = t;
    const dist = headWorld.length();
    // tail is longer and denser near the star
    const strength = THREE.MathUtils.clamp(28 / dist, 0.25, 2.2);
    away.copy(headWorld).normalize();

    spawnAcc += dt * 260 * strength;
    while (spawnAcc > 1) {
      spawnAcc -= 1;
      const i = cursor;
      cursor = (cursor + 1) % COUNT;
      positions[i * 3] = headWorld.x + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 1] = headWorld.y + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = headWorld.z + (Math.random() - 0.5) * 0.3;
      const sp = (2.5 + Math.random() * 2.5) * strength;
      velocities[i * 3] = away.x * sp + (Math.random() - 0.5) * 0.6;
      velocities[i * 3 + 1] = away.y * sp + (Math.random() - 0.5) * 0.6;
      velocities[i * 3 + 2] = away.z * sp + (Math.random() - 0.5) * 0.6;
      ages[i] = 0;
    }
    for (let i = 0; i < COUNT; i++) {
      if (ages[i] >= 1) continue;
      ages[i] = Math.min(1, ages[i] + dt * 0.5);
      positions[i * 3] += velocities[i * 3] * dt;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aAge.needsUpdate = true;
  }

  return {
    group,
    head,
    update,
    getPosition: (out) => head.getWorldPosition(out),
    setPixelRatio: (pr) => (tail.material.uniforms.uPixelRatio.value = pr),
  };
}
