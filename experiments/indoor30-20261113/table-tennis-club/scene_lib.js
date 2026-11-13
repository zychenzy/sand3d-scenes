import * as THREE from 'three';
import { OrbitControls } from '../../../gym/vendor/controls/OrbitControls.js';
import { GLTFLoader } from '../../../gym/vendor/loaders/GLTFLoader.js';

export function makeToonGradient() {
  const stops = [112, 168, 214, 255];
  const data = new Uint8Array(stops.length * 4);
  for (let i = 0; i < stops.length; i += 1) {
    const v = stops[i];
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, stops.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export const toonGradient = makeToonGradient();
const materialBackup = new WeakMap();

function colorFromMaterial(mat) {
  if (!mat) return new THREE.Color(0xaaaaaa);
  if (mat.color && mat.color.isColor) return mat.color.clone();
  return new THREE.Color(0xaaaaaa);
}

function copySurface(dst, src) {
  if (!src) return dst;
  if (src.map) dst.map = src.map;
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
  if (glow) color = color.clone().lerp(src.emissive, Math.min(1, src.emissiveIntensity));
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

export function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient,
    map: opts.map || null,
    emissive: opts.emissive ?? 0x000000,
    emissiveMap: opts.emissiveMap || null,
    emissiveIntensity: opts.emissiveIntensity ?? (opts.emissive ? 1 : 0),
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    alphaTest: opts.alphaTest ?? 0,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
    polygonOffset: !!opts.polygonOffset,
    polygonOffsetFactor: opts.polygonOffsetFactor ?? 0,
    polygonOffsetUnits: opts.polygonOffsetUnits ?? 0,
  });
}

export function addBox(g, w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

export function addSphere(g, r, mat, x, y, z, seg = 16) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg - 4)), mat);
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
  window.__sceneError = null;
  window.addEventListener('error', (e) => {
    window.__sceneError = e.message || 'unknown';
    setStatus('error: ' + window.__sceneError);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const msg = (e.reason && e.reason.message) || String(e.reason || 'load failed');
    window.__sceneError = msg;
    setStatus('error: ' + msg);
  });

  const params = new URLSearchParams(location.search);
  if (params.get('hud') === '0') {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
  }

  setStatus('loading layout…');
  const layout = await fetch('./layout.json').then((r) => r.json());

  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  const dprCap = Number(params.get('dpr') || 2);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFHardShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const clear = (layout.shell && layout.shell.clearColor) || '#d9d3c8';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  const fogCol = (layout.shell && layout.shell.fogColor) || clear;
  scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 16, layout.shell?.fogFar ?? 34);

  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.05, 80);
  camera.position.set(...cam.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 0.6;
  controls.maxDistance = 28;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: 0xf3f6fb, ground: 0xc6b59a, intensity: 0.55 };
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
  const keySpec = layout.lights?.key || {};
  const key = new THREE.DirectionalLight(keySpec.color ?? 0xfff3e2, keySpec.intensity ?? 1.45);
  key.position.set(...(keySpec.position || [-3, 14, -7]));
  if (keySpec.target) key.target.position.set(...keySpec.target);
  key.castShadow = true;
  const shadowBox = keySpec.shadow ?? 14;
  const mapSize = keySpec.mapSize ?? 4096;
  key.shadow.mapSize.set(mapSize, mapSize);
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 40;
  key.shadow.camera.left = -shadowBox;
  key.shadow.camera.right = shadowBox;
  key.shadow.camera.top = shadowBox;
  key.shadow.camera.bottom = -shadowBox;
  key.shadow.bias = keySpec.bias ?? -0.0008;
  key.shadow.normalBias = keySpec.normalBias ?? 0.045;
  scene.add(key);
  scene.add(key.target);
  const fillSpec = layout.lights?.fill || { color: 0xd5e2ee, intensity: 0.32, position: [8, 6, 7] };
  const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
  fill.position.set(...fillSpec.position);
  scene.add(fill);

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
  try {
    await Promise.all(kinds.map(async (kind) => {
      const spec = layout.assets[kind];
      const gltf = await loader.loadAsync(spec.glb);
      const prepared = prepareAsset(gltf.scene, spec.targetHeight);
      if (opts.tuneAsset) opts.tuneAsset(kind, prepared);
      applyShading(prepared, shadingMode);
      prototypes[kind] = prepared;
    }));
  } catch (err) {
    window.__sceneError = err.message || String(err);
    setStatus('error: ' + window.__sceneError);
    throw err;
  }

  const props = new THREE.Group();
  props.name = 'props';
  scene.add(props);
  const instances = opts.instances ? opts.instances(layout) : (layout.instances || []);
  for (const inst of instances) {
    const proto = prototypes[inst.kind];
    if (!proto) {
      window.__sceneError = 'missing asset ' + inst.kind;
      setStatus('error: ' + window.__sceneError);
      continue;
    }
    const node = proto.clone(true);
    applyShading(node, shadingMode);
    node.position.set(inst.x ?? inst.position?.[0] ?? 0, inst.y ?? inst.position?.[1] ?? 0, inst.z ?? inst.position?.[2] ?? 0);
    if (inst.rotationY) node.rotation.y = inst.rotationY;
    if (inst.rotationX) node.rotation.x = inst.rotationX;
    node.name = inst.id;
    props.add(node);
  }

  setStatus(opts.readyText || 'ready — drag orbit · U unlit · T toon');
  window.__sceneReady = true;

  function setMode(mode) {
    shadingMode = mode;
    applyShading(shell, mode);
    applyShading(procedural, mode);
    applyShading(props, mode);
    const modeEl = document.getElementById('mode');
    if (modeEl) modeEl.textContent = mode.toUpperCase();
  }

  if (params.get('mode') === 'unlit') setMode('unlit');
  const presets = layout.cameraPresets || {};
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

  window.__scene = { renderer, scene, camera, controls, setMode, layout };

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
