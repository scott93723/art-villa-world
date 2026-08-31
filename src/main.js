import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

const canvas = document.getElementById('canvas');
const loading = document.getElementById('loading');
const portalHint = document.getElementById('portal-hint');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
scene.fog = new THREE.FogExp2(0x1a1a2e, 0.025);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 4, 14);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

RectAreaLightUniformsLib.init();

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 1.8;
controls.minDistance = 4;
controls.maxDistance = 30;

// Materials
const concreteMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.9 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.7 });
const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff, metalness: 0, roughness: 0.05, transmission: 0.92, thickness: 0.1, transparent: true
});
const grassMat = new THREE.MeshStandardMaterial({ color: 0x2d4a22, roughness: 0.95 });
const rockMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
const portalMat = new THREE.MeshStandardMaterial({
  color: 0xff6b9d, emissive: 0xff6b9d, emissiveIntensity: 2, roughness: 0.3
});

// Terrain
const terrainGeo = new THREE.PlaneGeometry(80, 80, 64, 64);
const terrainPos = terrainGeo.attributes.position;
for (let i = 0; i < terrainPos.count; i++) {
  const x = terrainPos.getX(i);
  const z = terrainPos.getY(i);
  const d = Math.sqrt(x * x + z * z);
  const h = Math.max(0, (d - 10) * 0.15) * Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2;
  terrainPos.setZ(i, h);
}
terrainGeo.computeVertexNormals();
const terrain = new THREE.Mesh(terrainGeo, grassMat);
terrain.rotation.x = -Math.PI / 2;
terrain.position.y = -0.1;
terrain.receiveShadow = true;
scene.add(terrain);

// Valley rocks
for (let i = 0; i < 30; i++) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 12 + Math.random() * 25;
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1 + Math.random() * 2, 1),
    rockMat
  );
  rock.position.set(Math.cos(angle) * dist, Math.random() * 1.5, Math.sin(angle) * dist);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
}

// Villa structure
const villa = new THREE.Group();

// Concrete base
const base = new THREE.Mesh(new THREE.BoxGeometry(12, 2, 10), concreteMat);
base.position.y = 1;
base.castShadow = true;
base.receiveShadow = true;
villa.add(base);

// Wooden upper structure
const upper = new THREE.Mesh(new THREE.BoxGeometry(10, 3, 8), woodMat);
upper.position.y = 3.5;
upper.castShadow = true;
upper.receiveShadow = true;
villa.add(upper);

// Glass front
const glassFront = new THREE.Mesh(new THREE.PlaneGeometry(9, 4), glassMat);
glassFront.position.set(0, 2.5, 4.01);
villa.add(glassFront);

// Warm interior light visible through glass
const interiorGlow = new THREE.RectAreaLight(0xffd0a0, 3, 8, 3);
interiorGlow.position.set(0, 2.5, 3.9);
interiorGlow.rotation.x = Math.PI;
villa.add(interiorGlow);

// Roof
const roof = new THREE.Mesh(new THREE.BoxGeometry(13, 0.5, 11), woodMat);
roof.position.y = 5.25;
roof.castShadow = true;
villa.add(roof);

// Entrance portal (door)
const portal = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 3),
  portalMat
);
portal.position.set(0, 2.5, 4.02);
portal.name = 'portal';
villa.add(portal);

// Portal frame
const portalFrame = new THREE.Mesh(
  new THREE.BoxGeometry(2.2, 3.2, 0.1),
  new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 })
);
portalFrame.position.set(0, 2.5, 4.0);
villa.add(portalFrame);

// Villa label
const labelCanvas = document.createElement('canvas');
labelCanvas.width = 512;
labelCanvas.height = 128;
const labelCtx = labelCanvas.getContext('2d');
labelCtx.fillStyle = '#ffffff';
labelCtx.font = '700 48px "Noto Sans TC", sans-serif';
labelCtx.textAlign = 'center';
labelCtx.fillText('ICY 別墅', 256, 80);
const labelTex = new THREE.CanvasTexture(labelCanvas);
labelTex.colorSpace = THREE.SRGBColorSpace;
const label = new THREE.Mesh(
  new THREE.PlaneGeometry(4, 1),
  new THREE.MeshStandardMaterial({ map: labelTex, transparent: true })
);
label.position.set(0, 5.8, 4.1);
villa.add(label);

villa.position.set(0, 0, 0);
scene.add(villa);

// Pathway to villa
const pathMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.8 });
const path = new THREE.Mesh(new THREE.PlaneGeometry(3, 12), pathMat);
path.rotation.x = -Math.PI / 2;
path.position.set(0, 0.05, 10);
path.receiveShadow = true;
scene.add(path);

// Path lights
for (let i = 0; i < 5; i++) {
  const light = new THREE.PointLight(0xffd0a0, 0.8, 8);
  light.position.set(1.5, 0.5, 6 + i * 2);
  scene.add(light);

  const lightMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.1),
    new THREE.MeshStandardMaterial({ emissive: 0xffd0a0, emissiveIntensity: 2 })
  );
  lightMesh.position.copy(light.position);
  scene.add(lightMesh);
}

// Ambient lighting
const ambient = new THREE.AmbientLight(0x404060, 0.5);
scene.add(ambient);

// Dusk sun
const sun = new THREE.DirectionalLight(0xffb37a, 1.5);
sun.position.set(20, 10, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 50;
sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
scene.add(sun);

// Stars
const starGeo = new THREE.BufferGeometry();
const starPos = [];
for (let i = 0; i < 500; i++) {
  starPos.push((Math.random() - 0.5) * 200, Math.random() * 80 + 20, (Math.random() - 0.5) * 200);
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 }));
scene.add(stars);

// Raycaster for portal click
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  for (const hit of intersects) {
    if (hit.object.name === 'portal' || hit.object === portalFrame) {
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

// Animation
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

loading.style.opacity = '0';
setTimeout(() => loading.remove(), 500);
animate();
