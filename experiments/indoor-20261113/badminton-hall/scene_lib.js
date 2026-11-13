import * as THREE from 'three';
import { OrbitControls } from '../../../gym/vendor/controls/OrbitControls.js';
import { GLTFLoader } from '../../../gym/vendor/loaders/GLTFLoader.js';

export function makeToonGradient(steps = 4) {
  const data = new Uint8Array(steps * 4);
  for (let i = 0; i < steps; i++) {
    // Floor the darkest step so a hard shadow stays a dark band of the
    // surface colour. A zero step turns the mats and the timber into holes.
    const v = Math.round(58 + (i / (steps - 1)) * (255 - 58));
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export const toonGradient = makeToonGradient(4);
const materialBackup = new WeakMap();

function colorFromMaterial(mat) {
  if (!mat) return new THREE.Color(0xaaaaaa);
  if (mat.color && mat.color.isColor) return mat.color.clone();
  return new THREE.Color(0xaaaaaa);
}

function copySurface(dst, src) {
  if (!src) return dst;
  if (src.map) dst.map = src.map;
  if (src.alphaMap) dst.alphaMap = src.alphaMap;
  if (src.emissiveMap && dst.emissiveMap !== undefined) dst.emissiveMap = src.emissiveMap;
  if (src.emissive && dst.emissive) dst.emissive.copy(src.emissive);
  if (src.emissiveIntensity != null && dst.emissiveIntensity != null) dst.emissiveIntensity = src.emissiveIntensity;
  if (src.alphaTest) dst.alphaTest = src.alphaTest;
  dst.side = src.side || THREE.FrontSide;
  if (src.transparent) {
    dst.transparent = true;
    dst.opacity = src.opacity ?? 1;
  }
  if (src.depthWrite === false) dst.depthWrite = false;
  if (src.polygonOffset) {
    dst.polygonOffset = true;
    dst.polygonOffsetFactor = src.polygonOffsetFactor;
    dst.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  return dst;
}

export function toToonMaterial(src) {
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
    gradientMap: toonGradient,
  });
  return copySurface(m, src);
}

export function toUnlitMaterial(src) {
  let color = colorFromMaterial(src);
  const glow = src && src.emissive && src.emissive.isColor && src.emissive.getHex() !== 0 && src.emissiveIntensity > 0.35;
  if (glow) {
    color = color.clone().lerp(src.emissive, Math.min(1, src.emissiveIntensity));
  }
  const m = new THREE.MeshBasicMaterial({ color });
  return copySurface(m, src);
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = !obj.userData.noCast;
    obj.receiveShadow = !obj.userData.noReceive;
    if (obj.userData.keepMaterial) return;
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

export function addBox(g, w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

export function addCyl(g, rTop, rBot, h, material, x, y, z, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  let shadingMode = 'toon';
  window.__bootError = null;
  window.addEventListener('error', (e) => {
    window.__bootError = e.message || 'unknown';
    setStatus('error: ' + window.__bootError);
  });

  setStatus('loading layout…');
  const layout = await fetch('./layout.json').then((r) => {
    if (!r.ok) throw new Error('layout.json ' + r.status);
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
  const clear = (layout.shell && layout.shell.clearColor) || '#d5d8d2';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  const fogCol = (layout.shell && layout.shell.fogColor) || clear;
  scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 34, layout.shell?.fogFar ?? 68);

  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.05, 90);
  camera.position.set(...cam.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 0.45;
  controls.maxDistance = 42;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: 0xe7f0ea, ground: 0x6d5a40, intensity: 0.42 };
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
  const keySpec = layout.lights?.key || { color: 0xfff5e8, intensity: 1.8, position: [6, 16, 10] };
  const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
  key.position.set(...keySpec.position);
  if (keySpec.target) key.target.position.set(...keySpec.target);
  key.castShadow = true;
  const shadowBox = keySpec.shadow ?? 18;
  const mapSize = keySpec.mapSize || 4096;
  key.shadow.mapSize.set(mapSize, mapSize);
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 46;
  key.shadow.camera.left = -shadowBox;
  key.shadow.camera.right = shadowBox;
  key.shadow.camera.top = shadowBox;
  key.shadow.camera.bottom = -shadowBox;
  key.shadow.bias = -0.00035;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  scene.add(key.target);
  const fillSpec = layout.lights?.fill || { color: 0xd5e4ea, intensity: 0.16, position: [-12, 8, 2] };
  const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
  fill.position.set(...fillSpec.position);
  scene.add(fill);
  if (layout.lights?.rim) {
    const rim = new THREE.DirectionalLight(layout.lights.rim.color, layout.lights.rim.intensity);
    rim.position.set(...layout.lights.rim.position);
    scene.add(rim);
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
  await Promise.all(kinds.map(async (kind) => {
    const spec = layout.assets[kind];
    const gltf = await loader.loadAsync(spec.glb);
    const prepared = prepareAsset(gltf.scene, spec.targetHeight);
    if (opts.tuneAsset) opts.tuneAsset(kind, prepared, spec);
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
    node.name = inst.id;
    props.add(node);
  }

  setStatus(opts.readyText || 'ready — drag orbit · U unlit · T toon');

  function setMode(mode) {
    shadingMode = mode;
    applyShading(shell, mode);
    applyShading(procedural, mode);
    applyShading(props, mode);
    const modeEl = document.getElementById('mode');
    if (modeEl) modeEl.textContent = mode.toUpperCase();
    document.body.dataset.mode = mode;
  }

  const params = new URLSearchParams(location.search);
  if (params.get('shot') === '1') {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
  }
  if (params.get('mode') === 'unlit') setMode('unlit');
  const presets = { ...(layout.cameraPresets || {}), ...(opts.cameraPresets || {}) };
  const camKey = params.get('cam');
  if (camKey && presets[camKey]) {
    const p = presets[camKey];
    camera.position.set(...p.position);
    controls.target.set(...p.target);
    if (p.fov) {
      camera.fov = p.fov;
      camera.updateProjectionMatrix();
    }
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

  window.__bounds = (name) => {
    const obj = scene.getObjectByName(name);
    if (!obj) return null;
    const box = new THREE.Box3().setFromObject(obj);
    return { min: box.min.toArray(), max: box.max.toArray() };
  };
  window.__scene = { renderer, scene, camera, controls, setMode, layout };

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    if (!window.__ready) window.__ready = true;
    requestAnimationFrame(tick);
  }
  tick();
}
