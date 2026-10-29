import * as THREE from 'three';
import { heightAt } from './terrain.js';
import { seeded } from './noise.js';

// Western tiger swallowtails: yellow wings with black stripes, common in Washington meadows.
function wingTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 96;
  const g = c.getContext('2d');
  g.beginPath();
  g.moveTo(4, 90);
  g.quadraticCurveTo(10, 4, 124, 6);
  g.quadraticCurveTo(110, 50, 70, 70);
  g.quadraticCurveTo(40, 96, 4, 90);
  g.closePath();
  g.fillStyle = '#f6cf3a';
  g.fill();
  g.save();
  g.clip();
  g.strokeStyle = '#1b1712';
  for (const [x, w] of [[30, 7], [55, 6], [80, 8], [104, 5]]) {
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x - 20, 96);
    g.lineTo(x + 10, 0);
    g.stroke();
  }
  g.lineWidth = 12;
  g.stroke(new Path2D('M4 90 Q10 4 124 6 Q110 50 70 70 Q40 96 4 90'));
  g.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createButterflies(count) {
  const rand = seeded(5);
  const tex = wingTexture();
  const mat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide, alphaTest: 0.5, transparent: false });
  const wingGeo = new THREE.PlaneGeometry(0.075, 0.056).translate(0.0375, 0, 0).rotateX(-Math.PI / 2);
  const flies = [];
  const group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const body = new THREE.Group();
    const left = new THREE.Mesh(wingGeo, mat);
    const right = new THREE.Mesh(wingGeo, mat);
    right.scale.x = -1;
    const thorax = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.003, 0.05, 5).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#211a12' }));
    body.add(left, right, thorax);
    group.add(body);
    flies.push({
      body, left, right,
      cx: (rand() - 0.5) * 30, cz: -rand() * 30 + 6,
      rx: 2 + rand() * 4, rz: 2 + rand() * 4,
      sp: 0.12 + rand() * 0.12, ph: rand() * 10, flap: 14 + rand() * 6, lift: 0,
    });
  }
  const p = new THREE.Vector3();
  const next = new THREE.Vector3();
  return {
    group,
    flies,
    update(t, still) {
      for (const f of flies) {
        const tt = still ? f.ph : t * f.sp + f.ph;
        const at = (s) => {
          const x = f.cx + Math.sin(s) * f.rx + Math.sin(s * 2.7) * 0.8;
          const z = f.cz + Math.cos(s * 0.8) * f.rz;
          return [x, heightAt(x, z) + 0.6 + Math.sin(s * 3.1) * 0.25 + f.lift, z];
        };
        p.set(...at(tt));
        next.set(...at(tt + 0.05));
        f.body.position.copy(p);
        f.body.lookAt(next);
        const flap = still ? 0.6 : Math.sin(t * f.flap + f.ph) * 0.9 + 0.2;
        f.left.rotation.z = flap;
        f.right.rotation.z = -flap;
      }
    },
  };
}

// Pollen and dust motes, glowing when they catch the low sun.
export function createPollen(count) {
  const rand = seeded(9);
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos.set([(rand() - 0.5) * 40, rand() * 6, -rand() * 50 + 20], i * 3);
    seed[i] = rand();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3() }, uPixelRatio: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aSeed; uniform float uTime; uniform float uPixelRatio; uniform vec3 uSunDir;
      varying float vA;
      void main(){
        vec3 p = position;
        p.x += sin(uTime * 0.21 + aSeed * 40.0) * 1.2;
        p.y += mod(uTime * (0.05 + aSeed * 0.08) + aSeed * 6.0, 6.0);
        p.z += cos(uTime * 0.17 + aSeed * 23.0) * 1.2;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vec3 V = normalize((modelMatrix * vec4(p, 1.0)).xyz - cameraPosition);
        float lit = 0.25 + pow(max(dot(V, uSunDir), 0.0), 6.0) * 2.5;
        vA = lit * (0.5 + 0.5 * sin(uTime * 2.0 + aSeed * 50.0));
        gl_PointSize = (1.4 + aSeed * 1.8) * uPixelRatio * 22.0 / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA;
        gl_FragColor = vec4(vec3(1.0, 0.9, 0.65) * a, a);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return {
    points,
    update(t, sunDir, pr) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uSunDir.value.copy(sunDir);
      mat.uniforms.uPixelRatio.value = pr;
    },
  };
}
