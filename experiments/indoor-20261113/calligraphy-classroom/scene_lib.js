import * as THREE from 'three';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

/** Hard stepped ramp. Darker toe so shadow sides stay separated from midtones. */
export function makeToonGradient(levels = [26, 78, 138, 196, 255]) {
  const data = new Uint8Array(levels.length * 4);
  for (let i = 0; i < levels.length; i++) {
    const v = levels[i];
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, levels.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

export const toonGradient = makeToonGradient();
const materialBackup = new WeakMap();

function colorFromMaterial(mat) {
  if (mat && mat.color && mat.color.isColor) return mat.color.clone();
  return new THREE.Color(0xaaaaaa);
}

function emissiveInfo(src) {
  const data = src && src.userData;
  if (!data || !data.emissive) return null;
  return { color: data.emissive, intensity: data.emissiveIntensity ?? 0.8 };
}

export function toToonMaterial(src) {
  const color = colorFromMaterial(src);
  const em = emissiveInfo(src);
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: src && src.depthWrite === false ? false : true,
  });
  if (em) {
    m.emissive = new THREE.Color(em.color);
    m.emissiveIntensity = em.intensity;
    m.userData.emissive = em.color;
    m.userData.emissiveIntensity = em.intensity;
  }
  return m;
}

export function toUnlitMaterial(src) {
  const em = emissiveInfo(src);
  const color = em ? new THREE.Color(em.color) : colorFromMaterial(src);
  return new THREE.MeshBasicMaterial({
    color,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: src && src.depthWrite === false ? false : true,
  });
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh || obj.userData.noShade) return;
    obj.castShadow = obj.userData.castShadow !== false;
    obj.receiveShadow = obj.userData.receiveShadow !== false;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
    const originals = materialBackup.get(obj);
    const next = originals.map((src) => (mode === 'toon' ? toToonMaterial(src) : toUnlitMaterial(src)));
    obj.material = Array.isArray(obj.material) ? next : next[0];
  });
}

export function prepareAsset(scene, targetHeight) {
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

export function toon(color, opts = {}) {
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient,
    map: opts.map || null,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
  });
  if (opts.emissive) {
    m.emissive = new THREE.Color(opts.emissive);
    m.emissiveIntensity = opts.emissiveIntensity ?? 0.8;
    m.userData.emissive = opts.emissive;
    m.userData.emissiveIntensity = opts.emissiveIntensity ?? 0.8;
  }
  return m;
}

function mark(mesh, mat) {
  const soft = mat && mat.transparent && mat.opacity < 0.92;
  mesh.castShadow = !soft;
  mesh.receiveShadow = true;
  if (soft) mesh.userData.castShadow = false;
  return mesh;
}

export function addBox(g, w, h, d, mat, x, y, z) {
  const m = mark(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), mat);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 16) {
  const m = mark(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat), mat);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

export function addSphere(g, r, mat, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = mark(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat), mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  g.add(m);
  return m;
}

export function addPlane(g, w, h, mat, x, y, z) {
  const m = mark(new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat), mat);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

function asColor(c) {
  if (c == null) return new THREE.Color(0xffffff);
  return new THREE.Color(c);
}

function cloneMaterials(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (Array.isArray(obj.material)) obj.material = obj.material.map((m) => m.clone());
    else if (obj.material) obj.material = obj.material.clone();
  });
}

function recolor(root, hex) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => {
      if (m && m.color) m.color.set(hex);
    });
  });
}

const CONTACT_SKIP = new Set(['library_lamp', 'wall_shelf', 'flowerpot']);

function addContact(g, x, y, z, rx, rz) {
  const geo = new THREE.CircleGeometry(1, 24);
  const tight = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color: 0x1a120e, transparent: true, opacity: 0.26, depthWrite: false }),
  );
  tight.rotation.x = -Math.PI / 2;
  tight.position.set(x, y, z);
  tight.scale.set(Math.max(rx, 0.05), Math.max(rz, 0.05), 1);
  tight.userData.noShade = true;
  tight.castShadow = false;
  tight.receiveShadow = false;
  g.add(tight);
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => {
    if (statusEl) statusEl.textContent = t;
  };
  let shadingMode = 'toon';

  setStatus('loading layout…');
  const layout = await fetch('./layout.json').then((r) => {
    if (!r.ok) throw new Error(`layout.json ${r.status}`);
    return r.json();
  });

  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFHardShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const clear = (layout.shell && layout.shell.clearColor) || '#efe6d6';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  const fogCol = (layout.shell && layout.shell.fogColor) || clear;
  scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 18, layout.shell?.fogFar ?? 40);

  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.06, 80);
  camera.position.set(...cam.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 0.8;
  controls.maxDistance = 26;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: '#fff4e6', ground: '#6a5344', intensity: 0.4 };
  scene.add(new THREE.HemisphereLight(asColor(hemi.sky), asColor(hemi.ground), hemi.intensity));
  const keySpec = layout.lights?.key || { color: '#fff6ea', intensity: 1.4, position: [2, 9, 6] };
  const key = new THREE.DirectionalLight(asColor(keySpec.color), keySpec.intensity);
  key.position.set(...keySpec.position);
  if (keySpec.target) key.target.position.set(...keySpec.target);
  scene.add(key.target);
  key.castShadow = true;
  const sh = keySpec.shadow || {};
  const map = sh.mapSize || 2048;
  key.shadow.mapSize.set(map, map);
  key.shadow.camera.near = sh.near ?? 0.5;
  key.shadow.camera.far = sh.far ?? 32;
  key.shadow.camera.left = sh.left ?? -9;
  key.shadow.camera.right = sh.right ?? 9;
  key.shadow.camera.top = sh.top ?? 9;
  key.shadow.camera.bottom = sh.bottom ?? -9;
  key.shadow.bias = sh.bias ?? -0.00045;
  key.shadow.normalBias = sh.normalBias ?? 0.03;
  scene.add(key);
  const fillSpec = layout.lights?.fill || { color: '#c9d7e4', intensity: 0.2, position: [-6, 4, 1] };
  const fill = new THREE.DirectionalLight(asColor(fillSpec.color), fillSpec.intensity);
  fill.position.set(...fillSpec.position);
  scene.add(fill);
  if (layout.lights?.points) {
    for (const p of layout.lights.points) {
      const pl = new THREE.PointLight(asColor(p.color || '#ffd2a0'), p.intensity ?? 0.45, p.distance ?? 6, p.decay ?? 2);
      pl.position.set(...p.position);
      scene.add(pl);
    }
  }

  const shell = opts.makeShell(layout);
  scene.add(shell);
  applyShading(shell, shadingMode);

  const procedural = opts.makeProcedural ? opts.makeProcedural(layout) : new THREE.Group();
  scene.add(procedural);
  applyShading(procedural, shadingMode);

  const loader = new GLTFLoader();
  const prototypes = {};
  const kinds = Object.keys(layout.assets || {});
  setStatus(`loading ${kinds.length} GLBs…`);
  await Promise.all(
    kinds.map(async (kind) => {
      const spec = layout.assets[kind];
      const gltf = await loader.loadAsync(spec.glb);
      const prepared = prepareAsset(gltf.scene, spec.targetHeight);
      if (opts.onBeforeShade) opts.onBeforeShade(kind, prepared, spec);
      applyShading(prepared, shadingMode);
      prototypes[kind] = prepared;
    }),
  );

  const props = new THREE.Group();
  props.name = 'props';
  scene.add(props);
  const bounds = {};
  for (const inst of layout.instances || []) {
    const proto = prototypes[inst.kind];
    if (!proto) {
      setStatus(`missing kind ${inst.kind}`);
      continue;
    }
    const node = proto.clone(true);
    cloneMaterials(node);
    if (inst.tint) recolor(node, inst.tint);
    applyShading(node, shadingMode);
    node.position.set(inst.position[0], inst.position[1], inst.position[2]);
    if (inst.rotationY) node.rotation.y = inst.rotationY;
    if (Array.isArray(inst.scale)) node.scale.multiply(new THREE.Vector3(...inst.scale));
    else if (inst.scale) node.scale.multiplyScalar(inst.scale);
    node.name = inst.id;
    node.userData.kind = inst.kind;
    node.updateWorldMatrix(true, true);
    props.add(node);
    const box = new THREE.Box3().setFromObject(node);
    bounds[inst.id] = { kind: inst.kind, min: box.min.toArray(), max: box.max.toArray() };
  }

  const contacts = new THREE.Group();
  contacts.name = 'contacts';
  for (const inst of layout.instances || []) {
    if (CONTACT_SKIP.has(inst.kind) || inst.ontop) continue;
    const b = bounds[inst.id];
    if (!b) continue;
    const minY = b.min[1];
    if (minY > 0.55) continue;
    const sx = b.max[0] - b.min[0];
    const sz = b.max[2] - b.min[2];
    addContact(contacts, (b.min[0] + b.max[0]) / 2, Math.max(minY + 0.02, 0.02), (b.min[2] + b.max[2]) / 2, sx * 0.42, sz * 0.42);
  }
  scene.add(contacts);

  setStatus(opts.readyText || 'ready — drag orbit · U unlit · T toon');

  function setMode(mode) {
    shadingMode = mode;
    applyShading(shell, mode);
    applyShading(procedural, mode);
    applyShading(props, mode);
    const modeEl = document.getElementById('mode');
    if (modeEl) modeEl.textContent = mode.toUpperCase();
  }

  const params = new URLSearchParams(location.search);
  if (params.get('hud') === '0' || params.get('shot') === '1') {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
  }
  if (params.get('mode') === 'unlit') setMode('unlit');
  const presets = layout.cameraPresets || {};
  const camKey = params.get('cam');
  if (camKey && presets[camKey]) {
    const p = presets[camKey];
    camera.position.set(...p.position);
    controls.target.set(...p.target);
    controls.update();
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

  window.__scene = { renderer, scene, camera, controls, setMode, layout, bounds };
  window.__ready = true;

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
