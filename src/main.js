import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

const canvas = document.getElementById('canvas');
const loading = document.getElementById('loading');
const portalHint = document.getElementById('portal-hint');
const cameraButtons = document.querySelectorAll('#camera-positions button');
const timeSlider = document.getElementById('time-slider');
const timeLabel = document.getElementById('time-label');
const layerButtons = document.querySelectorAll('#layer-toggles button');
const autoOrbitCheck = document.getElementById('auto-orbit');
const toggleFloorPlan = document.getElementById('toggle-floor-plan');
const floorPlanContent = document.getElementById('floor-plan-content');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.FogExp2(0xB0D4F0, 0.004);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 4, 20);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

RectAreaLightUniformsLib.init();

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 3, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 1.75;
controls.minDistance = 6;
controls.maxDistance = 40;
controls.autoRotate = false;
controls.autoRotateSpeed = 0.5;

// ============================================================
// MATERIALS
// ============================================================
const concreteMat = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.85 });
const darkConcreteMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.9 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.75 });
const woodSlatMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.8 });
const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff, metalness: 0, roughness: 0.02, transmission: 0.95, thickness: 0.1, transparent: true
});
const grassMat = new THREE.MeshStandardMaterial({ color: 0x5a8a4a, roughness: 0.9 });
const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.9 });
const poolWaterMat = new THREE.MeshPhysicalMaterial({
  color: 0x1a6a9a, metalness: 0.1, roughness: 0.05, transmission: 0.75, thickness: 0.5, transparent: true
});
const portalMat = new THREE.MeshStandardMaterial({
  color: 0xff6b9d, emissive: 0xff6b9d, emissiveIntensity: 2, roughness: 0.3
});
const furnitureWhite = new THREE.MeshStandardMaterial({ color: 0xf8f4f0, roughness: 0.85 });
const furnitureWood = new THREE.MeshStandardMaterial({ color: 0xa08060, roughness: 0.75 });
const plantGreen = new THREE.MeshStandardMaterial({ color: 0x4a8a3a, roughness: 0.85 });
const warmLight = new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xfff0d0, emissiveIntensity: 1 });

// ============================================================
// LAYER GROUPS
// ============================================================
const layers = {
  roof: new THREE.Group(),
  secondFloor: new THREE.Group(),
  furniture: new THREE.Group(),
  landscape: new THREE.Group(),
  slidingDoor: new THREE.Group()
};

// ============================================================
// SKY
// ============================================================
function createSky() {
  const skyGeo = new THREE.SphereGeometry(200, 32, 32);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x5AA4D0) },
      bottomColor: { value: new THREE.Color(0xB0D4F0) },
      offset: { value: 20 },
      exponent: { value: 0.8 }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.name = 'sky';
  scene.add(sky);

  // Clouds
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 12; i++) {
    const cloud = new THREE.Group();
    const puffCount = 3 + Math.floor(Math.random() * 3);
    for (let j = 0; j < puffCount; j++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(2 + Math.random() * 3, 8, 8),
        cloudMat
      );
      puff.position.set(j * 3 - puffCount, Math.random() * 1, (Math.random() - 0.5) * 2);
      cloud.add(puff);
    }
    cloud.position.set((Math.random() - 0.5) * 150, 30 + Math.random() * 30, (Math.random() - 0.5) * 150);
    layers.landscape.add(cloud);
  }
}

// ============================================================
// TERRAIN & LANDSCAPE
// ============================================================
function createTerrain() {
  const geo = new THREE.PlaneGeometry(120, 120, 128, 128);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getY(i);
    const d = Math.sqrt(x * x + z * z);
    const h = Math.max(0, (d - 18) * 0.12) * Math.sin(x * 0.08) * Math.cos(z * 0.08) * 2;
    pos.setZ(i, h);
  }
  geo.computeVertexNormals();
  const terrain = new THREE.Mesh(geo, grassMat);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.1;
  terrain.receiveShadow = true;
  layers.landscape.add(terrain);

  // Rocks
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 40;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1 + Math.random() * 2, 1),
      rockMat
    );
    rock.position.set(Math.cos(angle) * dist, Math.random() * 1.5, Math.sin(angle) * dist);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    layers.landscape.add(rock);
  }

  // Trees
  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x6a5a42, roughness: 0.9 });
  const treeLeafMat = new THREE.MeshStandardMaterial({ color: 0x4a8a3a, roughness: 0.85 });
  for (let i = 0; i < 18; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 18 + Math.random() * 40;
    const tree = new THREE.Group();

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.3, 4 + Math.random() * 3, 8),
      treeTrunkMat
    );
    trunk.position.y = 2;
    trunk.castShadow = true;
    tree.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2 + Math.random() * 1.5, 1),
      treeLeafMat
    );
    leaves.position.y = 4.5 + Math.random() * 2;
    leaves.scale.y = 1.3 + Math.random() * 0.7;
    leaves.castShadow = true;
    tree.add(leaves);

    tree.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
    tree.rotation.y = Math.random() * Math.PI * 2;
    layers.landscape.add(tree);
  }

  // Tall grass
  const grassBladeMat = new THREE.MeshStandardMaterial({ color: 0x6a9a4a, roughness: 0.9 });
  for (let i = 0; i < 45; i++) {
    const patch = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 1.2 + Math.random() * 1.5, 4),
      grassBladeMat
    );
    patch.position.set((Math.random() - 0.5) * 45, 0.6, (Math.random() - 0.5) * 45);
    patch.castShadow = true;
    layers.landscape.add(patch);
  }
}

// ============================================================
// SWIMMING POOL
// ============================================================
function createPool() {
  const pool = new THREE.Group();

  const basin = new THREE.Mesh(
    new THREE.BoxGeometry(11, 1.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.85 })
  );
  basin.position.y = 0.8;
  basin.castShadow = true;
  basin.receiveShadow = true;
  pool.add(basin);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(10.6, 5.6),
    poolWaterMat
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 1.55;
  water.name = 'pool-water';
  pool.add(water);

  const poolGlow = new THREE.PointLight(0x66bbdd, 1.5, 10);
  poolGlow.position.y = 1.3;
  pool.add(poolGlow);

  for (let i = 0; i < 4; i++) {
    const light = new THREE.PointLight(0x88ccff, 0.8, 5);
    light.position.set(-4 + i * 2.5, 1.1, 0);
    pool.add(light);
  }

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(13, 0.15, 8),
    new THREE.MeshStandardMaterial({ color: 0xc0b0a0, roughness: 0.85 })
  );
  deck.position.y = 0.05;
  deck.receiveShadow = true;
  pool.add(deck);

  // Lounge chairs
  for (let i = 0; i < 2; i++) {
    const chair = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.15, 2), furnitureWhite);
    seat.castShadow = true;
    chair.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1, 0.15), furnitureWhite);
    back.position.set(0, 0.55, -0.9);
    back.rotation.x = -0.4;
    back.castShadow = true;
    chair.add(back);

    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 1.8), darkConcreteMat);
    legs.position.y = -0.08;
    chair.add(legs);

    chair.position.set(-4.5 + i * 9, 0.15, 3.5);
    chair.rotation.y = i === 0 ? 0.3 : -0.3;
    pool.add(chair);
  }

  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16), furnitureWood);
  table.position.set(0, 0.35, 3.5);
  table.castShadow = true;
  pool.add(table);

  // Potted plants
  for (let i = 0; i < 3; i++) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x9a7a6a }));
    pot.position.set(-5 + i * 5, 0.2, 4.5);
    pool.add(pot);

    const plant = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8 + Math.random() * 0.5, 4), plantGreen);
    plant.position.set(-5 + i * 5, 0.8, 4.5);
    pool.add(plant);
  }

  pool.position.set(0, 0, 14);
  layers.landscape.add(pool);
}

// ============================================================
// VILLA
// ============================================================
function createVilla() {
  const villa = new THREE.Group();

  // Ground floor base
  const base = new THREE.Mesh(new THREE.BoxGeometry(16, 4, 10), concreteMat);
  base.position.y = 2;
  base.castShadow = true;
  base.receiveShadow = true;
  villa.add(base);

  // Ground floor glass (sliding door layer)
  const groundGlass = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.2), glassMat);
  groundGlass.position.set(0, 2.4, 5.01);
  layers.slidingDoor.add(groundGlass);

  // Ground floor interior (furniture layer)
  createGroundFloorInterior();

  // Upper floor structure (second floor layer)
  const upper = new THREE.Mesh(new THREE.BoxGeometry(15, 3.5, 9), woodMat);
  upper.position.y = 5.75;
  upper.castShadow = true;
  upper.receiveShadow = true;
  layers.secondFloor.add(upper);

  // Wood slats
  for (let i = 0; i < 28; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.5, 0.15), woodSlatMat);
    slat.position.set(-7.3 + i * 0.55, 5.75, 4.6);
    layers.secondFloor.add(slat);
  }

  // Upper glass
  const upperGlassLeft = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.8), glassMat);
  upperGlassLeft.position.set(-4, 5.75, 4.61);
  layers.secondFloor.add(upperGlassLeft);

  const upperGlassRight = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.8), glassMat);
  upperGlassRight.position.set(3.5, 5.75, 4.61);
  layers.secondFloor.add(upperGlassRight);

  // Upper interior (furniture layer)
  createUpperFloorInterior();

  // Roof (roof layer)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(17, 0.4, 11), darkConcreteMat);
  roof.position.y = 7.7;
  roof.castShadow = true;
  layers.roof.add(roof);

  for (let i = 0; i < 32; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 11.2), woodSlatMat);
    slat.position.set(-7.8 + i * 0.5, 7.75, 0);
    layers.roof.add(slat);
  }

  // Canopy
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 4), woodMat);
  canopy.position.set(-3, 4.2, 6);
  canopy.castShadow = true;
  villa.add(canopy);

  const support1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 8), darkConcreteMat);
  support1.position.set(-5.5, 2.1, 6);
  villa.add(support1);

  const support2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 8), darkConcreteMat);
  support2.position.set(-0.5, 2.1, 6);
  villa.add(support2);

  // Staircase
  createStaircase(villa);

  // Portal
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.8), portalMat);
  portal.position.set(2, 2.4, 5.02);
  portal.name = 'portal';
  villa.add(portal);

  const portalFrame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.0, 0.1), darkConcreteMat);
  portalFrame.position.set(2, 2.4, 5.0);
  villa.add(portalFrame);

  const step = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 1.5), concreteMat);
  step.position.set(2, 0.1, 5.5);
  step.receiveShadow = true;
  villa.add(step);

  // Pathway
  const path = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 14), new THREE.MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.85 }));
  path.rotation.x = -Math.PI / 2;
  path.position.set(2, 0.02, 12);
  path.receiveShadow = true;
  layers.landscape.add(path);

  // Path lights
  for (let i = 0; i < 6; i++) {
    const light = new THREE.PointLight(0xfff0d0, 0.6, 6);
    light.position.set(3.5, 0.4, 6 + i * 2);
    layers.landscape.add(light);

    const lightMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08), warmLight);
    lightMesh.position.copy(light.position);
    layers.landscape.add(lightMesh);
  }

  // Villa label
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 128;
  const ctx = labelCanvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 44px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('溪谷別墅', 256, 80);
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 1.2),
    new THREE.MeshStandardMaterial({ map: labelTex, transparent: true })
  );
  label.position.set(0, 8.2, 5.1);
  villa.add(label);

  scene.add(villa);

  // Add all layer groups to scene
  Object.values(layers).forEach(layer => scene.add(layer));

  return villa;
}

// ============================================================
// INTERIOR
// ============================================================
function createGroundFloorInterior() {
  const interior = new THREE.Group();

  for (let i = 0; i < 6; i++) {
    const light = new THREE.PointLight(0xfff0e0, 0.8, 10);
    light.position.set(-5 + i * 2.5, 3.8, 3);
    interior.add(light);
  }

  // Sofa
  const sofa = new THREE.Group();
  const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, 1), furnitureWhite);
  sofaBase.position.y = 0.2;
  sofa.add(sofaBase);
  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.7, 0.3), furnitureWhite);
  sofaBack.position.set(0, 0.75, -0.35);
  sofa.add(sofaBack);
  const sofaArmL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 1), furnitureWhite);
  sofaArmL.position.set(-1.25, 0.45, 0);
  sofa.add(sofaArmL);
  const sofaArmR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 1), furnitureWhite);
  sofaArmR.position.set(1.25, 0.45, 0);
  sofa.add(sofaArmR);
  sofa.position.set(-4, 0, 2);
  sofa.rotation.y = 0.2;
  interior.add(sofa);

  const table = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.6), furnitureWood);
  table.position.set(-3.5, 0.35, 1);
  interior.add(table);

  const diningTable = new THREE.Mesh(new THREE.BoxGeometry(2, 0.08, 1), furnitureWood);
  diningTable.position.set(3, 0.75, 2.5);
  interior.add(diningTable);

  for (let i = 0; i < 4; i++) {
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), furnitureWhite);
    chair.position.set(2 + (i % 2) * 1.5, 0.25, 1.8 + Math.floor(i / 2) * 1.2);
    interior.add(chair);
  }

  const counter = new THREE.Mesh(new THREE.BoxGeometry(4, 0.9, 0.6), darkConcreteMat);
  counter.position.set(5, 0.45, 4);
  interior.add(counter);

  for (let i = 0; i < 4; i++) {
    const plant = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1 + Math.random() * 0.8, 4), plantGreen);
    plant.position.set(-6 + i * 4, 0.5, 3.5);
    interior.add(plant);
  }

  for (let i = 0; i < 3; i++) {
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x6a9aba, roughness: 0.65 })
    );
    art.position.set(-5 + i * 5, 2, 4.95);
    interior.add(art);
  }

  interior.position.y = 0;
  layers.furniture.add(interior);
}

function createUpperFloorInterior() {
  const interior = new THREE.Group();

  for (let i = 0; i < 4; i++) {
    const light = new THREE.PointLight(0xfff0e0, 0.7, 8);
    light.position.set(-4 + i * 3, 7.2, 3);
    interior.add(light);
  }

  const bed = new THREE.Group();
  const bedBase = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 2.5), furnitureWhite);
  bedBase.position.y = 0.15;
  bed.add(bedBase);
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 0.6), furnitureWhite);
  pillow.position.set(0, 0.4, -0.8);
  bed.add(pillow);
  bed.position.set(-4, 0, 2.5);
  interior.add(bed);

  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 0.6), furnitureWood);
  desk.position.set(3, 0.375, 2.5);
  interior.add(desk);

  const chair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.5), furnitureWhite);
  chair.position.set(3, 0.45, 1.5);
  interior.add(chair);

  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.3), furnitureWood);
  shelf.position.set(5.5, 1.25, 3.5);
  interior.add(shelf);

  for (let i = 0; i < 2; i++) {
    const plant = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8 + Math.random() * 0.5, 4), plantGreen);
    plant.position.set(-6 + i * 10, 0.4, 3.5);
    interior.add(plant);
  }

  interior.position.y = 4;
  layers.furniture.add(interior);
}

function createStaircase(villa) {
  const stairs = new THREE.Group();
  const stepMat = new THREE.MeshStandardMaterial({ color: 0xc0b0a0, roughness: 0.85 });

  for (let i = 0; i < 10; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.4), stepMat);
    step.position.set(0, 0.2 + i * 0.4, 0.2 + i * 0.4);
    step.castShadow = true;
    stairs.add(step);
  }

  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 4, 4.5), darkConcreteMat);
  rail.position.set(0.65, 2, 2);
  stairs.add(rail);

  stairs.position.set(-6.5, 0, 4.5);
  stairs.rotation.y = -Math.PI / 2;
  villa.add(stairs);
}

// ============================================================
// LIGHTING
// ============================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff8f0, 2.0);
sunLight.position.set(20, 40, 20);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 100;
sunLight.shadow.camera.left = -30; sunLight.shadow.camera.right = 30;
sunLight.shadow.camera.top = 30; sunLight.shadow.camera.bottom = -30;
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0xb0d4f0, 0.5);
fillLight.position.set(-20, 30, -20);
scene.add(fillLight);

const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x5a8a4a, 0.5);
scene.add(hemiLight);

// ============================================================
// TIME OF DAY
// ============================================================
const timePresets = [
  { label: '清晨', ambient: 0.7, sun: 1.5, sunColor: 0xffd0a0, sky: 0x87CEEB, fog: 0xB0D4F0, exposure: 1.1 },
  { label: '正午', ambient: 0.9, sun: 2.0, sunColor: 0xfff8f0, sky: 0x87CEEB, fog: 0xB0D4F0, exposure: 1.2 },
  { label: '黃昏', ambient: 0.6, sun: 1.8, sunColor: 0xffa54a, sky: 0xff8a3a, fog: 0xff9a4a, exposure: 1.3 },
  { label: '夜晚', ambient: 0.2, sun: 0.3, sunColor: 0x4a6aaa, sky: 0x1a1a2e, fog: 0x1a1a2e, exposure: 1.0 }
];

function updateTimeOfDay(value) {
  const t = value / 100;
  let preset;

  if (t < 0.33) preset = timePresets[0];
  else if (t < 0.66) preset = timePresets[1];
  else if (t < 0.9) preset = timePresets[2];
  else preset = timePresets[3];

  timeLabel.textContent = preset.label;
  ambientLight.intensity = preset.ambient;
  sunLight.intensity = preset.sun;
  sunLight.color.set(preset.sunColor);
  scene.background.set(preset.sky);
  scene.fog.color.set(preset.fog);
  renderer.toneMappingExposure = preset.exposure;
}

timeSlider.addEventListener('input', (e) => updateTimeOfDay(parseInt(e.target.value)));

// ============================================================
// LAYER TOGGLES
// ============================================================
layerButtons.forEach(button => {
  button.addEventListener('click', () => {
    const layerName = button.dataset.layer;
    const layer = layers[layerName];
    layer.visible = !layer.visible;
    button.classList.toggle('active');
  });
});

// ============================================================
// CAMERA POSITIONS
// ============================================================
const cameraPositions = [
  { pos: [0, 3, 18], target: [0, 2, 0] },       // 01 入口庭院
  { pos: [-15, 4, 10], target: [0, 3, 0] },      // 02 西南花園
  { pos: [0, 4, 25], target: [0, 3, 0] },        // 03 南立面
  { pos: [0, 5, 10], target: [0, 4, 0] },        // 04 露台層
  { pos: [-4, 2, 2], target: [-4, 1.5, 0] },     // 05 客廳
  { pos: [4, 2, 2], target: [4, 1, 0] },         // 06 廚房與餐廳
  { pos: [-6.5, 3, 6], target: [-6.5, 2, 4] },   // 07 樓梯廳與挑空
  { pos: [-4, 6, 2], target: [-4, 5.5, 0] },     // 08 主臥
  { pos: [0, 8.5, 0], target: [0, 7.5, 0] },     // 09 屋頂露台
  { pos: [2, 2.5, 7], target: [2, 2, 5] },       // 10 細節·材料交接
  { pos: [0, 35, 0], target: [0, 0, 0] }         // 11 鳥瞰
];

let currentCameraIndex = -1;
let cameraTween = null;

function goToCameraPosition(index) {
  if (index === currentCameraIndex) return;
  currentCameraIndex = index;

  const targetPos = new THREE.Vector3(...cameraPositions[index].pos);
  const targetLook = new THREE.Vector3(...cameraPositions[index].target);

  cameraTween = {
    startPos: camera.position.clone(),
    startTarget: controls.target.clone(),
    endPos: targetPos,
    endTarget: targetLook,
    progress: 0
  };

  cameraButtons.forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });
}

cameraButtons.forEach(button => {
  button.addEventListener('click', () => {
    goToCameraPosition(parseInt(button.dataset.pos));
  });
});

// ============================================================
// AUTO ORBIT
// ============================================================
autoOrbitCheck.addEventListener('change', (e) => {
  controls.autoRotate = e.target.checked;
});

// ============================================================
// FLOOR PLAN TOGGLE
// ============================================================
toggleFloorPlan.addEventListener('click', () => {
  const isHidden = floorPlanContent.style.display === 'none';
  floorPlanContent.style.display = isHidden ? 'block' : 'none';
  toggleFloorPlan.textContent = isHidden ? '−' : '+';
});

// ============================================================
// INTERACTION
// ============================================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  for (const hit of intersects) {
    if (hit.object.name === 'portal') {
      enterVilla();
      break;
    }
  }
}

function enterVilla() {
  portalHint.style.opacity = '0';
  document.body.style.transition = 'opacity 0.8s ease';
  document.body.style.opacity = '0';
  setTimeout(() => {
    window.location.href = './villa.html?artist=icy';
  }, 800);
}

canvas.addEventListener('click', onMouseClick);

// ============================================================
// ANIMATION
// ============================================================
function animate() {
  requestAnimationFrame(animate);

  // Camera tween
  if (cameraTween) {
    cameraTween.progress += 0.03;
    if (cameraTween.progress >= 1) {
      camera.position.copy(cameraTween.endPos);
      controls.target.copy(cameraTween.endTarget);
      cameraTween = null;
    } else {
      const t = easeInOutCubic(cameraTween.progress);
      camera.position.lerpVectors(cameraTween.startPos, cameraTween.endPos, t);
      controls.target.lerpVectors(cameraTween.startTarget, cameraTween.endTarget, t);
    }
  }

  controls.update();

  const water = scene.getObjectByName('pool-water');
  if (water) {
    water.position.y = 1.55 + Math.sin(performance.now() * 0.001) * 0.02;
  }

  renderer.render(scene, camera);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================
// INIT
// ============================================================
function init() {
  createSky();
  createTerrain();
  createPool();
  createVilla();
  updateTimeOfDay(20);

  loading.style.opacity = '0';
  setTimeout(() => loading.remove(), 500);
  animate();
}

init();
