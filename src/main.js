import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

const canvas = document.getElementById('canvas');
const loading = document.getElementById('loading');
const portalHint = document.getElementById('portal-hint');

const scene = new THREE.Scene();
// Golden hour sky gradient - bright and warm
scene.background = new THREE.Color(0xff8a3a);
scene.fog = new THREE.FogExp2(0xff9a4a, 0.008);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 4, 20);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.8;

RectAreaLightUniformsLib.init();

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 3, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 1.75;
controls.minDistance = 6;
controls.maxDistance = 40;

// ============================================================
// MATERIALS - brighter, warmer colors
// ============================================================
const concreteMat = new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.8 });
const darkConcreteMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.85 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x9a6a4a, roughness: 0.7 });
const woodSlatMat = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.75 });
const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0xfffff0, metalness: 0, roughness: 0.02, transmission: 0.95, thickness: 0.1, transparent: true
});
const grassMat = new THREE.MeshStandardMaterial({ color: 0x4a6a3a, roughness: 0.9 });
const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.85 });
const poolWaterMat = new THREE.MeshPhysicalMaterial({
  color: 0x2a7aaa, metalness: 0.1, roughness: 0.05, transmission: 0.7, thickness: 0.5, transparent: true
});
const portalMat = new THREE.MeshStandardMaterial({
  color: 0xff6b9d, emissive: 0xff6b9d, emissiveIntensity: 2, roughness: 0.3
});
const furnitureWhite = new THREE.MeshStandardMaterial({ color: 0xfff8f0, roughness: 0.8 });
const furnitureWood = new THREE.MeshStandardMaterial({ color: 0xa08060, roughness: 0.7 });
const plantGreen = new THREE.MeshStandardMaterial({ color: 0x3a7a3a, roughness: 0.8 });
const warmLight = new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0xffe0b0, emissiveIntensity: 1.5 });

// ============================================================
// SKY GRADIENT
// ============================================================
function createSky() {
  const skyGeo = new THREE.SphereGeometry(200, 32, 32);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0xff6a2a) },
      bottomColor: { value: new THREE.Color(0xffb36a) },
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
  scene.add(sky);
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
  scene.add(terrain);

  // Valley rocks
  for (let i = 0; i < 35; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 40;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1 + Math.random() * 2.5, 1),
      rockMat
    );
    rock.position.set(Math.cos(angle) * dist, Math.random() * 1.5, Math.sin(angle) * dist);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  }

  // Trees
  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4a32, roughness: 0.9 });
  const treeLeafMat = new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 0.85 });
  for (let i = 0; i < 20; i++) {
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
    scene.add(tree);
  }

  // Tall grass
  const grassBladeMat = new THREE.MeshStandardMaterial({ color: 0x5a8a3a, roughness: 0.9 });
  for (let i = 0; i < 50; i++) {
    const patch = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 1.2 + Math.random() * 1.5, 4),
      grassBladeMat
    );
    patch.position.set((Math.random() - 0.5) * 45, 0.6, (Math.random() - 0.5) * 45);
    patch.castShadow = true;
    scene.add(patch);
  }
}

// ============================================================
// SWIMMING POOL
// ============================================================
function createPool() {
  const pool = new THREE.Group();

  // Pool basin
  const basin = new THREE.Mesh(
    new THREE.BoxGeometry(11, 1.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 })
  );
  basin.position.y = 0.8;
  basin.castShadow = true;
  basin.receiveShadow = true;
  pool.add(basin);

  // Water surface - brighter and more reflective
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(10.6, 5.6),
    poolWaterMat
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 1.55;
  water.name = 'pool-water';
  pool.add(water);

  // Pool glow
  const poolGlow = new THREE.PointLight(0x66bbdd, 2, 10);
  poolGlow.position.y = 1.3;
  pool.add(poolGlow);

  // Underwater lights
  for (let i = 0; i < 4; i++) {
    const light = new THREE.PointLight(0x88ccff, 1, 5);
    light.position.set(-4 + i * 2.5, 1.1, 0);
    pool.add(light);
  }

  // Pool deck
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(13, 0.15, 8),
    new THREE.MeshStandardMaterial({ color: 0xb0a090, roughness: 0.8 })
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

  // Side table
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16), furnitureWood);
  table.position.set(0, 0.35, 3.5);
  table.castShadow = true;
  pool.add(table);

  // Potted plants by pool
  for (let i = 0; i < 3; i++) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x8a6a5a }));
    pot.position.set(-5 + i * 5, 0.2, 4.5);
    pool.add(pot);

    const plant = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8 + Math.random() * 0.5, 4), plantGreen);
    plant.position.set(-5 + i * 5, 0.8, 4.5);
    pool.add(plant);
  }

  pool.position.set(0, 0, 14);
  scene.add(pool);
  return water;
}

// ============================================================
// VILLA STRUCTURE
// ============================================================
function createVilla() {
  const villa = new THREE.Group();

  // Concrete base (ground floor)
  const base = new THREE.Mesh(new THREE.BoxGeometry(16, 4, 10), concreteMat);
  base.position.y = 2;
  base.castShadow = true;
  base.receiveShadow = true;
  villa.add(base);

  // Ground floor glass
  const groundGlass = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.2), glassMat);
  groundGlass.position.set(0, 2.4, 5.01);
  villa.add(groundGlass);

  // Ground floor interior
  createGroundFloorInterior(villa);

  // Wooden upper structure
  const upper = new THREE.Mesh(new THREE.BoxGeometry(15, 3.5, 9), woodMat);
  upper.position.y = 5.75;
  upper.castShadow = true;
  upper.receiveShadow = true;
  villa.add(upper);

  // Vertical wood slats
  for (let i = 0; i < 28; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.5, 0.15), woodSlatMat);
    slat.position.set(-7.3 + i * 0.55, 5.75, 4.6);
    villa.add(slat);
  }

  // Upper glass sections
  const upperGlassLeft = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.8), glassMat);
  upperGlassLeft.position.set(-4, 5.75, 4.61);
  villa.add(upperGlassLeft);

  const upperGlassRight = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.8), glassMat);
  upperGlassRight.position.set(3.5, 5.75, 4.61);
  villa.add(upperGlassRight);

  // Upper floor interior
  createUpperFloorInterior(villa);

  // Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(17, 0.4, 11), darkConcreteMat);
  roof.position.y = 7.7;
  roof.castShadow = true;
  villa.add(roof);

  // Roof slats
  for (let i = 0; i < 32; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 11.2), woodSlatMat);
    slat.position.set(-7.8 + i * 0.5, 7.75, 0);
    villa.add(slat);
  }

  // Canopy
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 4), woodMat);
  canopy.position.set(-3, 4.2, 6);
  canopy.castShadow = true;
  villa.add(canopy);

  // Canopy supports
  const support1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 8), darkConcreteMat);
  support1.position.set(-5.5, 2.1, 6);
  villa.add(support1);

  const support2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 8), darkConcreteMat);
  support2.position.set(-0.5, 2.1, 6);
  villa.add(support2);

  // External staircase
  createStaircase(villa);

  // Entrance portal
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.8), portalMat);
  portal.position.set(2, 2.4, 5.02);
  portal.name = 'portal';
  villa.add(portal);

  // Portal frame
  const portalFrame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.0, 0.1), darkConcreteMat);
  portalFrame.position.set(2, 2.4, 5.0);
  villa.add(portalFrame);

  // Entrance step
  const step = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 1.5), concreteMat);
  step.position.set(2, 0.1, 5.5);
  step.receiveShadow = true;
  villa.add(step);

  // Pathway
  const path = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 14), new THREE.MeshStandardMaterial({ color: 0xa0a0a0, roughness: 0.8 }));
  path.rotation.x = -Math.PI / 2;
  path.position.set(2, 0.02, 12);
  path.receiveShadow = true;
  villa.add(path);

  // Path lights
  for (let i = 0; i < 6; i++) {
    const light = new THREE.PointLight(0xffe0b0, 0.8, 6);
    light.position.set(3.5, 0.4, 6 + i * 2);
    villa.add(light);

    const lightMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08), warmLight);
    lightMesh.position.copy(light.position);
    villa.add(lightMesh);
  }

  // Villa label
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 128;
  const ctx = labelCanvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 44px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ICY 別墅', 256, 80);
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 1.2),
    new THREE.MeshStandardMaterial({ map: labelTex, transparent: true })
  );
  label.position.set(0, 8.2, 5.1);
  villa.add(label);

  scene.add(villa);
  return villa;
}

// ============================================================
// INTERIOR
// ============================================================
function createGroundFloorInterior(villa) {
  const interior = new THREE.Group();

  // Bright warm ceiling lights
  for (let i = 0; i < 6; i++) {
    const light = new THREE.PointLight(0xffe0b0, 1.2, 10);
    light.position.set(-5 + i * 2.5, 3.8, 3);
    interior.add(light);
  }

  // Living room sofa
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

  // Coffee table
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.6), furnitureWood);
  table.position.set(-3.5, 0.35, 1);
  interior.add(table);

  // Dining table
  const diningTable = new THREE.Mesh(new THREE.BoxGeometry(2, 0.08, 1), furnitureWood);
  diningTable.position.set(3, 0.75, 2.5);
  interior.add(diningTable);

  for (let i = 0; i < 4; i++) {
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), furnitureWhite);
    chair.position.set(2 + (i % 2) * 1.5, 0.25, 1.8 + Math.floor(i / 2) * 1.2);
    interior.add(chair);
  }

  // Kitchen counter
  const counter = new THREE.Mesh(new THREE.BoxGeometry(4, 0.9, 0.6), darkConcreteMat);
  counter.position.set(5, 0.45, 4);
  interior.add(counter);

  // Plants
  for (let i = 0; i < 4; i++) {
    const plant = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1 + Math.random() * 0.8, 4), plantGreen);
    plant.position.set(-6 + i * 4, 0.5, 3.5);
    interior.add(plant);
  }

  // Wall art
  for (let i = 0; i < 3; i++) {
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x6a8aaa, roughness: 0.6 })
    );
    art.position.set(-5 + i * 5, 2, 4.95);
    interior.add(art);
  }

  interior.position.y = 0;
  villa.add(interior);
}

function createUpperFloorInterior(villa) {
  const interior = new THREE.Group();

  // Bright warm lights
  for (let i = 0; i < 4; i++) {
    const light = new THREE.PointLight(0xffe0b0, 1, 8);
    light.position.set(-4 + i * 3, 7.2, 3);
    interior.add(light);
  }

  // Bed
  const bed = new THREE.Group();
  const bedBase = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 2.5), furnitureWhite);
  bedBase.position.y = 0.15;
  bed.add(bedBase);
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 0.6), furnitureWhite);
  pillow.position.set(0, 0.4, -0.8);
  bed.add(pillow);
  bed.position.set(-4, 0, 2.5);
  interior.add(bed);

  // Desk
  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 0.6), furnitureWood);
  desk.position.set(3, 0.375, 2.5);
  interior.add(desk);

  // Chair
  const chair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.5), furnitureWhite);
  chair.position.set(3, 0.45, 1.5);
  interior.add(chair);

  // Bookshelf
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.3), furnitureWood);
  shelf.position.set(5.5, 1.25, 3.5);
  interior.add(shelf);

  // Plants
  for (let i = 0; i < 2; i++) {
    const plant = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8 + Math.random() * 0.5, 4), plantGreen);
    plant.position.set(-6 + i * 10, 0.4, 3.5);
    interior.add(plant);
  }

  interior.position.y = 4;
  villa.add(interior);
}

function createStaircase(villa) {
  const stairs = new THREE.Group();
  const stepMat = new THREE.MeshStandardMaterial({ color: 0xb0a090, roughness: 0.8 });

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
// LIGHTING - bright golden hour
// ============================================================
function setupLighting() {
  // Bright ambient
  const ambient = new THREE.AmbientLight(0xffd0a0, 0.8);
  scene.add(ambient);

  // Strong golden hour sun
  const sun = new THREE.DirectionalLight(0xffa54a, 2.5);
  sun.position.set(30, 20, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 100;
  sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
  scene.add(sun);

  // Warm fill
  const fill = new THREE.DirectionalLight(0xffb37a, 0.8);
  fill.position.set(-20, 15, -20);
  scene.add(fill);

  // Sky glow
  const skyGlow = new THREE.HemisphereLight(0xffa54a, 0x4a3a2a, 0.6);
  scene.add(skyGlow);

  // Stars (subtle, only visible at edges)
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 500; i++) {
    starPos.push((Math.random() - 0.5) * 300, Math.random() * 100 + 40, (Math.random() - 0.5) * 300);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffee, size: 0.1 }));
  scene.add(stars);
}

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
  controls.update();

  const water = scene.getObjectByName('pool-water');
  if (water) {
    water.position.y = 1.55 + Math.sin(performance.now() * 0.001) * 0.02;
  }

  renderer.render(scene, camera);
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
  setupLighting();

  loading.style.opacity = '0';
  setTimeout(() => loading.remove(), 500);
  animate();
}

init();
