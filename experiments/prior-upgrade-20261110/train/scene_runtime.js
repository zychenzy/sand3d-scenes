import * as THREE from 'three';
import { OrbitControls } from '../../../train/vendor/controls/OrbitControls.js';
import { GLTFLoader } from '../../../train/vendor/loaders/GLTFLoader.js';

/**
 * Local Toon adapter for the prior-upgrade dining coach.
 * Lifted 4-stop gradient, emissive practicals, contact blobs.
 * Shared three.js stays in train/vendor — this file is not the shared renderer.
 */

const STOPS = [78, 148, 206, 255];

function makeToonGradient() {
  const data = new Uint8Array(STOPS.length * 4);
  for (let i = 0; i < STOPS.length; i++) {
    data[i * 4] = STOPS[i];
    data[i * 4 + 1] = STOPS[i];
    data[i * 4 + 2] = STOPS[i];
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, STOPS.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

export const toonGradient = makeToonGradient();
const materialBackup = new WeakMap();
const BULB_NAMES = new Set(['bulb', 'light_tube', 'lamp_glow']);

function colorFromMaterial(mat) {
  if (mat?.color?.isColor) return mat.color.clone();
  return new THREE.Color(0xaaaaaa);
}

function isBulb(mesh) {
  return !!(mesh && (mesh.userData?.bulb || BULB_NAMES.has(mesh.name)));
}

export function toToonMaterial(src, bulb) {
  const warm = new THREE.Color(0xfff1d0);
  const m = new THREE.MeshToonMaterial({
    color: bulb ? warm : colorFromMaterial(src),
    gradientMap: toonGradient,
    map: src?.map || null,
    side: src?.side ?? THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
  });
  if (bulb) {
    m.emissive = new THREE.Color(0xffc98a);
    m.emissiveIntensity = 1;
  } else if (src?.emissive?.isColor && src.emissive.getHex() !== 0) {
    m.emissive = src.emissive.clone();
    m.emissiveIntensity = src.emissiveIntensity ?? 1;
  }
  if (src && src.depthWrite === false) m.depthWrite = false;
  return m;
}

export function toUnlitMaterial(src, bulb) {
  return new THREE.MeshBasicMaterial({
    color: bulb ? new THREE.Color(0xfff1d0) : colorFromMaterial(src),
    map: src?.map || null,
    side: src?.side ?? THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: src ? src.depthWrite !== false : true,
  });
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh || obj.userData.unshaded) return;
    const bulb = isBulb(obj);
    const noShadow = !!(obj.userData && obj.userData.noShadow);
    obj.castShadow = !noShadow;
    obj.receiveShadow = !noShadow;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
    const originals = materialBackup.get(obj);
    const next = originals.map((src) => (mode === 'toon' ? toToonMaterial(src, bulb) : toUnlitMaterial(src, bulb)));
    obj.material = Array.isArray(obj.material) ? next : next[0];
  });
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
    m.emissiveIntensity = opts.emissiveIntensity ?? 1;
  }
  return m;
}

export function addBox(g, w, h, d, mat, x, y, z, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  if (opts.shadow === false) mesh.userData.noShadow = true;
  mesh.castShadow = opts.shadow !== false;
  mesh.receiveShadow = opts.shadow !== false;
  if (opts.userData) Object.assign(mesh.userData, opts.userData);
  if (opts.name) mesh.name = opts.name;
  g.add(mesh);
  return mesh;
}

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 16, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  mesh.position.set(x, y, z);
  if (opts.rx) mesh.rotation.x = opts.rx;
  if (opts.ry) mesh.rotation.y = opts.ry;
  if (opts.rz) mesh.rotation.z = opts.rz;
  if (opts.shadow === false) mesh.userData.noShadow = true;
  mesh.castShadow = opts.shadow !== false;
  mesh.receiveShadow = opts.shadow !== false;
  if (opts.userData) Object.assign(mesh.userData, opts.userData);
  if (opts.name) mesh.name = opts.name;
  g.add(mesh);
  return mesh;
}

export function canvasTexture(draw, w = 512, h = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function makeContactMaterial() {
  const tex = canvasTexture((ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.08, w / 2, h / 2, w * 0.5);
    g.addColorStop(0, 'rgba(20,12,8,0.62)');
    g.addColorStop(0.45, 'rgba(20,12,8,0.28)');
    g.addColorStop(1, 'rgba(20,12,8,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, 128, 128);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    color: 0x1a100c,
    toneMapped: false,
  });
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -2;
  mat.polygonOffsetUnits = -2;
  return mat;
}

export function addContact(parent, x, y, z, rx, rz, mat) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.userData.unshaded = true;
  mesh.userData.noShadow = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = 2;
  parent.add(mesh);
  return mesh;
}

function tintMaterials(root, tints) {
  if (!tints) return;
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const hex = tints[obj.name] || tints['*'];
    if (!hex) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (m?.color) m.color = new THREE.Color(hex);
    }
    const geo = obj.geometry;
    if (geo?.getAttribute('color')) geo.deleteAttribute('color');
  });
}

export function prepareAsset(scene, spec) {
  const outer = new THREE.Group();
  outer.add(scene);
  scene.updateWorldMatrix(true, true);
  const size0 = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
  let sx;
  let sy;
  let sz;
  if (Array.isArray(spec.fit)) {
    sx = spec.fit[0] / (size0.x || 1e-6);
    sy = spec.fit[1] / (size0.y || 1e-6);
    sz = spec.fit[2] / (size0.z || 1e-6);
  } else {
    const s = (spec.targetHeight || 1) / (size0.y || 1e-6);
    sx = sy = sz = s;
  }
  scene.scale.set(sx, sy, sz);
  scene.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(scene);
  const center = box.getCenter(new THREE.Vector3());
  scene.position.x += -center.x;
  scene.position.z += -center.z;
  scene.position.y += -box.min.y;
  scene.updateWorldMatrix(true, true);
  tintMaterials(scene, spec.tints);
  outer.userData.size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
  return outer;
}

function attachPracticals(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.name === 'bulb' || obj.userData.bulb) {
      if (!obj.userData.practicalAttached) {
        const light = new THREE.PointLight(0xffb36b, 0.28, 2.8, 2);
        light.position.set(0, -0.02, 0);
        obj.add(light);
        obj.userData.practicalAttached = true;
      }
    }
  });
}

const FLOOR_CONTACT = {
  train_seat: [0.48, 0.26],
  chalkboard: [0.42, 0.16],
  flowerpot: [0.14, 0.14],
};

function applyInstanceScale(node, scale) {
  if (scale == null) return;
  if (Array.isArray(scale)) {
    if (scale.length === 3) node.scale.multiply(new THREE.Vector3(...scale));
    else node.scale.multiplyScalar(scale[0]);
  } else {
    node.scale.multiplyScalar(scale);
  }
}

export async function boot({ build }) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  let shadingMode = 'toon';

  setStatus('loading layout…');
  const layout = await fetch('./layout.json').then((r) => r.json());
  const shellColors = layout.shell || {};

  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFHardShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const clear = shellColors.clearColor || '#d8d2c8';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(shellColors.fogColor || clear, shellColors.fogNear ?? 20, shellColors.fogFar ?? 46);

  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.05, 80);
  camera.position.set(...cam.position);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 1.2;
  controls.maxDistance = 28;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: 0xfff0dd, ground: 0x5a4a3c, intensity: 0.4 };
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
  const keySpec = layout.lights?.key || { color: 0xfff3e4, intensity: 0.85, position: [7.2, 9.4, 5] };
  const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
  key.position.set(...keySpec.position);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 42;
  key.shadow.camera.left = -10;
  key.shadow.camera.right = 10;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -12;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.035;
  if (keySpec.target) {
    key.target.position.set(...keySpec.target);
    scene.add(key.target);
  }
  scene.add(key);
  const fillSpec = layout.lights?.fill || { color: 0xffe0c2, intensity: 0.18, position: [5, 4.2, 2] };
  const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
  fill.position.set(...fillSpec.position);
  scene.add(fill);
  const winSpec = layout.lights?.window || { color: 0xd7e6f6, intensity: 0.38, position: [-8, 5.5, 0.4] };
  const windowKey = new THREE.DirectionalLight(winSpec.color, winSpec.intensity);
  windowKey.position.set(...winSpec.position);
  scene.add(windowKey);

  const contactMat = makeContactMaterial();
  const api = {
    THREE,
    scene,
    layout,
    toon,
    addBox,
    addCyl,
    canvasTexture,
    addContact: (x, y, z, rx, rz) => addContact(scene, x, y, z, rx, rz, contactMat),
  };
  const built = build(api) || {};
  const roots = [built.shell, built.props].filter(Boolean);
  for (const root of roots) {
    scene.add(root);
    applyShading(root, shadingMode);
  }
  if (built.lights) {
    for (const light of built.lights) scene.add(light);
  }

  const loader = new GLTFLoader();
  const prototypes = {};
  const kinds = Object.keys(layout.assets || {});
  setStatus(`loading ${kinds.length} models…`);
  await Promise.all(kinds.map(async (kind) => {
    const spec = layout.assets[kind];
    const gltf = await loader.loadAsync(spec.glb);
    const prepared = prepareAsset(gltf.scene, spec);
    if (kind === 'pendant_lamp' || kind === 'library_lamp') {
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 10, 8),
        toon('#fff1d0', { emissive: '#ffc98a', emissiveIntensity: 1 }),
      );
      glow.position.set(0, kind === 'library_lamp' ? 0.22 : 0.04, 0);
      glow.name = 'bulb';
      glow.userData.bulb = true;
      glow.userData.noShadow = true;
      prepared.add(glow);
    }
    applyShading(prepared, shadingMode);
    prototypes[kind] = prepared;
  }));

  const props = new THREE.Group();
  props.name = 'props';
  scene.add(props);
  for (const inst of layout.instances || []) {
    const proto = prototypes[inst.kind];
    if (!proto) continue;
    const node = proto.clone(true);
    applyShading(node, shadingMode);
    node.position.set(inst.position[0], inst.position[1], inst.position[2]);
    if (inst.rotationY) node.rotation.y = inst.rotationY;
    applyInstanceScale(node, inst.scale);
    node.name = inst.id;
    props.add(node);
    attachPracticals(node);
    const blob = FLOOR_CONTACT[inst.kind];
    if (blob && inst.position[1] < 0.2) {
      const s = Array.isArray(inst.scale) ? inst.scale[0] : (inst.scale || 1);
      addContact(props, inst.position[0], 0.012, inst.position[2], blob[0] * s, blob[1] * s, contactMat);
    }
  }
  applyShading(props, shadingMode);

  setStatus('ready — dining coach · drag orbit · T toon · U unlit');

  function setMode(mode) {
    shadingMode = mode;
    for (const root of roots) applyShading(root, mode);
    applyShading(props, mode);
    const modeEl = document.getElementById('mode');
    if (modeEl) modeEl.textContent = mode.toUpperCase();
  }

  function setCamera(name) {
    const presets = layout.cameraPresets || {};
    const p = name === 'default' ? layout.camera : presets[name];
    if (!p) return;
    camera.position.set(...p.position);
    controls.target.set(...p.target);
    controls.update();
  }

  const params = new URLSearchParams(location.search);
  if (params.get('mode') === 'unlit') setMode('unlit');
  if (params.get('cam')) setCamera(params.get('cam'));
  if (params.get('hud') === '0') {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'u' || e.key === 'U') setMode('unlit');
    if (e.key === 't' || e.key === 'T') setMode('toon');
    if (e.key === '1') setCamera('default');
    if (e.key === '2') setCamera('corner');
    if (e.key === '3') setCamera('close');
  });
  document.getElementById('btn-toon')?.addEventListener('click', () => setMode('toon'));
  document.getElementById('btn-unlit')?.addEventListener('click', () => setMode('unlit'));
  document.getElementById('btn-room')?.addEventListener('click', () => setCamera('default'));
  document.getElementById('btn-corner')?.addEventListener('click', () => setCamera('corner'));
  document.getElementById('btn-close')?.addEventListener('click', () => setCamera('close'));

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  window.__scene = { renderer, scene, camera, controls, setMode, setCamera, layout };
  window.__cafe = window.__scene;

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
  window.__scene.ready = true;
  window.__ready = true;
}
