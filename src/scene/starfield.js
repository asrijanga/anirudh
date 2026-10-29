import * as THREE from 'three';

// A few thousand twinkling stars on a distant shell, plus a faint galactic band.
export function createStarfield(count = 6000, radius = 900) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const tints = [new THREE.Color('#9fc6ff'), new THREE.Color('#ffffff'), new THREE.Color('#ffe2b8'), new THREE.Color('#ffb4a0')];
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    // bias a third of the stars towards a tilted band (a milky way)
    const inBand = i % 3 === 0;
    const u = Math.random() * 2 - 1;
    const theta = Math.random() * Math.PI * 2;
    let y = inBand ? (Math.random() - 0.5) * 0.25 : u;
    const r = Math.sqrt(1 - y * y);
    let v = new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta));
    if (inBand) v.applyAxisAngle(new THREE.Vector3(1, 0, 0.4).normalize(), 0.6);
    v.multiplyScalar(radius * (0.7 + Math.random() * 0.3));
    positions.set([v.x, v.y, v.z], i * 3);
    c.copy(tints[(Math.random() * tints.length) | 0]);
    colors.set([c.r, c.g, c.b], i * 3);
    sizes[i] = Math.pow(Math.random(), 3) * 3.2 + 0.6;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    vertexShader: /* glsl */ `
      attribute float aSize; attribute float aPhase;
      uniform float uTime; uniform float uPixelRatio;
      varying vec3 vColor; varying float vTw;
      void main(){
        vColor = color;
        vTw = 0.6 + 0.4 * sin(uTime * (0.6 + aPhase*0.3) + aPhase * 7.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio * 2.0;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying float vTw;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor * a * vTw, a * vTw);
      }`,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.userData.update = (t) => (mat.uniforms.uTime.value = t);
  points.userData.setPixelRatio = (pr) => (mat.uniforms.uPixelRatio.value = pr);
  return points;
}
