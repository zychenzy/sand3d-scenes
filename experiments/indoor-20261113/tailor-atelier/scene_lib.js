import * as THREE from 'three';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

export function makeToonGradient(steps = 4) {
  const data = new Uint8Array(steps * 4);
  for (let i = 0; i < steps; i++) {
    const v = Math.round((i / (steps - 1)) * 255);
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = false;
  return tex;
}

export const toonGradient = makeToonGradient(4);
const materialBackup = new WeakMap();

export function canvasTexture(source, { wrap = false, repeat = null, nearest = false } = {}) {
  const tex = new THREE.CanvasTexture(source);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (wrap) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  if (repeat) tex.repeat.set(repeat[0], repeat[1]);
  if (nearest) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
  }
  tex.needsUpdate = true;
  return tex;
}

function colorFromMaterial(mat) {
  if (!mat) return new THREE.Color(0xaaaaaa);
  if (mat.color && mat.color.isColor) return mat.color.clone();
  return new THREE.Color(0xaaaaaa);
}

function isEmissive(src, mesh) {
  const name = (mesh && mesh.name) || '';
  if (/bulb|light_tube/i.test(name)) return true;
  if (src && src.emissive && src.emissive.isColor && src.emissive.getHex() !== 0) return true;
  if (src && src.userData && src.userData.emissive) return true;
  return false;
}

export function toToonMaterial(src, mesh) {
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    bumpMap: src && src.bumpMap ? src.bumpMap : null,
    bumpScale: src && src.bumpScale != null ? src.bumpScale : 1,
    side: (src && src.side) || THREE.FrontSide,
  });
  if (src && src.transparent) {
    m.transparent = true;
    m.opacity = src.opacity ?? 1;
    m.depthWrite = src.depthWrite !== false;
  }
  if (src && src.alphaTest) m.alphaTest = src.alphaTest;
  if (isEmissive(src, mesh)) {
    const hex = (src && src.userData && src.userData.emissive) || '#fff1c8';
    m.emissive = new THREE.Color(src && src.emissive && src.emissive.getHex() ? src.emissive : hex);
    m.emissiveIntensity = (src && src.emissiveIntensity) || (src && src.userData && src.userData.emissiveIntensity) || 1;
    m.userData.emissive = '#' + m.emissive.getHexString();
    m.userData.emissiveIntensity = m.emissiveIntensity;
  }
  return m;
}

export function toUnlitMaterial(src, mesh) {
  const color = colorFromMaterial(src);
  if (isEmissive(src, mesh)) color.set('#fff6e4');
  return new THREE.MeshBasicMaterial({
    color,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: src ? src.depthWrite !== false : true,
  });
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = !obj.userData.noShadow;
    obj.receiveShadow = !obj.userData.noReceive;
    if (obj.userData.keepBasic) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
    const originals = materialBackup.get(obj);
    const next = originals.map((src) => (mode === 'toon' ? toToonMaterial(src, obj) : toUnlitMaterial(src, obj)));
    obj.material = Array.isArray(obj.material) ? next : next[0];
  });
}

function cloneMaterials(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const next = mats.map((m) => {
      const c = m.clone();
      c.userData = { ...(m.userData || {}) };
      return c;
    });
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
  box = new THREE.Box3().setFromObject(scene);
  box.getSize(size);
  outer.userData.measured = { x: size.x, y: size.y, z: size.z };
  return outer;
}

export function toon(color, opts = {}) {
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient,
    map: opts.map || null,
    bumpMap: opts.bumpMap || null,
    bumpScale: opts.bumpScale ?? 1,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
    alphaTest: opts.alphaTest || 0,
  });
  if (opts.emissive) {
    m.emissive = new THREE.Color(opts.emissive);
    m.emissiveIntensity = opts.emissiveIntensity ?? 1;
    m.userData.emissive = opts.emissive;
    m.userData.emissiveIntensity = opts.emissiveIntensity ?? 1;
  }
  return m;
}

export function addBox(g, w, h, d, mat, x, y, z, rot = null) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 16, rot = null) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

export function addSphere(g, r, mat, x, y, z, seg = 12) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg - 2)), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

export function addTorus(g, r, tube, mat, x, y, z, rot = null) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 14), mat);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

let contactMap = null;
function contactTexture() {
  if (contactMap) return contactMap;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grd.addColorStop(0, '#7a7a7a');
  grd.addColorStop(0.5, '#c4c4c4');
  grd.addColorStop(1, '#ffffff');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  contactMap = new THREE.CanvasTexture(c);
  contactMap.colorSpace = THREE.NoColorSpace;
  return contactMap;
}

export function addContact(parent, x, z, w, d, rotY = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({
    map: contactTexture(),
    transparent: true,
    depthWrite: false,
    blending: THREE.MultiplyBlending,
    toneMapped: false,
  }));
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = -rotY;
  m.position.set(x, 0.015, z);
  m.userData.keepBasic = true;
  m.userData.noShadow = true;
  m.receiveShadow = false;
  m.castShadow = false;
  m.renderOrder = 2;
  parent.add(m);
  return m;
}

function stripMeshes(root, names) {
  const drop = [];
  root.traverse((o) => {
    if (o.isMesh && names.includes(o.name)) drop.push(o);
  });
  drop.forEach((o) => o.removeFromParent());
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  const errors = [];
  window.__errors = errors;
  window.addEventListener('error', (e) => errors.push(String(e.message || e.error || 'error')));
  window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason || 'rejection')));

  let shadingMode = 'toon';
  setStatus('loading layout…');
  const layout = await fetch('./layout.json', { cache: 'no-store' }).then((r) => r.json());

  const canvasEl = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const clear = (layout.shell && layout.shell.clearColor) || '#d5dde6';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  const fogCol = (layout.shell && layout.shell.fogColor) || clear;
  scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 16, layout.shell?.fogFar ?? 32);

  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.08, 80);
  camera.position.set(...cam.position);

  const controls = new OrbitControls(camera, canvasEl);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 1.1;
  controls.maxDistance = 24;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: 0xe7eef8, ground: 0x8d6844, intensity: 0.45 };
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));

  const keySpec = layout.lights?.key || {};
  const key = new THREE.DirectionalLight(keySpec.color ?? 0xf4f7ff, keySpec.intensity ?? 1.4);
  key.position.set(...(keySpec.position || [-7, 8, 1.2]));
  if (keySpec.target) key.target.position.set(...keySpec.target);
  scene.add(key.target);
  key.castShadow = true;
  const shadow = layout.lights?.shadow || {};
  const frustum = shadow.frustum ?? 10;
  key.shadow.mapSize.set(shadow.mapSize ?? 2048, shadow.mapSize ?? 2048);
  key.shadow.camera.near = shadow.near ?? 0.5;
  key.shadow.camera.far = shadow.far ?? 28;
  key.shadow.camera.left = -frustum;
  key.shadow.camera.right = frustum;
  key.shadow.camera.top = frustum;
  key.shadow.camera.bottom = -frustum;
  key.shadow.bias = shadow.bias ?? -0.001;
  key.shadow.normalBias = shadow.normalBias ?? 0.04;
  key.shadow.camera.updateProjectionMatrix();
  scene.add(key);

  const fillSpec = layout.lights?.fill || { color: 0xffd8b4, intensity: 0.32, position: [5, 3, 4] };
  const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
  fill.position.set(...fillSpec.position);
  scene.add(fill);

  const shell = opts.makeShell(layout);
  scene.add(shell);
  applyShading(shell, shadingMode);

  const procedural = opts.makeProcedural ? opts.makeProcedural(layout) : new THREE.Group();
  scene.add(procedural);
  applyShading(procedural, shadingMode);

  const contacts = new THREE.Group();
  contacts.name = 'contacts';
  scene.add(contacts);

  const loader = new GLTFLoader();
  const prototypes = {};
  const kinds = Object.keys(layout.assets || {});
  setStatus(`loading ${kinds.length} GLBs…`);
  try {
    await Promise.all(kinds.map(async (kind) => {
      const spec = layout.assets[kind];
      const gltf = await loader.loadAsync(spec.glb);
      if (spec.hideMeshes) stripMeshes(gltf.scene, spec.hideMeshes);
      prototypes[kind] = prepareAsset(gltf.scene, spec.targetHeight);
    }));
  } catch (err) {
    console.error(err);
    errors.push(String(err && err.message ? err.message : err));
    setStatus(`asset failed — ${err.message || err}`);
    window.__sceneReady = true;
    return;
  }

  const props = new THREE.Group();
  props.name = 'props';
  scene.add(props);
  const measured = {};
  for (const inst of layout.instances || []) {
    const proto = prototypes[inst.kind];
    if (!proto) {
      errors.push(`missing kind ${inst.kind}`);
      continue;
    }
    measured[inst.kind] = proto.userData.measured;
    const node = proto.clone(true);
    cloneMaterials(node);
    applyShading(node, shadingMode);
    node.position.set(inst.position[0], inst.position[1], inst.position[2]);
    if (inst.rotationY) node.rotation.y = inst.rotationY;
    if (Array.isArray(inst.scale)) node.scale.multiply(new THREE.Vector3(...inst.scale));
    else if (typeof inst.scale === 'number') node.scale.multiplyScalar(inst.scale);
    node.name = inst.id;
    node.userData.kind = inst.kind;
    props.add(node);

    const spec = layout.assets[inst.kind];
    if (spec.contact && spec.footprint && inst.position[1] < 0.05) {
      addContact(contacts, inst.position[0], inst.position[2], spec.footprint[0] * 0.9, spec.footprint[1] * 0.9, inst.rotationY || 0);
    }
  }

  if (opts.onReady) opts.onReady({ scene, layout, props, shell, procedural, renderer, camera, controls, measured });

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
  if (params.get('shot') === '1' || params.get('hud') === '0') {
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

  const api = { renderer, scene, camera, controls, setMode, layout, props, measured, ready: false };
  window.__scene = api;

  let frames = 0;
  function tick() {
    controls.update();
    renderer.render(scene, camera);
    frames += 1;
    if (frames === 2) {
      api.ready = true;
      window.__sceneReady = true;
    }
    requestAnimationFrame(tick);
  }
  tick();
}
