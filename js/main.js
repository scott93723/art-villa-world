// ---------------------------------------------------------------------------
// Villa Ravine — real-time architectural showcase. Renderer, sky, sun,
// day/evening cycle, camera choreography.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildMaterials } from './materials.js';
import { buildHouse, D } from './house.js';
import { buildFurniture } from './furniture.js';
import { buildSite } from './site.js';

const canvas = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 500);
camera.position.set(24, 10, -22);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI * 0.72;   // interior views may look upward
controls.minDistance = 1.2;
controls.maxDistance = 90;
controls.target.set(0, 2.6, 0);

// ------------------------------- SKY ---------------------------------------
const skyU = {
  top: { value: new THREE.Color(0x2a5da8) },
  mid: { value: new THREE.Color(0xbdd6ee) },
  bot: { value: new THREE.Color(0x6f6a60) },
  sunDir: { value: new THREE.Vector3(0.4, 0.5, 0.6) },
  sunCol: { value: new THREE.Color(0xffe6c0) },
  sunSize: { value: 0.9 },
  night: { value: 0 },
};
const skyMat = new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false,
  vertexShader: `varying vec3 vW; void main(){ vW = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
  fragmentShader: `
    uniform vec3 top, mid, bot, sunCol; uniform vec3 sunDir; uniform float sunSize; uniform float night;
    varying vec3 vW;
    void main(){
      vec3 d = normalize(vW);
      float h = d.y;
      vec3 c = mix(mid, top, clamp(pow(max(h,0.0), 0.26), 0.0, 1.0));
      c = mix(c, bot, clamp(-h*6.0, 0.0, 1.0));
      float hz = exp(-abs(h)*9.0);
      c = mix(c, mid*1.04, hz*0.7);
      float sd = max(dot(d, normalize(sunDir)), 0.0);
      c += sunCol * pow(sd, 1200.0/max(sunSize,0.05)) * 3.0;      // disk
      c += sunCol * pow(sd, 8.0) * 0.28 * sunSize;                 // glow
      c += sunCol * pow(sd, 2.0) * 0.06;
      if (night > 0.01) {
        vec2 su = vec2(atan(d.z, d.x) * 2.4, asin(clamp(d.y, -1.0, 1.0)) * 3.6);
        vec2 cell = floor(su * 120.0);
        float r1 = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
        float r2 = fract(sin(dot(cell, vec2(63.7264, 10.873))) * 24634.6345);
        float st = smoothstep(0.9955, 0.9995, r1) * (0.4 + r2 * 0.6);
        c += vec3(0.85, 0.9, 1.0) * st * night * max(d.y * 1.6, 0.0) * 2.2;
      }
      gl_FragColor = vec4(c, 1.0);
    }`,
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 20), skyMat);
skyDome.frustumCulled = false;
scene.add(skyDome);

const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
const envScene = new THREE.Scene();
const envDome = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 16), skyMat);
envScene.add(envDome);
let envRT = null, lastEnvBucket = -1;
function updateEnv(t) {
  const b = Math.round(t * 14);
  if (b === lastEnvBucket) return;
  lastEnvBucket = b;
  if (envRT) envRT.dispose();
  envRT = pmrem.fromScene(envScene, 0.04);
  scene.environment = envRT.texture;
}

// ------------------------------- LIGHTS ------------------------------------
const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
const sc = sun.shadow.camera;
sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 130;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.035;
scene.add(sun, sun.target);

const hemi = new THREE.HemisphereLight(0xbcd6f0, 0x5a5348, 0.6);
scene.add(hemi);
const bounce = new THREE.DirectionalLight(0xdfe8f2, 0.25);   // soft north fill
bounce.position.set(-8, 6, -14);
scene.add(bounce);
const moon = new THREE.DirectionalLight(0x8fa8dc, 0);       // night rim light
moon.position.set(-26, 20, -20);
scene.add(moon);

// ------------------------------- MODEL -------------------------------------
const M = buildMaterials();
const house = buildHouse(M);
const store = house.userData;
const furniture = buildFurniture(M, store);
const site = buildSite(M);
scene.add(house, furniture, site);
scene.fog = new THREE.Fog(0xc8d6e2, 70, 210);

// ------------------------------- DAY CYCLE ---------------------------------
const KEYS = [
  // t, elev(deg), az(deg), sunColor, sunInt, top, mid, bot, hemi, hemiGround, interior, exposure, fog
  { t: 0.00, e: -3, a: 92, sc: 0x4b5b86, si: 0.05, top: 0x101a30, mid: 0x2a3348, bot: 0x14161c, hi: 0.16, hg: 0x1a1a20, in: 1.0, ex: 1.15, fog: 0x1a2130 },
  { t: 0.12, e: 4, a: 88, sc: 0xff9a52, si: 1.5, top: 0x27436e, mid: 0xd09878, bot: 0x3a3130, hi: 0.32, hg: 0x504a40, in: 0.85, ex: 1.05, fog: 0x9a7a68 },
  { t: 0.30, e: 32, a: 70, sc: 0xffe0b4, si: 3.4, top: 0x2f66b0, mid: 0xc4dcf0, bot: 0x6b6558, hi: 0.6, hg: 0x7d7a70, in: 0.16, ex: 1.0, fog: 0xc2d4e4 },
  { t: 0.50, e: 66, a: 8, sc: 0xfff6e4, si: 4.0, top: 0x2a63b8, mid: 0xd2e4f4, bot: 0x77705f, hi: 0.75, hg: 0x827e72, in: 0.05, ex: 0.95, fog: 0xcfdeeb },
  { t: 0.70, e: 27, a: -60, sc: 0xffd79a, si: 3.2, top: 0x2d5fa4, mid: 0xd8d3c0, bot: 0x6e6252, hi: 0.55, hg: 0x7a7365, in: 0.3, ex: 1.0, fog: 0xd3cdb8 },
  { t: 0.84, e: 6, a: -80, sc: 0xffae7a, si: 2.2, top: 0x1f3f77, mid: 0xe09a62, bot: 0x413229, hi: 0.34, hg: 0x4e4438, in: 0.85, ex: 1.05, fog: 0xa8896c },
  { t: 0.93, e: -1.5, a: -88, sc: 0xc4643c, si: 0.42, top: 0x152a54, mid: 0x6a5470, bot: 0x201d26, hi: 0.22, hg: 0x2a2836, in: 1.0, ex: 1.15, fog: 0x4a4060 },
  { t: 1.00, e: -6, a: -92, sc: 0x3a4a78, si: 0.03, top: 0x070d1a, mid: 0x15203a, bot: 0x0a0d14, hi: 0.13, hg: 0x14161f, in: 1.0, ex: 1.25, fog: 0x101828 },
];
const cA = new THREE.Color(), cB = new THREE.Color();
function lerpC(target, a, b, f) { cA.setHex(a); cB.setHex(b); target.copy(cA).lerp(cB, f); }

let tod = 0.28;
function applyTOD(t) {
  let i = 0;
  while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
  const A = KEYS[i], B = KEYS[i + 1];
  const f = THREE.MathUtils.clamp((t - A.t) / (B.t - A.t), 0, 1);
  const L = (k) => A[k] + (B[k] - A[k]) * f;
  const elev = THREE.MathUtils.degToRad(L('e')), az = THREE.MathUtils.degToRad(L('a'));
  const R = 60;
  sun.position.set(R * Math.cos(elev) * Math.sin(az), R * Math.sin(elev), R * Math.cos(elev) * Math.cos(az));
  sun.target.position.set(0, 2, 2);
  sun.intensity = L('si');
  lerpC(sun.color, A.sc, B.sc, f);
  skyU.sunDir.value.copy(sun.position).normalize();
  lerpC(skyU.sunCol.value, A.sc, B.sc, f);
  skyU.sunSize.value = 0.55 + Math.max(0, 1 - Math.abs(elev) * 3) * 1.1;
  lerpC(skyU.top.value, A.top, B.top, f);
  lerpC(skyU.mid.value, A.mid, B.mid, f);
  lerpC(skyU.bot.value, A.bot, B.bot, f);
  hemi.intensity = L('hi');
  lerpC(hemi.color, A.mid, B.mid, f);
  cA.setHex(A.top); cB.setHex(B.top); hemi.color.lerp(cA.lerp(cB, f), 0.5);
  lerpC(hemi.groundColor, A.hg, B.hg, f);
  bounce.intensity = 0.06 + L('hi') * 0.3;
  const nightF = THREE.MathUtils.clamp(1 - L('hi') / 0.3, 0, 1);
  moon.intensity = 0.55 * nightF;
  skyU.night.value = nightF;
  renderer.toneMappingExposure = L('ex');
  lerpC(scene.fog.color, A.fog, B.fog, f);
  const interior = L('in');
  const day = THREE.MathUtils.clamp(L('hi') / 0.75, 0, 1);
  store.lights.forEach((o) => {
    if (!o.warm) o.warm = o.light.color.clone();
    if (o.kind === 'exterior') {
      o.light.intensity = o.base * Math.max(0, interior * 1.2 - 0.15);
    } else if (o.kind === 'fire') {
      o.light.intensity = o.base * (0.35 + 0.65 * interior);
    } else {
      // interior fixtures double as bounce fill: cool + soft by day, warm at night
      o.light.intensity = o.base * (0.30 + 0.70 * interior) * (1 - day * 0.35);
      o.light.color.copy(o.warm).lerp(new THREE.Color(0xfff2e2), day * 0.6);
    }
  });
  store.emissives.forEach((m) => {
    m.material.emissiveIntensity = (m.material === M.lampWarm ? 1.1 : 0.32) * (0.06 + interior * 1.5);
  });
  M.water.color.setHex(0x2c5f6b).lerp(new THREE.Color(0x14313c), 1 - Math.min(1, L('hi') * 1.4));
  updateEnv(t);
  const names = [[0.05, '夜晚'], [0.19, '黎明'], [0.42, '清晨'], [0.6, '正午'], [0.78, '午後'], [0.9, '金色時刻'], [0.955, '黃昏'], [1.01, '夜晚']];
  document.getElementById('todlabel').textContent = (names.find((n) => t < n[0]) || names[7])[1];
}

// ------------------------------- VIEWS -------------------------------------
const VIEWS = [
  { n: '入口庭院', p: [23, 8.5, -21], t: [0.5, 2.8, -1.5] },
  { n: '西南花園', p: [-20, 7.5, 21], t: [-1.5, 3.0, 3.5] },
  { n: '南立面', p: [2.5, 6.0, 35], t: [0.8, 3.4, 3.0] },
  { n: '露台層', p: [-2.2, 1.72, 9.8], t: [3.6, 2.1, 4.6] },
  { n: '客廳', p: [-7.6, 1.60, 3.2], t: [-3.2, 1.45, -3.4] },
  { n: '廚房與餐廳', p: [3.1, 1.62, -3.6], t: [7.2, 1.35, 3.6] },
  { n: '樓梯廳與挑空', p: [2.15, 1.68, 4.15], t: [-0.55, 2.7, -0.4] },
  { n: '主臥', p: [2.5, 5.35, 6.3], t: [6.8, 4.6, 2.4] },
  { n: '屋頂露台', p: [-8.35, 5.05, -3.6], t: [-6.5, 4.15, 5.4] },
  { n: '細節 · 材料交接', p: [-6.05, 1.78, 8.75], t: [-8.7, 2.75, 5.1] },
  { n: '鳥瞰', p: [15, 23, 33], t: [-2.5, 2, 6.5] },
];
const btnWrap = document.getElementById('viewbtns');
VIEWS.forEach((v, i) => {
  const b = document.createElement('button');
  b.innerHTML = `<span class="n">${String(i + 1).padStart(2, '0')}</span>${v.n}`;
  b.onclick = () => goto(i);
  btnWrap.appendChild(b);
});
let tween = null;
function goto(i) {
  const v = VIEWS[i];
  [...btnWrap.children].forEach((c, k) => c.classList.toggle('active', k === i));
  tween = {
    t: 0, dur: 1.7,
    p0: camera.position.clone(), p1: new THREE.Vector3(...v.p),
    t0: controls.target.clone(), t1: new THREE.Vector3(...v.t),
  };
  spin = false; document.querySelector('[data-t=spin]').classList.remove('on');
}

// ------------------------------- UI ----------------------------------------
const todEl = document.getElementById('tod');
todEl.oninput = () => { tod = parseFloat(todEl.value); applyTOD(tod); };
let spin = false, doorsOpen = true, roofOn = true;
document.querySelectorAll('.toggles button').forEach((b) => {
  b.onclick = () => {
    b.classList.toggle('on');
    const on = b.classList.contains('on');
    const k = b.dataset.t;
    if (k === 'walls') {
      store.upper.visible = on; store.upperFurniture.visible = on;
      store.roof.visible = on && roofOn; store.roofTerrace.visible = on;
      store.roofTerraceFurniture.visible = on;
    }
    if (k === 'roof') { roofOn = on; store.roof.visible = on && store.upper.visible; }
    if (k === 'furn') { furniture.visible = on; }
    if (k === 'veg') { site.userData.veg.visible = on; }
    if (k === 'spin') { spin = on; }
    if (k === 'doors') { doorsOpen = on; }
  };
});
// 平面圖卡片：點圖紙收起，收起後右上角留一枚按鈕把它叫回來 —— 收起就再也拿不
// 回來的東西，使用者第一次點之前得先猶豫一下。
const planCard = document.getElementById('plan');
const planBtn = document.getElementById('planbtn');
const showPlan = (on) => { planCard.classList.toggle('gone', !on); planBtn.hidden = on; };
planCard.onclick = () => showPlan(false);
planBtn.onclick = () => showPlan(true);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// stats
let tris = 0, parts = 0;
scene.traverse((o) => {
  if (o.isMesh) {
    parts += o.isInstancedMesh ? o.count : 1;
    const g = o.geometry;
    const n = (g.index ? g.index.count : g.attributes.position.count) / 3;
    tris += n * (o.isInstancedMesh ? o.count : 1);
  }
});
document.getElementById('stat-tris').textContent = (tris / 1000).toFixed(0) + 'k';
document.getElementById('stat-parts').textContent = parts;

applyTOD(tod);
// 開場就站在正面。入口院落那一眼是敘事的起點，卻是斜著看過去的半張臉；一進來
// 先給整張南立面 —— 玻璃、懸挑、露台一次看全，之後再自己走去別的機位。
const FRONT = VIEWS.findIndex((v) => v.n === '南立面');
goto(FRONT);
camera.position.set(...VIEWS[FRONT].p);
controls.target.set(...VIEWS[FRONT].t);

// ------------------------------- LOOP --------------------------------------
const clock = new THREE.Clock();
let fpsT = 0, fpsN = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const el = clock.elapsedTime;

  if (tween) {
    tween.t += dt / tween.dur;
    const k = Math.min(1, tween.t);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    camera.position.lerpVectors(tween.p0, tween.p1, e);
    controls.target.lerpVectors(tween.t0, tween.t1, e);
    if (k >= 1) tween = null;
  }
  if (spin) {
    const r = 30, a = el * 0.055;
    camera.position.set(Math.sin(a) * r, 9 + Math.sin(a * 1.7) * 2.5, Math.cos(a) * r + 2);
    controls.target.set(0, 3.0, 2);
  }

  // sliding doors
  ['slideA', 'slideB'].forEach((k, i) => {
    const cwg = store.tagged[k];
    if (!cwg || !cwg.userData.slider) return;
    const sp = cwg.userData.slider;
    const goal = doorsOpen ? cwg.userData.slideRange * (i ? 0.85 : 0.95) : 0;
    sp.position.x += (sp.userData.x0 === undefined ? (sp.userData.x0 = sp.position.x, 0) : 0);
    const base = sp.userData.x0;
    sp.position.x = THREE.MathUtils.damp(sp.position.x, base + goal, 2.2, dt);
  });
  // front door slowly ajar
  const fd = store.tagged.frontDoor;
  if (fd) fd.userData.pivot.rotation.y = THREE.MathUtils.damp(fd.userData.pivot.rotation.y, doorsOpen ? -0.62 : 0, 2, dt);

  // fire flicker
  store.animated.forEach((a) => {
    if (a.type === 'fire') {
      const f = 0.75 + Math.sin(el * 7.3) * 0.12 + Math.sin(el * 13.7) * 0.08 + Math.sin(el * 3.1) * 0.1;
      a.mesh.material.emissiveIntensity = 2.2 * f;
    }
  });
  const fireLight = store.lights.find((l) => l.kind === 'fire');
  if (fireLight) fireLight.light.intensity = fireLight.base * (0.8 + Math.sin(el * 9.1) * 0.15 + Math.sin(el * 4.3) * 0.1);

  // water
  if (M.water.normalMap) {
    M.water.normalMap.offset.set(el * 0.012, el * 0.02);
  }

  controls.update();
  if (camera.position.y < -0.15) camera.position.y = -0.15;   // never below grade
  renderer.render(scene, camera);

  fpsN++; fpsT += dt;
  if (fpsT > 0.5) {
    document.getElementById('stat-fps').textContent = Math.round(fpsN / fpsT);
    fpsN = 0; fpsT = 0;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
setTimeout(() => document.getElementById('loader').classList.add('gone'), 350);
window.__ready = true;
