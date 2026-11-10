import * as THREE from 'three';
import { OrbitControls } from '../../../restaurant/vendor/controls/OrbitControls.js';
import { GLTFLoader } from '../../../restaurant/vendor/loaders/GLTFLoader.js';

/**
 * Local Toon adapter for the Hinoki dining redo.
 * Lifted 4-step ramp, emissive practicals in toon + unlit, contact blobs.
 * Shared three.js stays in restaurant/vendor — this file is scene-local.
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
const BULB_NAMES = new Set(['bulb', 'light_tube', 'lantern_glow']);

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
  let color = bulb ? new THREE.Color(0xfff1d0) : colorFromMaterial(src);
  if (!bulb && src?.emissive?.isColor && (src.emissiveIntensity ?? 0) > 0.12) {
    color = color.clone().lerp(src.emissive, 0.78);
    color.multiplyScalar(1 + Math.min(src.emissiveIntensity, 1.4) * 0.25);
  }
  return new THREE.MeshBasicMaterial({
    color,
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
    obj.castShadow = obj.userData.noShadow ? false : true;
    obj.receiveShadow = obj.userData.noShadow ? false : true;
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
  if (opts.shadow === false) mesh.userData.noShadow = true;
  mesh.castShadow = opts.shadow !== false;
  mesh.receiveShadow = opts.shadow !== false;
  if (opts.userData) Object.assign(mesh.userData, opts.userData);
  if (opts.name) mesh.name = opts.name;
  if (opts.rotX) mesh.rotation.x = opts.rotX;
  if (opts.rotZ) mesh.rotation.z = opts.rotZ;
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

export function tagLampEmissive(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m || !m.color) continue;
      const hex = m.color.getHexString();
      if (hex === 'ad6100') {
        m.emissive = new THREE.Color('#ff9a3a');
        m.emissiveIntensity = 0.42;
      } else if (hex === 'fefefe' || hex === 'd9d9d9') {
        m.emissive = new THREE.Color('#fff3c4');
        m.emissiveIntensity = 1.15;
        obj.userData.bulb = true;
        obj.name = 'bulb';
      }
    }
  });
}

function attachPracticals(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.name === 'bulb' || obj.userData?.bulb) {
      const light = new THREE.PointLight(0xffb36b, 0.28, 3.2, 2);
      light.position.set(0, -0.04, 0);
      obj.add(light);
    }
  });
}

const FLOOR_CONTACT = {
  diner_booth: [0.95, 0.82],
  dining_chair: [0.22, 0.24],
  dining_table: [1.32, 0.62],
  flowerpot: [0.16, 0.16],
  book_stand: [0.28, 0.28],
};

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
  const clear = shellColors.clearColor || '#e6ddd0';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(shellColors.fogColor || clear, shellColors.fogNear ?? 15, shellColors.fogFar ?? 34);

  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.05, 80);
  camera.position.set(...cam.position);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 1.2;
  controls.maxDistance = 24;
  controls.update();

  const L = layout.lights || {};
  const hemi = L.hemi || { sky: 0xfff0dc, ground: 0x5a4030, intensity: 0.38 };
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));

  function addDir(spec, shadows) {
    if (!spec) return;
    const light = new THREE.DirectionalLight(spec.color, spec.intensity);
    light.position.set(...spec.position);
    if (shadows) {
      light.castShadow = true;
      light.shadow.mapSize.set(2048, 2048);
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = spec.far ?? 30;
      const span = spec.shadowSpan || 11;
      light.shadow.camera.left = -span;
      light.shadow.camera.right = span;
      light.shadow.camera.top = span;
      light.shadow.camera.bottom = -span;
      light.shadow.bias = spec.bias ?? -0.0004;
      light.shadow.normalBias = spec.normalBias ?? 0.032;
    }
    scene.add(light);
  }

  addDir(L.key || { color: 0xfff3e4, intensity: 0.86, position: [7.2, 9.2, 4.4] }, true);
  addDir(L.window, true);
  addDir(L.fill, false);

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
  if (L.points) {
    for (const p of L.points) {
      const pl = new THREE.PointLight(p.color || 0xffd8a8, p.intensity ?? 0.4, p.distance ?? 8, p.decay ?? 2);
      pl.position.set(...p.position);
      scene.add(pl);
    }
  }

  const loader = new GLTFLoader();
  const prototypes = {};
  const kinds = Object.keys(layout.assets || {});
  setStatus(`loading ${kinds.length} models…`);
  await Promise.all(kinds.map(async (kind) => {
    const spec = layout.assets[kind];
    const gltf = await loader.loadAsync(spec.glb);
    const prepared = prepareAsset(gltf.scene, spec);
    if (kind === 'pendant_lamp') tagLampEmissive(prepared);
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
    if (inst.scale) node.scale.multiplyScalar(inst.scale);
    node.name = inst.id;
    node.userData.kind = inst.kind;
    props.add(node);
    if (inst.kind === 'pendant_lamp') attachPracticals(node);
    const blob = FLOOR_CONTACT[inst.kind];
    if (blob) {
      const y = inst.position[1] < 0.25 ? 0.034 : inst.position[1] + 0.012;
      const s = inst.scale || 1;
      const rx = inst.rotationY || 0;
      const swapped = Math.abs(Math.abs(rx) - Math.PI / 2) < 0.2;
      const bx = (swapped ? blob[1] : blob[0]) * s;
      const bz = (swapped ? blob[0] : blob[1]) * s;
      addContact(props, inst.position[0], y, inst.position[2], bx, bz, contactMat);
    }
  }
  applyShading(props, shadingMode);

  setStatus(layout.meta?.readyText || 'ready — drag orbit · T toon · U unlit');

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

  window.__scene = { renderer, scene, camera, controls, setMode, setCamera, layout, ready: true };
  window.__cafe = window.__scene;

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
