import * as THREE from 'three';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

const statusEl = document.getElementById('status');
const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };

function makeToonGradient(steps = 4) {
  const data = new Uint8Array(steps * 4);
  for (let i = 0; i < steps; i++) {
    const v = Math.round((i / (steps - 1)) * 255);
    data[i * 4 + 0] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

const toonGradient = makeToonGradient(4);
let shadingMode = 'toon';
const materialBackup = new WeakMap();

function colorFromMaterial(mat) {
  if (!mat) return new THREE.Color(0xaaaaaa);
  if (mat.color && mat.color.isColor) return mat.color.clone();
  return new THREE.Color(0xaaaaaa);
}

function toToonMaterial(src) {
  const color = colorFromMaterial(src);
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
  });
  if (src && src.transparent) {
    m.transparent = true;
    m.opacity = src.opacity ?? 1;
  }
  return m;
}

function toUnlitMaterial(src) {
  const color = colorFromMaterial(src);
  return new THREE.MeshBasicMaterial({
    color,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
  });
}

function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) {
      materialBackup.set(obj, mats.map((m) => m));
    }
    const originals = materialBackup.get(obj);
    const next = originals.map((src) => (mode === 'toon' ? toToonMaterial(src) : toUnlitMaterial(src)));
    obj.material = Array.isArray(obj.material) ? next : next[0];
  });
}

function prepareAsset(scene, targetHeight) {
  const outer = new THREE.Group();
  outer.add(scene);
  scene.updateWorldMatrix(true, true);
  let box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  const s = targetHeight / (size.y || 1e-6);
  scene.scale.setScalar(s);
  scene.updateWorldMatrix(true, true);
  box = new THREE.Box3().setFromObject(scene);
  const center = box.getCenter(new THREE.Vector3());
  scene.position.x += -center.x;
  scene.position.z += -center.z;
  scene.position.y += -box.min.y;
  scene.updateWorldMatrix(true, true);
  return outer;
}

function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
  });
}

function addBox(g, w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function makePlantFoliage(x, y, z, scale = 1) {
  const g = new THREE.Group();
  const leaf = toon('#2f6b3c');
  const leaf2 = toon('#1e4d2b');
  addCyl(g, 0.02 * scale, 0.03 * scale, 0.18 * scale, toon('#3d5c2e'), x, y + 0.1 * scale, z);
  const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.16 * scale, 10, 8), leaf);
  s1.position.set(x, y + 0.28 * scale, z);
  s1.scale.set(1.1, 0.85, 1);
  g.add(s1);
  const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 10, 8), leaf2);
  s2.position.set(x + 0.1 * scale, y + 0.34 * scale, z - 0.05 * scale);
  g.add(s2);
  const s3 = new THREE.Mesh(new THREE.SphereGeometry(0.1 * scale, 10, 8), leaf);
  s3.position.set(x - 0.08 * scale, y + 0.32 * scale, z + 0.06 * scale);
  g.add(s3);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function makeShell(layout) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const shell = layout.shell;
  const floorMat = toon(shell.floorColor);
  const wallMat = toon(shell.wallColor);
  const accent = toon(shell.accentColor);
  const wood = toon(shell.woodColor);
  const woodL = toon(shell.woodLight);
  const glass = toon(shell.windowTint, { transparent: true, opacity: 0.5, side: THREE.DoubleSide });
  const ceilMat = toon(shell.ceilingColor);
  const frameMat = toon('#2a2a2a');
  const slate = toon(shell.slateColor);
  const cream = toon('#f7f1e4');

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), floorMat);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  g.add(floor);
  // wood plank strips
  for (let i = -4; i <= 4; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 0.005, 0.02), toon('#9a7040'));
    plank.position.set(0, 0.002, i * 0.72);
    g.add(plank);
  }

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.12), wallMat);
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  g.add(back);

  const left = new THREE.Mesh(new THREE.BoxGeometry(0.12, H, D), wallMat);
  left.position.set(-W / 2, H / 2, 0);
  left.receiveShadow = true;
  g.add(left);

  // dark green wainscot — taller, more brand
  addBox(g, W - 0.35, 1.05, 0.07, accent, 0, 0.52, -D / 2 + 0.1);
  addBox(g, 0.07, 1.05, D - 0.4, accent, -W / 2 + 0.1, 0.52, -0.15);

  // brand green wall strip + cream panel behind bar
  addBox(g, 3.6, 1.15, 0.05, accent, -0.2, 2.15, -D / 2 + 0.09);
  addBox(g, 3.4, 0.95, 0.04, cream, -0.2, 2.15, -D / 2 + 0.12);
  // faux logo disc
  const logo = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 32), accent);
  logo.rotation.x = Math.PI / 2;
  logo.position.set(-2.95, 2.2, -D / 2 + 0.14);
  g.add(logo);
  // year strip stand-ins
  for (let i = 0; i < 4; i++) {
    addBox(g, 0.55, 0.08, 0.02, accent, -1.4 + i * 0.7, 2.45, -D / 2 + 0.15);
  }

  // wood slat feature wall (left back corner)
  for (let i = 0; i < 14; i++) {
    addBox(g, 0.07, 2.4, 0.04, wood, -W / 2 + 0.2 + i * 0.1, 1.45, -D / 2 + 0.18);
  }

  // window band
  const win = new THREE.Mesh(new THREE.BoxGeometry(W * 0.58, 1.4, 0.05), glass);
  win.position.set(0.55, 1.95, -D / 2 + 0.08);
  g.add(win);
  for (const x of [-1.55, -0.5, 0.55, 1.6]) {
    addBox(g, 0.06, 1.4, 0.07, frameMat, 0.55 + x, 1.95, -D / 2 + 0.1);
  }
  // window ledge / sill
  addBox(g, W * 0.58, 0.08, 0.32, woodL, 0.55, 1.18, -D / 2 + 0.28);

  // partial ceiling
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W * 0.88, 0.08, D * 0.58), ceilMat);
  ceil.position.set(-0.15, H - 0.04, -D * 0.2);
  g.add(ceil);

  // track-light rail + spots (procedural)
  addBox(g, 4.2, 0.04, 0.05, frameMat, 0.1, H - 0.18, -2.05);
  for (const x of [-1.6, -0.5, 0.6, 1.7]) {
    addCyl(g, 0.06, 0.08, 0.1, frameMat, x, H - 0.28, -2.05, 10);
    addCyl(g, 0.05, 0.05, 0.04, toon('#f5e6c8'), x, H - 0.34, -2.05, 10);
  }

  return g;
}

function makeProceduralProps(layout) {
  const g = new THREE.Group();
  g.name = 'procedural';
  const shell = layout.shell;
  const wood = toon(shell.woodColor);
  const woodL = toon(shell.woodLight);
  const accent = toon(shell.accentColor);
  const slate = toon(shell.slateColor);
  const cream = toon('#f4efe4');
  const glassMat = toon(shell.pastryGlass, { transparent: true, opacity: 0.35, side: THREE.DoubleSide });
  const metal = toon('#6a6e72');
  const syrupColors = ['#5c2e1a', '#c45c26', '#f2d6a0', '#3b2214', '#8b4513', '#d4a017'];

  // --- menu / chalkboard behind bar ---
  addBox(g, 2.4, 1.15, 0.06, slate, -0.15, 2.15, -3.28);
  addBox(g, 2.5, 0.06, 0.08, wood, -0.15, 2.75, -3.26);
  addBox(g, 2.5, 0.06, 0.08, wood, -0.15, 1.55, -3.26);
  // light menu strips
  for (let row = 0; row < 6; row++) {
    addBox(g, 1.9, 0.045, 0.02, cream, -0.15, 2.55 - row * 0.15, -3.24);
  }
  // second vertical menu strip near register wall
  addBox(g, 0.7, 1.3, 0.05, slate, 2.15, 2.2, -3.28);
  for (let row = 0; row < 7; row++) {
    addBox(g, 0.5, 0.04, 0.02, cream, 2.15, 2.65 - row * 0.14, -3.24);
  }

  // --- pastry / bakery glass case on counter right ---
  const caseX = 2.55, caseZ = -2.35, caseY = 1.05;
  addBox(g, 1.35, 0.08, 0.7, wood, caseX, caseY + 0.04, caseZ); // base
  addBox(g, 1.3, 0.7, 0.04, glassMat, caseX, caseY + 0.42, caseZ + 0.32); // front glass
  addBox(g, 1.3, 0.7, 0.04, glassMat, caseX, caseY + 0.42, caseZ - 0.32); // back
  addBox(g, 0.04, 0.7, 0.64, glassMat, caseX - 0.65, caseY + 0.42, caseZ);
  addBox(g, 0.04, 0.7, 0.64, glassMat, caseX + 0.65, caseY + 0.42, caseZ);
  addBox(g, 1.32, 0.05, 0.68, woodL, caseX, caseY + 0.78, caseZ); // lid
  // shelves + pastry blobs
  addBox(g, 1.15, 0.03, 0.55, woodL, caseX, caseY + 0.28, caseZ);
  addBox(g, 1.15, 0.03, 0.55, woodL, caseX, caseY + 0.52, caseZ);
  const pastry = [toon('#e8b56a'), toon('#c47a3a'), toon('#f0d9a8'), toon('#8b4513')];
  for (let i = 0; i < 5; i++) {
    addCyl(g, 0.07, 0.07, 0.05, pastry[i % pastry.length], caseX - 0.4 + i * 0.2, caseY + 0.34, caseZ + 0.05, 10);
    addCyl(g, 0.06, 0.06, 0.04, pastry[(i + 1) % pastry.length], caseX - 0.4 + i * 0.2, caseY + 0.58, caseZ - 0.08, 10);
  }

  // --- cup tower (stacked takeaway cylinders) ---
  const cupMat = toon('#f5f0e6');
  const sleeve = toon('#1e3932');
  for (let i = 0; i < 7; i++) {
    addCyl(g, 0.045, 0.04, 0.09, cupMat, -1.75, 1.1 + i * 0.09, -2.2, 12);
    if (i % 2 === 0) addCyl(g, 0.048, 0.048, 0.03, sleeve, -1.75, 1.08 + i * 0.09, -2.2, 12);
  }
  for (let i = 0; i < 5; i++) {
    addCyl(g, 0.045, 0.04, 0.09, cupMat, -1.6, 1.1 + i * 0.09, -2.35, 12);
  }
  // lid stack
  for (let i = 0; i < 4; i++) {
    addCyl(g, 0.05, 0.05, 0.02, toon('#ddd5c8'), -1.45, 1.08 + i * 0.025, -2.2, 12);
  }

  // --- syrup bottle rack ---
  addBox(g, 0.85, 0.04, 0.28, wood, -0.15, 1.07, -2.55);
  syrupColors.forEach((c, i) => {
    const x = -0.45 + i * 0.12;
    addCyl(g, 0.035, 0.04, 0.22, toon(c), x, 1.2, -2.55, 10);
    addCyl(g, 0.015, 0.02, 0.06, metal, x, 1.34, -2.55, 8);
  });

  // --- napkin / condiment caddies on tables ---
  function caddy(x, z) {
    addBox(g, 0.14, 0.1, 0.1, metal, x, 0.79, z);
    addBox(g, 0.12, 0.08, 0.02, cream, x, 0.8, z + 0.02);
  }
  caddy(-2.4, 0.9);
  caddy(1.5, 1.0);
  caddy(2.7, -0.35);

  // --- communal long table near window / left ---
  addBox(g, 2.4, 0.07, 0.7, woodL, -3.1, 0.74, -1.35);
  addCyl(g, 0.05, 0.06, 0.72, metal, -4.1, 0.36, -1.5, 8);
  addCyl(g, 0.05, 0.06, 0.72, metal, -4.1, 0.36, -1.2, 8);
  addCyl(g, 0.05, 0.06, 0.72, metal, -2.1, 0.36, -1.5, 8);
  addCyl(g, 0.05, 0.06, 0.72, metal, -2.1, 0.36, -1.2, 8);
  // stools along communal
  for (const x of [-3.7, -3.1, -2.5]) {
    addCyl(g, 0.16, 0.16, 0.05, wood, x, 0.62, -0.85, 12);
    addCyl(g, 0.03, 0.04, 0.6, metal, x, 0.3, -0.85, 8);
  }
  addCyl(g, 0.045, 0.04, 0.1, cupMat, -3.2, 0.82, -1.3, 12);
  addCyl(g, 0.045, 0.04, 0.1, cupMat, -2.7, 0.82, -1.4, 12);

  // --- pickup / order stub counter extension (wood top accent) ---
  addBox(g, 3.2, 0.05, 0.55, woodL, 0.2, 1.08, -2.05);

  // --- trash / tip jar stand-ins ---
  addCyl(g, 0.12, 0.14, 0.45, metal, 3.35, 0.25, -2.0, 12);
  addCyl(g, 0.06, 0.06, 0.12, toon('#1e3932'), 1.05, 1.14, -2.15, 10);

  // plant foliage attached near known pot spots (procedural fill since pots are empty)
  g.add(makePlantFoliage(-4.0, 0.22, -2.9, 1.15));
  g.add(makePlantFoliage(2.1, 1.17, -3.25, 0.7));
  g.add(makePlantFoliage(-1.2, 1.17, -3.25, 0.65));
  g.add(makePlantFoliage(3.7, 0.22, 1.6, 1.0));

  // small rug near seating
  addBox(g, 2.2, 0.02, 1.4, accent, 1.4, 0.01, 0.7);

  return g;
}

async function main() {
  setStatus('loading layout…');
  const layout = await fetch('./layout.json').then((r) => r.json());

  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFHardShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0xd4dce2, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd4dce2, 18, 36);

  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.05, 80);
  camera.position.set(...cam.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 2;
  controls.maxDistance = 20;
  controls.update();

  scene.add(new THREE.HemisphereLight(0xfff0dd, 0x5a6a58, 0.6));
  const key = new THREE.DirectionalLight(0xfff4e8, 1.4);
  key.position.set(6.5, 11, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 32;
  key.shadow.camera.left = -10;
  key.shadow.camera.right = 10;
  key.shadow.camera.top = 10;
  key.shadow.camera.bottom = -10;
  key.shadow.bias = -0.0005;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xb8c8e0, 0.38);
  fill.position.set(-5, 6, 3);
  scene.add(fill);
  const warm = new THREE.PointLight(0xffd8a8, 0.55, 12, 2);
  warm.position.set(0.2, 2.4, -1.8);
  scene.add(warm);

  const shell = makeShell(layout);
  scene.add(shell);
  applyShading(shell, shadingMode);

  const procedural = makeProceduralProps(layout);
  scene.add(procedural);
  applyShading(procedural, shadingMode);

  const loader = new GLTFLoader();
  const prototypes = {};
  const kinds = Object.keys(layout.assets);
  setStatus(`loading ${kinds.length} GLBs…`);
  await Promise.all(
    kinds.map(async (kind) => {
      const spec = layout.assets[kind];
      const gltf = await loader.loadAsync(spec.glb);
      const prepared = prepareAsset(gltf.scene, spec.targetHeight);
      applyShading(prepared, shadingMode);
      prototypes[kind] = prepared;
    })
  );

  const props = new THREE.Group();
  props.name = 'props';
  scene.add(props);

  for (const inst of layout.instances) {
    const proto = prototypes[inst.kind];
    if (!proto) continue;
    const node = proto.clone(true);
    applyShading(node, shadingMode);
    node.position.set(inst.position[0], inst.position[1], inst.position[2]);
    if (inst.rotationY) node.rotation.y = inst.rotationY;
    if (inst.scale) node.scale.multiplyScalar(inst.scale);
    node.name = inst.id;
    props.add(node);
  }

  setStatus('ready — denser v1 · drag orbit · U unlit · T toon');

  const params = new URLSearchParams(location.search);
  if (params.get('mode') === 'unlit') setMode('unlit');
  if (params.get('cam') === 'corner') {
    camera.position.set(7.4, 2.9, -0.3);
    controls.target.set(0.3, 0.95, -1.3);
    controls.update();
  }
  if (params.get('cam') === 'bar') {
    camera.position.set(3.2, 2.0, 0.6);
    controls.target.set(0.4, 1.15, -2.2);
    controls.update();
  }

  function setMode(mode) {
    shadingMode = mode;
    applyShading(shell, mode);
    applyShading(procedural, mode);
    applyShading(props, mode);
    document.getElementById('mode').textContent = mode.toUpperCase();
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'u' || e.key === 'U') setMode('unlit');
    if (e.key === 't' || e.key === 'T') setMode('toon');
  });
  document.getElementById('btn-toon')?.addEventListener('click', () => setMode('toon'));
  document.getElementById('btn-unlit')?.addEventListener('click', () => setMode('unlit'));

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // expose for headless capture
  window.__cafe = { renderer, scene, camera, controls, setMode };

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

main().catch((err) => {
  console.error(err);
  setStatus('error: ' + err.message);
});
