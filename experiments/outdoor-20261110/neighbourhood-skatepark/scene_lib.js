import * as THREE from 'three';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

export function makeToonGradient(steps = 4) {
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
  if (src.vertexColors) dst.vertexColors = true;
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
    side: (src && src.side) || THREE.FrontSide,
  });
  if (src && src.transparent) {
    m.transparent = true;
    m.opacity = src.opacity ?? 1;
  }
  return copySurface(m, src);
}

export function toUnlitMaterial(src) {
  return copySurface(new THREE.MeshBasicMaterial({
    color: colorFromMaterial(src),
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
  }), src);
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh || obj.userData.shadeLock) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
    const next = materialBackup.get(obj).map((src) => (mode === 'toon' ? toToonMaterial(src) : toUnlitMaterial(src)));
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
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    vertexColors: !!opts.vertexColors,
    polygonOffset: !!opts.polygonOffset,
    polygonOffsetFactor: opts.polygonOffsetFactor || 0,
    polygonOffsetUnits: opts.polygonOffsetUnits || 0,
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

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function colorOf(value) {
  if (typeof value === 'string') return new THREE.Color(value);
  return value;
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  let shadingMode = 'toon';

  setStatus('loading layout…');
  const layout = await fetch('./layout.json').then((r) => r.json());

  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFHardShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const clear = (layout.shell && layout.shell.clearColor) || '#f6d7b4';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  const fogCol = (layout.shell && layout.shell.fogColor) || clear;
  scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 28, layout.shell?.fogFar ?? 70);

  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.08, 180);
  camera.position.set(...cam.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 1.2;
  controls.maxDistance = 40;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: '#fff0dd', ground: '#6a5c48', intensity: 0.6 };
  scene.add(new THREE.HemisphereLight(colorOf(hemi.sky), colorOf(hemi.ground), hemi.intensity));
  const keySpec = layout.lights?.key || { color: '#ffb87a', intensity: 1.5, position: [-14, 11, 8], target: [0, 0.4, 0] };
  const key = new THREE.DirectionalLight(colorOf(keySpec.color), keySpec.intensity);
  key.position.set(...keySpec.position);
  key.target.position.set(...(keySpec.target || [0, 0.4, 0]));
  scene.add(key.target);
  key.castShadow = true;
  const sh = layout.lights?.shadow || {};
  const mapSize = sh.mapSize ?? 2048;
  key.shadow.mapSize.set(mapSize, mapSize);
  key.shadow.camera.near = sh.near ?? 1;
  key.shadow.camera.far = sh.far ?? 48;
  key.shadow.camera.left = sh.left ?? -20;
  key.shadow.camera.right = sh.right ?? 20;
  key.shadow.camera.top = sh.top ?? 20;
  key.shadow.camera.bottom = sh.bottom ?? -20;
  key.shadow.bias = sh.bias ?? -0.0007;
  key.shadow.normalBias = sh.normalBias ?? 0.04;
  scene.add(key);
  const fillSpec = layout.lights?.fill || { color: '#9eb6d0', intensity: 0.32, position: [8, 6, -6] };
  const fill = new THREE.DirectionalLight(colorOf(fillSpec.color), fillSpec.intensity);
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
  if (opts.onProps) opts.onProps(prototypes, props, layout);
  else {
    for (const inst of layout.instances || []) {
      const proto = prototypes[inst.kind];
      if (!proto) continue;
      const node = proto.clone(true);
      node.position.set(inst.position[0], inst.position[1], inst.position[2]);
      if (inst.rotationY) node.rotation.y = inst.rotationY;
      node.name = inst.id;
      props.add(node);
    }
  }
  applyShading(props, shadingMode);

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
  if (params.get('mode') === 'unlit') setMode('unlit');
  const presets = { ...(layout.cameraPresets || {}), ...(opts.cameraPresets || {}) };
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

  window.__scene = { renderer, scene, camera, controls, setMode, layout, ready: true };
  window.__cafe = window.__scene;

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
