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
  if (src.emissive && src.emissive.isColor && dst.emissive) {
    dst.emissive.copy(src.emissive);
    dst.emissiveIntensity = src.emissiveIntensity ?? 1;
  }
  if (src.emissiveMap && dst.emissiveMap !== undefined) dst.emissiveMap = src.emissiveMap;
  if (src.userData) dst.userData = { ...src.userData };
  return dst;
}

export function toToonMaterial(src) {
  if (src && src.userData && src.userData.keepBasic) return toUnlitMaterial(src);
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
    m.depthWrite = src.depthWrite !== false;
  }
  if (src && src.depthWrite === false) m.depthWrite = false;
  if (src && src.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = src.polygonOffsetFactor;
    m.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  return copySurface(m, src);
}

export function toUnlitMaterial(src) {
  const color = colorFromMaterial(src);
  const m = new THREE.MeshBasicMaterial({
    color,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: !src || src.depthWrite !== false,
  });
  if (src && src.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = src.polygonOffsetFactor;
    m.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  if (src && src.userData) m.userData = { ...src.userData };
  return m;
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const shadow = obj.userData.shadow || 'both';
    obj.castShadow = shadow === 'both' || shadow === 'cast';
    obj.receiveShadow = shadow === 'both' || shadow === 'receive';
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
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
  });
}

export function addBox(g, w, h, d, mat, x, y, z, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (opts.shadow) m.userData.shadow = opts.shadow;
  if (opts.pick) m.userData.pick = opts.pick;
  if (opts.name) m.name = opts.name;
  g.add(m);
  return m;
}

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 16, opts = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
  if (opts.shadow) m.userData.shadow = opts.shadow;
  if (opts.pick) m.userData.pick = opts.pick;
  if (opts.rotX) m.rotation.x = opts.rotX;
  if (opts.rotZ) m.rotation.z = opts.rotZ;
  g.add(m);
  return m;
}

const BOOK_COLORS = ['#6b3a2a', '#2f4a3c', '#3a3a6a', '#7a5a28', '#5a2a3a', '#2a4a6a', '#4a3a28', '#8a4a2a', '#35503a', '#245058'];

export function fillBooks(g, x, z, rotY = 0, opts = {}) {
  const grp = new THREE.Group();
  const shelves = opts.shelves ?? 4;
  const per = opts.perShelf ?? 8;
  const caseW = opts.width ?? 0.72;
  for (let s = 0; s < shelves; s++) {
    const y0 = 0.28 + s * 0.46;
    const count = per - (s % 2);
    for (let i = 0; i < count; i++) {
      const bw = 0.04 + ((i + s) % 3) * 0.012;
      const bh = 0.18 + ((i * 2 + s) % 5) * 0.028;
      const span = caseW - 0.12;
      const bx = -caseW / 2 + 0.08 + (i + (s % 2) * 0.15) * (span / Math.max(count, 1));
      const lean = ((i + s) % 5 === 0) ? 0.08 : 0;
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(bw, bh, 0.16),
        toon(BOOK_COLORS[(i + s * 3) % BOOK_COLORS.length]),
      );
      m.position.set(bx, y0 + bh / 2, 0.02);
      m.rotation.z = lean;
      m.castShadow = true;
      m.receiveShadow = true;
      grp.add(m);
    }
  }
  grp.position.set(x, 0, z);
  grp.rotation.y = rotY;
  g.add(grp);
  return grp;
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
  const clear = (layout.shell && layout.shell.clearColor) || '#d5dde3';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  const fogCol = (layout.shell && layout.shell.fogColor) || clear;
  scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 18, layout.shell?.fogFar ?? 40);

  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.05, 80);
  camera.position.set(...cam.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 0.9;
  controls.maxDistance = 28;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: 0xe7f0f6, ground: 0x8a7560, intensity: 0.72 };
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
  const keySpec = layout.lights?.key || { color: 0xfff3e2, intensity: 1.05, position: [8, 14, 7] };
  const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
  key.position.set(...keySpec.position);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 48;
  key.shadow.camera.left = -16;
  key.shadow.camera.right = 16;
  key.shadow.camera.top = 16;
  key.shadow.camera.bottom = -16;
  key.shadow.bias = -0.00035;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  const fillSpec = layout.lights?.fill || { color: 0xb7c7d8, intensity: 0.38, position: [-7, 6, 2] };
  const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
  fill.position.set(...fillSpec.position);
  scene.add(fill);
  if (layout.lights?.points) {
    for (const p of layout.lights.points) {
      const pl = new THREE.PointLight(p.color || 0xffd8a8, p.intensity ?? 0.5, p.distance ?? 12, p.decay ?? 2);
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
  setStatus(`loading ${kinds.length} models…`);
  await Promise.all(
    kinds.map(async (kind) => {
      const spec = layout.assets[kind];
      const gltf = await loader.loadAsync(spec.glb);
      const prepared = prepareAsset(gltf.scene, spec.targetHeight);
      applyShading(prepared, shadingMode);
      prototypes[kind] = prepared;
    }),
  );

  const props = new THREE.Group();
  props.name = 'props';
  scene.add(props);
  for (const inst of layout.instances || []) {
    const proto = prototypes[inst.kind];
    if (!proto) {
      console.error('missing prototype', inst.kind);
      continue;
    }
    const node = proto.clone(true);
    applyShading(node, shadingMode);
    node.position.set(inst.position[0], inst.position[1], inst.position[2]);
    if (inst.rotationY) node.rotation.y = inst.rotationY;
    if (Array.isArray(inst.scale)) {
      if (inst.scale.length === 3) node.scale.multiply(new THREE.Vector3(...inst.scale));
      else node.scale.multiplyScalar(inst.scale[0]);
    } else if (inst.scale) node.scale.multiplyScalar(inst.scale);
    node.name = inst.id;
    node.userData.kind = inst.kind;
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
    opts.onMode?.(mode);
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
    controls.update();
  }

  const api = { renderer, scene, camera, controls, setMode, layout, props, procedural, shell, setStatus };
  window.__scene = api;
  window.__cafe = api;
  opts.onReady?.(api);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'u' || e.key === 'U') setMode('unlit');
    if (e.key === 't' || e.key === 'T') setMode('toon');
    opts.onKey?.(e);
  });
  document.getElementById('btn-toon')?.addEventListener('click', () => setMode('toon'));
  document.getElementById('btn-unlit')?.addEventListener('click', () => setMode('unlit'));

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || !opts.onPick) return;
    const dx = e.clientX - down[0];
    const dy = e.clientY - down[1];
    down = null;
    if (dx * dx + dy * dy > 25) return;
    const rect = canvas.getBoundingClientRect();
    ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    opts.onPick(hits, api);
  });

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    opts.onFrame?.(dt, now / 1000, api);
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  window.__ready = true;
  tick(performance.now());
}
