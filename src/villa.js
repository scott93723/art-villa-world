import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

const canvas = document.getElementById('canvas');
const loading = document.getElementById('loading');
const crosshair = document.getElementById('crosshair');
const artInfo = document.getElementById('art-info');
const closeInfo = document.getElementById('close-info');
const buyBtn = document.getElementById('buy-btn');
const backBtn = document.getElementById('back-btn');
const tourPrev = document.getElementById('tour-prev');
const tourNext = document.getElementById('tour-next');
const tourToggle = document.getElementById('tour-toggle');
const positionInfo = document.getElementById('position-info');
const villaTitle = document.getElementById('villa-title');
const villaSubtitle = document.getElementById('villa-subtitle');
const artworkCount = document.getElementById('artwork-count');

const infoImage = document.getElementById('info-image');
const infoTitle = document.getElementById('info-title');
const infoMeta = document.getElementById('info-meta');
const infoPrice = document.getElementById('info-price');

// Get artist ID from URL
const urlParams = new URLSearchParams(window.location.search);
const artistId = urlParams.get('artist') || 'icy';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0d0d);
scene.fog = new THREE.FogExp2(0x0d0d0d, 0.03);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

RectAreaLightUniformsLib.init();

// Controls
const controls = new PointerLockControls(camera, canvas);
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const speed = 4;

canvas.addEventListener('click', () => {
  if (tourActive) {
    pauseTour();
    return;
  }
  controls.lock();
});

const onKeyDown = (e) => {
  switch (e.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyD': moveRight = true; break;
    default: return;
  }
  if (tourActive) pauseTour();
};

const onKeyUp = (e) => {
  switch (e.code) {
    case 'KeyW': moveForward = false; break;
    case 'KeyS': moveBackward = false; break;
    case 'KeyA': moveLeft = false; break;
    case 'KeyD': moveRight = false; break;
  }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// Materials
const wallMat = new THREE.MeshStandardMaterial({ color: 0xeae5d8, roughness: 0.9 });
const floorMat = new THREE.MeshStandardMaterial({ color: 0x8a7f70, roughness: 0.6 });
const concreteMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.95 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.7 });
const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff, metalness: 0, roughness: 0.05, transmission: 0.92, thickness: 0.1, transparent: true
});
const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 });

// Load artist data
let artistData = null;
let artworks = [];
let artworkMeshes = [];

async function loadArtistData() {
  try {
    const response = await fetch('./data/artists.json');
    const data = await response.json();
    artistData = data.artists.find(a => a.id === artistId);
    if (!artistData) {
      throw new Error(`Artist not found: ${artistId}`);
    }
    artworks = artistData.artworks;
    villaTitle.textContent = artistData.name;
    villaSubtitle.textContent = artistData.tagline;
    artworkCount.textContent = artworks.length;
  } catch (err) {
    console.error('Failed to load artist data:', err);
    loading.textContent = '無法載入藝術家資料';
    throw err;
  }
}

// Build villa interior
function buildVilla() {
  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Ceiling
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), wallMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 3.6;
  scene.add(ceiling);

  function makeWall(w, h, x, y, z, ry = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.25), wallMat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  // Walls
  makeWall(16, 3.6, 0, 1.8, -8);
  makeWall(16, 3.6, 0, 1.8, 8);
  makeWall(16, 3.6, -8, 1.8, 0, Math.PI/2);
  makeWall(16, 3.6, 8, 1.8, 0, Math.PI/2);

  // Front wall with opening
  makeWall(5, 3.6, -5.5, 1.8, 8);
  makeWall(5, 3.6, 5.5, 1.8, 8);
  makeWall(6, 1.2, 0, 3, 8);

  // Glass entrance
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.4), glassMat);
  glass.position.set(0, 1.2, 8);
  scene.add(glass);

  // Base
  const base = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.4, 16.4), concreteMat);
  base.position.y = 0.2;
  base.receiveShadow = true;
  scene.add(base);

  // Central beam
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.6, 0.3), woodMat);
  beam.position.set(0, 1.8, 0);
  beam.castShadow = true;
  scene.add(beam);

  // Pedestals for sculpture/featured items
  const pedestalGeo = new THREE.BoxGeometry(0.8, 1.2, 0.8);
  const pedestalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  for (let i = 0; i < 4; i++) {
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    pedestal.position.set(Math.cos(angle) * 3.5, 0.6, Math.sin(angle) * 3.5);
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    scene.add(pedestal);
  }
}

// Create artwork display
function createArtwork(art) {
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.load(art.image, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      const aspect = tex.image.width / tex.image.height;

      const frameH = 1.6;
      const frameW = Math.min(frameH * aspect, 1.8);
      const clampedH = frameW / aspect;

      const group = new THREE.Group();
      group.position.set(art.position.x, 1.9, art.position.z);
      group.rotation.y = art.position.ry;

      // Frame
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(frameW + 0.12, clampedH + 0.12, 0.06),
        frameMat
      );
      frame.castShadow = true;
      group.add(frame);

      // Canvas
      const artMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(frameW, clampedH),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })
      );
      artMesh.position.z = 0.031;
      artMesh.userData = { artwork: art };
      group.add(artMesh);

      // Plaque — 2x resolution, font auto-shrinks so long titles never clip
      const plaqueCanvas = document.createElement('canvas');
      plaqueCanvas.width = 1024;
      plaqueCanvas.height = 256;
      const ctx = plaqueCanvas.getContext('2d');
      ctx.fillStyle = '#f5f0e8';
      ctx.fillRect(0, 0, 1024, 256);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const plaqueFamily = '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif';
      const fitFont = (text, weight, size, maxWidth) => {
        do {
          ctx.font = `${weight} ${size}px ${plaqueFamily}`;
          size -= 2;
        } while (size > 20 && ctx.measureText(text).width > maxWidth);
      };

      ctx.fillStyle = '#1a1a1a';
      fitFont(art.title, 700, 64, 940);
      ctx.fillText(art.title, 512, 92);
      ctx.fillStyle = '#666';
      const plaqueSub = `${art.year} · ${art.price} ${art.currency}`;
      fitFont(plaqueSub, 400, 48, 940);
      ctx.fillText(plaqueSub, 512, 180);
      const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
      plaqueTex.colorSpace = THREE.SRGBColorSpace;

      const plaqueW = frameW;
      const plaqueH = plaqueW * (128 / 512);
      const plaque = new THREE.Mesh(
        new THREE.PlaneGeometry(plaqueW, plaqueH),
        new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.8 })
      );
      plaque.position.set(0, -clampedH / 2 - plaqueH / 2 - 0.1, 0.031);
      group.add(plaque);

      // Spotlight
      const spot = new THREE.SpotLight(0xfff5e6, 25, 6, Math.PI / 5, 0.4, 1);
      spot.position.set(0, 1.2, 1.4);
      spot.target = artMesh;
      spot.castShadow = true;
      group.add(spot);
      group.add(spot.target);

      scene.add(group);
      artworkMeshes.push(artMesh);
      resolve();
    });
  });
}

// Lighting
function setupLighting() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff0dd, 1.2);
  sun.position.set(6, 8, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 25;
  sun.shadow.camera.left = -10; sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -10;
  scene.add(sun);

  const rectLight = new THREE.RectAreaLight(0xffecd2, 2, 12, 12);
  rectLight.position.set(0, 3.5, 0);
  rectLight.rotation.x = -Math.PI / 2;
  scene.add(rectLight);
}

// Raycaster for artwork interaction
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);

function checkArtworkHover() {
  raycaster.setFromCamera(center, camera);
  const intersects = raycaster.intersectObjects(artworkMeshes);

  if (intersects.length > 0 && intersects[0].distance < 3) {
    crosshair.classList.add('hover');
    return intersects[0].object.userData.artwork;
  } else {
    crosshair.classList.remove('hover');
    return null;
  }
}

let hoveredArtwork = null;

canvas.addEventListener('click', () => {
  if (controls.isLocked && hoveredArtwork) {
    showArtInfo(hoveredArtwork);
  }
});

function showArtInfo(art) {
  infoImage.src = art.image;
  infoTitle.textContent = art.title;
  infoMeta.textContent = `${art.year} · ${art.size} · ${art.material}`;
  infoPrice.textContent = `${art.price} ${art.currency}`;
  artInfo.classList.add('active');
  controls.unlock();
}

closeInfo.addEventListener('click', () => {
  artInfo.classList.remove('active');
  controls.lock();
});

buyBtn.addEventListener('click', () => {
  alert(`感謝您對「${hoveredArtwork?.title}」的興趣！\n\n請透過以下方式聯絡 ICY 購買：\nemail: icywang0330@gmail.com\nFB: www.facebook.com/deerlu.artist`);
});

backBtn.addEventListener('click', () => {
  document.body.style.transition = 'opacity 0.8s ease';
  document.body.style.opacity = '0';
  setTimeout(() => {
    window.location.href = './index.html';
  }, 800);
});

// Movement boundaries
const bounds = { minX: -7.5, maxX: 7.5, minZ: -7.5, maxZ: 7.5 };

function clampPosition() {
  camera.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, camera.position.x));
  camera.position.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, camera.position.z));
  camera.position.y = 1.6;
}

// Update position info
function updatePositionInfo() {
  const x = camera.position.x.toFixed(1);
  const z = camera.position.z.toFixed(1);
  let area = '中央大廳';
  if (z < -5) area = '北牆作品區';
  else if (z > 5) area = '入口大廳';
  else if (x < -5) area = '西牆作品區';
  else if (x > 5) area = '東牆作品區';
  positionInfo.textContent = `位置: ${area}`;
}

// Auto tour — dwell on each artwork, then ease to the next
const DWELL_TIME = 3.5;
const TRAVEL_TIME = 2.0;
let tourActive = false;
let tourIndex = 0;
let tourPhase = 'travel'; // 'travel' | 'dwell'
let tourPhaseTime = 0;
let tourFrom = null;
let tourTo = null;
const currentTarget = new THREE.Vector3(0, 1.8, 0);

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function artworkView(art) {
  const { x, z, ry } = art.position;
  const nx = Math.sin(ry);
  const nz = Math.cos(ry);
  return {
    pos: new THREE.Vector3(x + nx * 2.2, 1.7, z + nz * 2.2),
    target: new THREE.Vector3(x, 1.8, z)
  };
}

function updateTourInfo() {
  positionInfo.textContent = `${tourIndex + 1} / ${artworks.length} · ${artworks[tourIndex].title}`;
}

function beginTravelTo(index) {
  tourFrom = { pos: camera.position.clone(), target: currentTarget.clone() };
  tourTo = artworkView(artworks[index]);
  tourPhase = 'travel';
  tourPhaseTime = 0;
  updateTourInfo();
}

function startTour(index = 0) {
  tourActive = true;
  tourIndex = index;
  if (controls.isLocked) controls.unlock();
  tourToggle.textContent = '⏸ 暫停導覽';
  beginTravelTo(tourIndex);
}

function pauseTour() {
  tourActive = false;
  tourToggle.textContent = '▶ 自動導覽';
}

function goToArtwork(i) {
  tourIndex = (i + artworks.length) % artworks.length;
  if (!tourActive) {
    tourActive = true;
    if (controls.isLocked) controls.unlock();
    tourToggle.textContent = '⏸ 暫停導覽';
  }
  beginTravelTo(tourIndex);
}

tourToggle.addEventListener('click', () => {
  if (tourActive) pauseTour();
  else startTour(tourIndex);
});
tourPrev.addEventListener('click', () => goToArtwork(tourIndex - 1));
tourNext.addEventListener('click', () => goToArtwork(tourIndex + 1));

function updateTour(delta) {
  tourPhaseTime += delta;
  if (tourPhase === 'travel') {
    const t = Math.min(tourPhaseTime / TRAVEL_TIME, 1);
    const e = easeInOutCubic(t);
    camera.position.lerpVectors(tourFrom.pos, tourTo.pos, e);
    currentTarget.lerpVectors(tourFrom.target, tourTo.target, e);
    if (t >= 1) {
      tourPhase = 'dwell';
      tourPhaseTime = 0;
    }
  } else {
    camera.position.copy(tourTo.pos);
    currentTarget.copy(tourTo.target);
    if (tourPhaseTime >= DWELL_TIME) {
      tourIndex = (tourIndex + 1) % artworks.length;
      beginTravelTo(tourIndex);
    }
  }
  camera.lookAt(currentTarget);
}

// Animation loop
let prevTime = performance.now();

function animate(time) {
  requestAnimationFrame(animate);

  const delta = Math.min((time - prevTime) / 1000, 0.1);
  prevTime = time;

  if (tourActive) {
    updateTour(delta);
  } else if (controls.isLocked) {
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    velocity.z = direction.z * speed * delta;
    velocity.x = direction.x * speed * delta;

    controls.moveForward(velocity.z);
    controls.moveRight(velocity.x);

    clampPosition();
    updatePositionInfo();
    hoveredArtwork = checkArtworkHover();
  }

  crosshair.style.opacity = controls.isLocked ? '1' : '0';
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize
async function init() {
  await loadArtistData();
  buildVilla();
  setupLighting();

  // Wait for the CJK webfont so plaque canvas text uses the right glyphs/metrics
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('700 64px "Noto Sans TC"'),
        document.fonts.load('400 48px "Noto Sans TC"'),
      ]),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  } catch (e) { /* fall back to system fonts */ }

  for (const art of artworks) {
    await createArtwork(art);
  }

  loading.style.opacity = '0';
  setTimeout(() => loading.remove(), 500);
  animate(performance.now());
  startTour(0);
}

init().catch(err => {
  console.error(err);
  loading.textContent = '載入失敗，請重新整理';
});
