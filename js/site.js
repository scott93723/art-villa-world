// ---------------------------------------------------------------------------
// Site: ground, gravel beds, paths, pool, planting. All procedural.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { box, slab, boxGeo, cyl } from './lib.js';
import { D } from './house.js';

let seed = 1337;
function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

export function buildSite(M) {
  const S = new THREE.Group(); S.name = 'site';
  const veg = new THREE.Group(); veg.name = 'planting';
  const gr = D.grade;

  // ---------- terrain: gently undulating lawn, with the pool excavated ----------
  const POOL = { x0: -8.2, x1: -1.2, z0: 13.0, z1: 17.6, d: 1.35, cop: 0.42 };
  const hole = { x0: POOL.x0 - POOL.cop, x1: POOL.x1 + POOL.cop, z0: POOL.z0 - POOL.cop, z1: POOL.z1 + POOL.cop };
  const TILE = 4.6;
  const hAt = (x, z) => {
    const d = Math.max(Math.abs(x) / 15, Math.abs(z - 4) / 16);
    const fall = THREE.MathUtils.smoothstep(d, 1.0, 2.6);
    return (Math.sin(x * 0.09) * Math.cos(z * 0.07) * 1.1 + Math.sin(x * 0.031 + z * 0.05) * 1.7) * fall - fall * 0.8;
  };
  function patch(x0, x1, z0, z1, sx, sz) {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, sx, sz);
    g.rotateX(-Math.PI / 2);
    g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      p.setY(i, hAt(x, z));
      uv.setXY(i, x / TILE, z / TILE);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, M.grass);
    m.position.y = gr; m.receiveShadow = true;
    S.add(m);
  }
  M.grass.map.repeat.set(1, 1); M.grass.normalMap.repeat.set(1, 1);
  patch(-60, 60, -60, hole.z0, 60, 34);
  patch(-60, 60, hole.z1, 60, 60, 22);
  patch(-60, hole.x0, hole.z0, hole.z1, 26, 4);
  patch(hole.x1, 60, hole.z0, hole.z1, 30, 4);

  // ---------- gravel apron around the building ----------
  const gravel = new THREE.Group();
  const gy = gr + 0.02;
  gravel.add(slab(-12.2, 12.2, gr - 0.1, gy, -8.2, -5.4, M.gravel, 1));   // north
  gravel.add(slab(-12.2, -9.4, gr - 0.1, gy, -8.2, 11.6, M.gravel, 1));   // west
  gravel.add(slab(9.7, 12.4, gr - 0.1, gy, -8.2, 11.6, M.gravel, 1));     // east
  gravel.add(slab(-12.2, 12.4, gr - 0.1, gy, 11.5, 12.6, M.gravel, 1));
  gravel.children.forEach((c) => { c.receiveShadow = true; c.castShadow = false; });
  S.add(gravel);

  // ---------- entry path: stone slabs stepping through the lawn ----------
  for (let i = 0; i < 9; i++) {
    const z = -9.0 - i * 1.35;
    const s = slab(-1.1, 1.5, gr - 0.06, gr + 0.06, z - 0.55, z + 0.55, M.stonePaving, 1.2);
    s.rotation.y = (rnd() - 0.5) * 0.02;
    s.receiveShadow = true; S.add(s);
  }
  // driveway pad
  S.add(slab(-6.4, -1.2, gr - 0.08, gr + 0.04, -20.5, -14.5, M.concretePaving, 2.4));

  // ---------- pool ----------
  const px0 = POOL.x0, px1 = POOL.x1, pz0 = POOL.z0, pz1 = POOL.z1, pd = POOL.d;
  const pool = new THREE.Group();
  const cop = POOL.cop;
  // coping frame
  pool.add(slab(px0 - cop, px1 + cop, gr - 0.05, gr + 0.06, pz0 - cop, pz0, M.stonePaving, 1.4));
  pool.add(slab(px0 - cop, px1 + cop, gr - 0.05, gr + 0.06, pz1, pz1 + cop, M.stonePaving, 1.4));
  pool.add(slab(px0 - cop, px0, gr - 0.05, gr + 0.06, pz0, pz1, M.stonePaving, 1.4));
  pool.add(slab(px1, px1 + cop, gr - 0.05, gr + 0.06, pz0, pz1, M.stonePaving, 1.4));
  // shell
  pool.add(slab(px0, px1, gr - pd, gr - pd + 0.12, pz0, pz1, M.poolLiner, 1.6));
  pool.add(slab(px0, px0 + 0.1, gr - pd, gr, pz0, pz1, M.poolLiner, 1.6));
  pool.add(slab(px1 - 0.1, px1, gr - pd, gr, pz0, pz1, M.poolLiner, 1.6));
  pool.add(slab(px0, px1, gr - pd, gr, pz0, pz0 + 0.1, M.poolLiner, 1.6));
  pool.add(slab(px0, px1, gr - pd, gr, pz1 - 0.1, pz1, M.poolLiner, 1.6));
  // water surface (slightly rippling)
  const wg = new THREE.PlaneGeometry(px1 - px0 - 0.22, pz1 - pz0 - 0.22, 40, 26);
  wg.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(wg, M.water);
  water.position.set((px0 + px1) / 2, gr - 0.09, (pz0 + pz1) / 2);
  water.receiveShadow = false;
  pool.add(water);
  pool.userData.water = water;
  S.add(pool);
  S.userData.water = water;
  // pool steps
  for (let i = 0; i < 3; i++)
    pool.add(slab(px1 - 1.6, px1 - 0.1, gr - 0.3 - i * 0.35, gr - 0.16 - i * 0.35, pz0 + 0.1, pz0 + 0.4 + i * 0.34, M.poolLiner, 1));

  // ---------- low garden walls / retaining ----------
  S.add(slab(-13.4, -9.4, gr - 0.5, gr + 0.34, -8.9, -8.3, M.concreteDark, 1.4));
  S.add(slab(9.7, 13.4, gr - 0.5, gr + 0.34, -8.9, -8.3, M.concreteDark, 1.4));

  // ---------- planting ----------
  // trees
  const treeSpots = [
    [-15.8, -4.5, 1.05], [14.4, 10.5, 0.95], [-11.6, 19.5, 1.0],
    [5.6, 20.5, 0.9], [19.5, -6.0, 1.0], [-16.0, -12.0, 0.85], [12.0, 17.5, 0.8],
    [-19.0, 9.0, 0.9], [16.5, 21.0, 0.85],
  ];
  treeSpots.forEach(([x, z, s]) => veg.add(tree(M, x, gr, z, s)));

  // shrub masses in the gravel beds
  const beds = [
    [-11.9, -10.0, -7.6, -5.8], [10.2, 12.1, -7.6, -5.6], [10.2, 12.1, 1.0, 9.0],
    [-11.9, -10.0, 0.0, 9.0], [-4.0, 4.0, -7.9, -6.4], [-12.0, 8.0, 11.8, 12.4],
  ];
  beds.forEach((b) => veg.add(shrubMass(M, b, gr)));

  // planting against the west blade wall (breaks up the blank concrete)
  veg.add(shrubMass(M, [-10.5, -9.6, -4.6, 4.6], gr));
  veg.add(grassTufts(M, -10.9, -9.9, -4.8, 4.8, gr, 26));
  treeSpots.slice(0, 0);
  veg.add(tree(M, -10.3, gr, -6.4, 0.72));
  veg.add(tree(M, -3.6, gr, -9.6, 0.62));
  veg.add(tree(M, 4.2, gr, -9.9, 0.58));
  veg.add(tree(M, -10.1, gr, 6.4, 0.66));

  // ornamental grasses along the pool
  veg.add(grassTufts(M, -10.1, -8.9, 12.2, 18.4, gr, 46));
  veg.add(grassTufts(M, -0.55, 0.7, 12.2, 18.4, gr, 44));
  veg.add(grassTufts(M, -8.6, -1.0, 18.3, 19.7, gr, 48));

  // boulders
  for (let i = 0; i < 7; i++) {
    const r = 0.35 + rnd() * 0.5;
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), M.stone);
    const pos = b.geometry.attributes.position;
    for (let j = 0; j < pos.count; j++) {
      pos.setXYZ(j, pos.getX(j) * (0.8 + rnd() * 0.5), pos.getY(j) * (0.5 + rnd() * 0.3), pos.getZ(j) * (0.8 + rnd() * 0.5));
    }
    b.geometry.computeVertexNormals();
    b.position.set(-14 + rnd() * 4, gr + r * 0.25, 8 + rnd() * 12);
    b.castShadow = b.receiveShadow = true;
    veg.add(b);
  }

  S.add(veg);
  S.userData.veg = veg;
  return S;
}

/* ---------------- procedural tree: recursive branches + canopy ---------- */
function tree(M, x, y, z, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const trunkH = 2.6 * scale;
  const segs = [];
  function branch(pos, dir, len, rad, depth) {
    const end = pos.clone().add(dir.clone().multiplyScalar(len));
    segs.push({ pos, end, rad });
    if (depth <= 0) return;
    const n = depth > 2 ? 2 : 2 + (rnd() > 0.55 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const d2 = dir.clone();
      const ax = new THREE.Vector3(rnd() - 0.5, rnd() * 0.2, rnd() - 0.5).normalize();
      d2.applyAxisAngle(ax, 0.42 + rnd() * 0.42).normalize();
      branch(end, d2, len * (0.62 + rnd() * 0.18), rad * 0.62, depth - 1);
    }
  }
  branch(new THREE.Vector3(0, 0, 0), new THREE.Vector3((rnd() - 0.5) * 0.1, 1, (rnd() - 0.5) * 0.1).normalize(),
    trunkH, 0.16 * scale, 5);
  // build merged-ish geometry using cylinders (few enough)
  segs.forEach((s) => {
    const dir = s.end.clone().sub(s.pos);
    const h = dir.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(s.rad * 0.7, s.rad, h, s.rad > 0.06 ? 8 : 5), M.bark);
    m.position.copy(s.pos).add(dir.clone().multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  });
  // canopy: irregular icosahedron blobs at branch tips
  const tips = segs.filter((s) => s.rad < 0.05 * scale);
  const pool = tips.length ? tips : segs.slice(-8);
  pool.forEach((s, i) => {
    const r = (0.30 + rnd() * 0.26) * scale;
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), rnd() > 0.5 ? M.foliage : (rnd() > 0.5 ? M.foliage2 : M.foliageDark));
    const pp = b.geometry.attributes.position;
    for (let j = 0; j < pp.count; j++) {
      const f = 0.78 + rnd() * 0.42;
      pp.setXYZ(j, pp.getX(j) * f, pp.getY(j) * f * 0.8, pp.getZ(j) * f);
    }
    b.geometry.computeVertexNormals();
    b.position.copy(s.end);
    b.castShadow = true;
    g.add(b);
    if (rnd() > 0.35) {
      const b2 = b.clone();
      b2.position.add(new THREE.Vector3((rnd() - 0.5) * 0.7, (rnd() - 0.3) * 0.5, (rnd() - 0.5) * 0.7).multiplyScalar(scale));
      b2.scale.setScalar(0.7 + rnd() * 0.5);
      g.add(b2);
    }
  });
  return g;
}

/* ---------------- shrub mass: instanced low blobs ---------------------- */
function shrubMass(M, [x0, x1, z0, z1], y) {
  const g = new THREE.Group();
  const area = (x1 - x0) * (z1 - z0);
  const n = Math.max(6, Math.round(area * 1.5));
  const geo = new THREE.IcosahedronGeometry(0.34, 1);
  const pos = geo.attributes.position;
  for (let j = 0; j < pos.count; j++) {
    const f = 0.8 + rnd() * 0.4;
    pos.setXYZ(j, pos.getX(j) * f, pos.getY(j) * f * 0.62, pos.getZ(j) * f);
  }
  geo.computeVertexNormals();
  const inst = new THREE.InstancedMesh(geo, M.foliage, n);
  const inst2 = new THREE.InstancedMesh(geo, M.foliageDark, n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), t = new THREE.Vector3();
  let a = 0, b = 0;
  for (let i = 0; i < n; i++) {
    t.set(x0 + rnd() * (x1 - x0), y + 0.16 + rnd() * 0.12, z0 + rnd() * (z1 - z0));
    const sc = 0.7 + rnd() * 0.8;
    s.set(sc, sc * (0.7 + rnd() * 0.5), sc);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 3);
    m.compose(t, q, s);
    if (rnd() > 0.45) inst.setMatrixAt(a++, m); else inst2.setMatrixAt(b++, m);
  }
  inst.count = a; inst2.count = b;
  [inst, inst2].forEach((o) => { o.castShadow = true; o.receiveShadow = true; g.add(o); });
  return g;
}

/* ---------------- ornamental grasses: instanced cones ------------------ */
function grassTufts(M, x0, x1, z0, z1, y, n) {
  const g = new THREE.Group();
  const geo = new THREE.ConeGeometry(0.035, 0.95, 3, 1);
  geo.translate(0, 0.47, 0);
  const inst = new THREE.InstancedMesh(geo, M.foliage2, n * 7);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), t = new THREE.Vector3();
  let k = 0;
  for (let i = 0; i < n; i++) {
    const cx = x0 + rnd() * (x1 - x0), cz = z0 + rnd() * (z1 - z0);
    for (let j = 0; j < 7; j++) {
      t.set(cx + (rnd() - 0.5) * 0.34, y, cz + (rnd() - 0.5) * 0.34);
      const sc = 0.7 + rnd() * 0.8;
      s.set(sc, sc * (0.7 + rnd() * 0.8), sc);
      q.setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.7, rnd() * 3, (rnd() - 0.5) * 0.7));
      m.compose(t, q, s);
      inst.setMatrixAt(k++, m);
    }
  }
  inst.count = k;
  inst.castShadow = true; inst.receiveShadow = true;
  g.add(inst);
  return g;
}
