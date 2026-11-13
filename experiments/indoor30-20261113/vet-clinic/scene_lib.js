import * as THREE from 'three';
import { OrbitControls } from '../../../cafe/vendor/controls/OrbitControls.js';
import { GLTFLoader } from '../../../cafe/vendor/loaders/GLTFLoader.js';

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
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

export const toonGradient = makeToonGradient(4);
const materialBackup = new WeakMap();

function colorFromMaterial(mat) {
  if (!mat) return new THREE.Color(0xaaaaaa);
  if (mat.color && mat.color.isColor) return mat.color.clone();
  return new THREE.Color(0xaaaaaa);
}

export function toToonMaterial(src) {
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    emissive: src && src.emissive ? src.emissive.clone() : new THREE.Color(0x000000),
    emissiveIntensity: src && src.emissiveIntensity != null ? src.emissiveIntensity : 1,
    emissiveMap: src && src.emissiveMap ? src.emissiveMap : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    polygonOffset: !!(src && src.polygonOffset),
    polygonOffsetFactor: src && src.polygonOffsetFactor ? src.polygonOffsetFactor : 0,
    polygonOffsetUnits: src && src.polygonOffsetUnits ? src.polygonOffsetUnits : 0,
    depthWrite: !src || src.depthWrite !== false,
  });
  if (src && src.name) m.name = src.name;
  return m;
}

export function toUnlitMaterial(src) {
  let color = colorFromMaterial(src);
  if (src && src.emissive && src.emissiveIntensity > 0.2) {
    const t = Math.min(0.8, src.emissiveIntensity);
    color = color.lerp(src.emissive, t);
  }
  return new THREE.MeshBasicMaterial({
    color,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    polygonOffset: !!(src && src.polygonOffset),
    polygonOffsetFactor: src && src.polygonOffsetFactor ? src.polygonOffsetFactor : 0,
    polygonOffsetUnits: src && src.polygonOffsetUnits ? src.polygonOffsetUnits : 0,
    depthWrite: !src || src.depthWrite !== false,
  });
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = !obj.userData.noCast;
    obj.receiveShadow = !obj.userData.noReceive;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
    const originals = materialBackup.get(obj);
    if (obj.userData.unshaded) {
      obj.material = Array.isArray(obj.material) ? originals : originals[0];
      obj.castShadow = false;
      return;
    }
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
    emissive: opts.emissive != null ? new THREE.Color(opts.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? (opts.emissive != null ? 1 : 0),
    emissiveMap: opts.emissiveMap || null,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    polygonOffset: !!opts.polygonOffset,
    polygonOffsetFactor: opts.polygonOffsetFactor ?? 0,
    polygonOffsetUnits: opts.polygonOffsetUnits ?? 0,
    depthWrite: opts.depthWrite !== false,
  });
}

export function addBox(g, w, h, d, mat, x, y, z, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (opts.rotY) m.rotation.y = opts.rotY;
  if (opts.rotX) m.rotation.x = opts.rotX;
  if (opts.rotZ) m.rotation.z = opts.rotZ;
  m.castShadow = opts.castShadow !== false;
  m.receiveShadow = opts.receiveShadow !== false;
  if (opts.noCast) m.userData.noCast = true;
  if (opts.noReceive) m.userData.noReceive = true;
  if (opts.unshaded) m.userData.unshaded = true;
  if (opts.name) m.name = opts.name;
  g.add(m);
  return m;
}

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 16, opts = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
  if (opts.rotX) m.rotation.x = opts.rotX;
  if (opts.rotY) m.rotation.y = opts.rotY;
  if (opts.rotZ) m.rotation.z = opts.rotZ;
  m.castShadow = opts.castShadow !== false;
  m.receiveShadow = opts.receiveShadow !== false;
  if (opts.noCast) m.userData.noCast = true;
  if (opts.unshaded) m.userData.unshaded = true;
  if (opts.name) m.name = opts.name;
  g.add(m);
  return m;
}

export function addContact(g, x, z, rx, rz, opacity = 0.22) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 20),
    new THREE.MeshBasicMaterial({
      color: 0x2a2824,
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.02, z);
  m.scale.set(rx, rz, 1);
  m.userData.unshaded = true;
  m.userData.noCast = true;
  m.castShadow = false;
  m.receiveShadow = false;
  g.add(m);
  return m;
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  window.__errors = [];
  window.addEventListener('error', (e) => window.__errors.push(String(e.message)));
  window.addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason)));

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
  renderer.toneMapping = THREE.NoToneMapping;
  const clear = (layout.shell && layout.shell.clearColor) || '#d7e0d8';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  const fogCol = (layout.shell && layout.shell.fogColor) || clear;
  scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 18, layout.shell?.fogFar ?? 40);

  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.08, 80);
  camera.position.set(...cam.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minDistance = 0.8;
  controls.maxDistance = 28;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: 0xf7f4ee, ground: 0xb7c3b4, intensity: 0.72 };
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
  const keySpec = layout.lights?.key || {};
  const key = new THREE.DirectionalLight(keySpec.color ?? 0xfff3e4, keySpec.intensity ?? 1.2);
  key.position.set(...(keySpec.position || [4.8, 7.2, 6.4]));
  key.castShadow = true;
  const sh = keySpec.shadow || {};
  key.shadow.mapSize.set(sh.mapSize || 2048, sh.mapSize || 2048);
  key.shadow.camera.near = sh.near ?? 0.4;
  key.shadow.camera.far = sh.far ?? 28;
  key.shadow.camera.left = sh.left ?? -8;
  key.shadow.camera.right = sh.right ?? 8;
  key.shadow.camera.top = sh.top ?? 8;
  key.shadow.camera.bottom = sh.bottom ?? -8;
  key.shadow.bias = sh.bias ?? -0.00028;
  key.shadow.normalBias = sh.normalBias ?? 0.04;
  if (keySpec.target) {
    key.target.position.set(...keySpec.target);
    scene.add(key.target);
  }
  scene.add(key);
  const fillSpec = layout.lights?.fill || { color: 0xd5e4f2, intensity: 0.32, position: [-6, 5, 2] };
  const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
  fill.position.set(...fillSpec.position);
  scene.add(fill);
  if (layout.lights?.points) {
    for (const p of layout.lights.points) {
      const pl = new THREE.PointLight(p.color || 0xffd8a8, p.intensity ?? 0.6, p.distance ?? 6, p.decay ?? 2);
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
      try {
        const gltf = await loader.loadAsync(spec.glb);
        const prepared = prepareAsset(gltf.scene, spec.targetHeight);
        if (opts.tuneAsset) opts.tuneAsset(kind, prepared, spec);
        applyShading(prepared, shadingMode);
        prototypes[kind] = prepared;
      } catch (err) {
        window.__errors.push(`${kind} failed: ${err && err.message ? err.message : err}`);
      }
    }),
  );

  const props = new THREE.Group();
  props.name = 'props';
  scene.add(props);
  for (const inst of layout.instances || []) {
    const proto = prototypes[inst.kind];
    if (!proto) {
      window.__errors.push(`missing prototype ${inst.kind} for ${inst.id}`);
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
  }

  const params = new URLSearchParams(location.search);
  if (params.get('hud') === '0' || params.get('shot') === '1') document.body.classList.add('shot');
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

  window.__scene = { renderer, scene, camera, controls, setMode, layout };
  let frames = 0;
  function tick() {
    controls.update();
    renderer.render(scene, camera);
    frames += 1;
    if (frames === 2) window.__ready = true;
    requestAnimationFrame(tick);
  }
  tick();
}
