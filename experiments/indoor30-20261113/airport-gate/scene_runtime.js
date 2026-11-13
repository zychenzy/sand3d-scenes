import * as THREE from 'three';
import { OrbitControls } from '../../../workshop/vendor/controls/OrbitControls.js';
import { GLTFLoader } from '../../../workshop/vendor/loaders/GLTFLoader.js';

/**
 * Holdroom Toon adapter. Shared three.js stays in workshop/vendor.
 * Four hard steps, shadow floor lifted so the darkest band is not black.
 * Unlit is MeshBasicMaterial with the shadow map off.
 */

const STOPS = [104, 158, 210, 255];

function makeToonGradient() {
  const data = new Uint8Array(STOPS.length * 4);
  for (let i = 0; i < STOPS.length; i += 1) {
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
  const warm = new THREE.Color(0xfff4e4);
  const m = new THREE.MeshToonMaterial({
    color: bulb ? warm : colorFromMaterial(src),
    gradientMap: toonGradient,
    map: src?.map || null,
    side: src?.side ?? THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
  });
  if (bulb) {
    m.emissive = new THREE.Color(0xffe2b0);
    m.emissiveIntensity = 0.7;
  } else if (src?.emissive?.isColor && src.emissive.getHex() !== 0) {
    m.emissive = src.emissive.clone();
    m.emissiveIntensity = src.emissiveIntensity ?? 0.6;
  }
  if (src && src.depthWrite === false) m.depthWrite = false;
  return m;
}

export function toUnlitMaterial(src, bulb) {
  return new THREE.MeshBasicMaterial({
    color: bulb ? new THREE.Color(0xfff4e4) : colorFromMaterial(src),
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
    obj.castShadow = !noShadow && obj.userData.cast !== false;
    obj.receiveShadow = !noShadow && obj.userData.receive !== false;
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
    m.emissiveIntensity = opts.emissiveIntensity ?? 0.55;
  }
  return m;
}

export function addBox(g, w, h, d, mat, x, y, z, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  if (opts.name) mesh.name = opts.name;
  if (opts.userData) Object.assign(mesh.userData, opts.userData);
  if (opts.shadow === false) mesh.userData.noShadow = true;
  if (opts.cast === false) mesh.userData.cast = false;
  if (opts.receive === false) mesh.userData.receive = false;
  mesh.castShadow = opts.shadow !== false && opts.cast !== false;
  mesh.receiveShadow = opts.shadow !== false && opts.receive !== false;
  g.add(mesh);
  return mesh;
}

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 16, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  mesh.position.set(x, y, z);
  if (opts.rx) mesh.rotation.x = opts.rx;
  if (opts.ry) mesh.rotation.y = opts.ry;
  if (opts.rz) mesh.rotation.z = opts.rz;
  if (opts.name) mesh.name = opts.name;
  if (opts.userData) Object.assign(mesh.userData, opts.userData);
  if (opts.shadow === false) mesh.userData.noShadow = true;
  if (opts.cast === false) mesh.userData.cast = false;
  if (opts.receive === false) mesh.userData.receive = false;
  mesh.castShadow = opts.shadow !== false && opts.cast !== false;
  mesh.receiveShadow = opts.shadow !== false && opts.receive !== false;
  g.add(mesh);
  return mesh;
}

export function canvasTexture(draw, w = 512, h = 256) {
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

function makeContactMaterial() {
  const tex = canvasTexture((ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.08, w / 2, h / 2, w * 0.48);
    g.addColorStop(0, 'rgba(28,36,44,0.42)');
    g.addColorStop(0.55, 'rgba(28,36,44,0.16)');
    g.addColorStop(1, 'rgba(28,36,44,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, 128, 128);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    color: 0x243038,
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
  const s = (spec.targetHeight || 1) / (size0.y || 1e-6);
  scene.scale.setScalar(s);
  scene.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(scene);
  const center = box.getCenter(new THREE.Vector3());
  scene.position.x += -center.x;
  scene.position.z += -center.z;
  scene.position.y += -box.min.y;
  scene.updateWorldMatrix(true, true);
  tintMaterials(scene, spec.tints);
  return outer;
}

function attachPracticals(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if ((obj.name === 'bulb' || obj.userData.bulb) && !obj.userData.practicalAttached) {
      const light = new THREE.PointLight(0xffe6c4, 0.1, 1.5, 2);
      light.position.set(0, 0, 0);
      obj.add(light);
      obj.userData.practicalAttached = true;
    }
  });
}

function applyInstanceScale(node, scale) {
  if (scale == null) return;
  if (Array.isArray(scale)) node.scale.multiply(new THREE.Vector3(...scale));
  else node.scale.multiplyScalar(scale);
}

export async function boot({ build }) {
  window.__errors = [];
  window.addEventListener('error', (event) => {
    window.__errors.push(String(event.message || event.error || 'error'));
  });
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
  const clear = shellColors.clearColor || '#d5dee6';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(shellColors.fogColor || clear, shellColors.fogNear ?? 18, shellColors.fogFar ?? 40);

  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.05, 90);
  camera.position.set(...cam.position);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 1.1;
  controls.maxDistance = 26;
  controls.update();

  const hemi = layout.lights.hemi;
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
  const keySpec = layout.lights.key;
  const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
  key.position.set(...keySpec.position);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.6;
  key.shadow.camera.far = 36;
  key.shadow.camera.left = -12;
  key.shadow.camera.right = 12;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -12;
  key.shadow.bias = -0.00045;
  key.shadow.normalBias = 0.045;
  key.target.position.set(...keySpec.target);
  scene.add(key.target);
  scene.add(key);
  const fillSpec = layout.lights.fill;
  const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
  fill.position.set(...fillSpec.position);
  scene.add(fill);
  const winSpec = layout.lights.window;
  const windowKey = new THREE.DirectionalLight(winSpec.color, winSpec.intensity);
  windowKey.position.set(...winSpec.position);
  scene.add(windowKey);

  const contactMat = makeContactMaterial();
  const api = {
    THREE, scene, layout, toon, addBox, addCyl, canvasTexture,
    addContact: (x, y, z, rx, rz) => addContact(scene, x, y, z, rx, rz, contactMat),
  };
  const built = build(api) || {};
  const roots = [built.shell, built.props].filter(Boolean);
  for (const root of roots) {
    scene.add(root);
    applyShading(root, shadingMode);
  }

  const loader = new GLTFLoader();
  const prototypes = {};
  const kinds = Object.keys(layout.assets || {});
  setStatus(`loading ${kinds.length} models…`);
  await Promise.all(kinds.map(async (kind) => {
    const spec = layout.assets[kind];
    try {
      const gltf = await loader.loadAsync(spec.glb);
      const prepared = prepareAsset(gltf.scene, spec);
      applyShading(prepared, shadingMode);
      prototypes[kind] = prepared;
    } catch (err) {
      const message = `load ${kind}: ${err && err.message ? err.message : err}`;
      window.__errors.push(message);
      throw new Error(message);
    }
  }));

  const props = new THREE.Group();
  props.name = 'props';
  scene.add(props);
  for (const inst of layout.instances || []) {
    const proto = prototypes[inst.kind];
    if (!proto) {
      window.__errors.push(`missing prototype ${inst.kind}`);
      continue;
    }
    const node = proto.clone(true);
    applyShading(node, shadingMode);
    node.position.set(inst.position[0], inst.position[1], inst.position[2]);
    node.rotation.order = 'YXZ';
    if (inst.rotationY) node.rotation.y = inst.rotationY;
    if (inst.rotationX) node.rotation.x = inst.rotationX;
    applyInstanceScale(node, inst.scale);
    node.name = inst.id;
    node.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    props.add(node);
    attachPracticals(node);
  }
  if (layout.instances.some((item) => item.kind === 'flowerpot')) {
    const pot = layout.instances.find((item) => item.kind === 'flowerpot');
    addContact(props, pot.position[0], 0.015, pot.position[2], 0.22, 0.22, contactMat);
  }
  for (const stool of layout.instances.filter((item) => item.kind === 'bar_stool')) {
    addContact(props, stool.position[0], 0.012, stool.position[2], 0.22, 0.22, contactMat);
  }

  setStatus('ready — gate B12 · drag orbit · T toon · U unlit');

  function setMode(mode) {
    shadingMode = mode;
    renderer.shadowMap.enabled = mode === 'toon';
    for (const root of roots) applyShading(root, mode);
    applyShading(props, mode);
    const modeEl = document.getElementById('mode');
    if (modeEl) modeEl.textContent = mode.toUpperCase();
  }

  function setCamera(name) {
    const presets = layout.cameraPresets || {};
    const p = name === 'default' ? layout.camera : presets[name];
    if (!p) return;
    if (p.fov) {
      camera.fov = p.fov;
      camera.updateProjectionMatrix();
    }
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
    if (e.key === '3') setCamera('detail');
  });
  document.getElementById('btn-toon')?.addEventListener('click', () => setMode('toon'));
  document.getElementById('btn-unlit')?.addEventListener('click', () => setMode('unlit'));
  document.getElementById('btn-room')?.addEventListener('click', () => setCamera('default'));
  document.getElementById('btn-corner')?.addEventListener('click', () => setCamera('corner'));
  document.getElementById('btn-close')?.addEventListener('click', () => setCamera('detail'));

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  window.__scene = { renderer, scene, camera, controls, setMode, setCamera, layout, ready: true };
  window.__ready = true;

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
