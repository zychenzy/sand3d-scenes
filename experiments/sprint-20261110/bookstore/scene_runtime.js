/**
 * Local Toon adapter for the bookshop cutaway.
 * Vendored Three.js is referenced, not copied. Materials keep the stepped
 * gradient, and emissive / transparency / maps survive Toon ↔ Unlit swaps.
 */
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

export function toon(color, opts = {}) {
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient,
    map: opts.map || null,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
    polygonOffset: !!opts.polygonOffset,
    polygonOffsetFactor: opts.polygonOffsetFactor || 0,
    polygonOffsetUnits: opts.polygonOffsetUnits || 0,
  });
  if (opts.emissive) {
    m.emissive = new THREE.Color(opts.emissive);
    m.emissiveIntensity = opts.emissiveIntensity ?? 1;
  }
  return m;
}

export function toToonMaterial(src) {
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: !src || src.depthWrite !== false,
    polygonOffset: !!(src && src.polygonOffset),
    polygonOffsetFactor: (src && src.polygonOffsetFactor) || 0,
    polygonOffsetUnits: (src && src.polygonOffsetUnits) || 0,
  });
  if (src && src.emissive) {
    m.emissive.copy(src.emissive);
    m.emissiveIntensity = src.emissiveIntensity ?? 1;
  }
  if (src && src.alphaTest) m.alphaTest = src.alphaTest;
  return m;
}

export function toUnlitMaterial(src) {
  const color = colorFromMaterial(src);
  if (src && src.emissive && (src.emissive.r + src.emissive.g + src.emissive.b) > 0.15) {
    color.lerp(src.emissive, 0.72);
  }
  return new THREE.MeshBasicMaterial({
    color,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: !src || src.depthWrite !== false,
  });
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.userData.role === 'contact') return;
    if (obj.userData.role === 'flat') {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
      const src = materialBackup.get(obj)[0];
      obj.material = new THREE.MeshBasicMaterial({
        color: colorFromMaterial(src),
        transparent: !!(src && src.transparent),
        opacity: src && src.opacity != null ? src.opacity : 1,
        side: (src && src.side) || THREE.FrontSide,
        depthWrite: !src || src.depthWrite !== false,
      });
      obj.castShadow = false;
      obj.receiveShadow = false;
      return;
    }
    const cast = obj.userData.castShadow;
    obj.castShadow = cast !== undefined ? cast : obj.castShadow !== false;
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

export function uniquifyMaterials(root) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    if (Array.isArray(obj.material)) obj.material = obj.material.map((m) => m.clone());
    else obj.material = obj.material.clone();
  });
}

export function applyTint(root, hex) {
  const tint = new THREE.Color(hex);
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m.color) continue;
      const hsl = { h: 0, s: 0, l: 0 };
      m.color.getHSL(hsl);
      if (hsl.s < 0.16 || hsl.l > 0.84) m.color.copy(tint);
    }
  });
}

export function applyGlow(root, mode) {
  let best = null;
  let bestL = mode === 'screen' ? 2 : -1;
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m.color) continue;
      const l = m.color.r * 0.3 + m.color.g * 0.59 + m.color.b * 0.11;
      if (mode === 'screen') {
        if (l < bestL) {
          bestL = l;
          best = m;
        }
      } else if (l > bestL) {
        bestL = l;
        best = m;
      }
    }
  });
  if (!best) return;
  if (mode === 'screen') {
    best.emissive = new THREE.Color('#8fd8c4');
    best.emissiveIntensity = 0.85;
    best.color = new THREE.Color('#16382f');
  } else {
    best.emissive = new THREE.Color('#ffd7a8');
    best.emissiveIntensity = bestL > 0.85 ? 0.95 : 0.45;
  }
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

export function addContact(g, w, d, x, z, opacity = 0.2) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 22),
    new THREE.MeshBasicMaterial({
      color: 0x1a110c,
      transparent: true,
      opacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.022, z);
  m.scale.set(Math.max(w, 0.12), Math.max(d, 0.12), 1);
  m.userData.role = 'contact';
  m.castShadow = false;
  m.receiveShadow = false;
  m.renderOrder = 3;
  g.add(m);
  return m;
}

function addDirectional(scene, spec, cast) {
  const light = new THREE.DirectionalLight(spec.color, spec.intensity);
  light.position.set(...spec.position);
  if (cast) {
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 40;
    light.shadow.camera.left = -9;
    light.shadow.camera.right = 9;
    light.shadow.camera.top = 9;
    light.shadow.camera.bottom = -9;
    light.shadow.bias = -0.00045;
    light.shadow.normalBias = 0.028;
  }
  scene.add(light);
  return light;
}

function autoContact(group, node) {
  node.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(node);
  if (box.isEmpty()) return;
  if (box.min.y > 0.15 || box.max.y < 0.25) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  addContact(group, Math.min(size.x * 0.82, 2.2), Math.min(size.z * 0.82, 2.2), center.x, center.z, 0.34);
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  let shadingMode = 'toon';
  window.__bootErrors = [];
  window.addEventListener('error', (e) => window.__bootErrors.push(String(e.message)));
  window.addEventListener('unhandledrejection', (e) => window.__bootErrors.push(String(e.reason)));

  setStatus('loading layout…');
  const layout = await fetch('./layout.json').then((r) => r.json());

  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFHardShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const clear = (layout.shell && layout.shell.clearColor) || '#e4d9c8';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  const fogCol = (layout.shell && layout.shell.fogColor) || clear;
  scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 16, layout.shell?.fogFar ?? 36);

  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.06, 80);
  camera.position.set(...cam.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 1.15;
  controls.maxDistance = 26;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: 0xfff2e2, ground: 0x4a3a2c, intensity: 0.42 };
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
  const keySpec = layout.lights?.key || { color: 0xfff0dc, intensity: 0.85, position: [5, 9, 6] };
  addDirectional(scene, keySpec, true);
  if (layout.lights?.fill) addDirectional(scene, layout.lights.fill, false);
  if (layout.lights?.window) addDirectional(scene, layout.lights.window, false);
  if (opts.addLights) opts.addLights(scene, layout);

  const shell = opts.makeShell(layout);
  scene.add(shell);
  applyShading(shell, shadingMode);

  const procedural = opts.makeProcedural ? opts.makeProcedural(layout) : new THREE.Group();
  scene.add(procedural);
  applyShading(procedural, shadingMode);

  const loader = new GLTFLoader();
  const prototypes = {};
  const failed = [];
  const kinds = Object.keys(layout.assets || {});
  setStatus(`loading ${kinds.length} GLBs…`);
  await Promise.all(kinds.map(async (kind) => {
    const spec = layout.assets[kind];
    try {
      const gltf = await loader.loadAsync(spec.glb);
      const prepared = prepareAsset(gltf.scene, spec.targetHeight);
      uniquifyMaterials(prepared);
      if (spec.tint) applyTint(prepared, spec.tint);
      if (spec.glow) applyGlow(prepared, spec.glow);
      prototypes[kind] = prepared;
    } catch (err) {
      failed.push(kind);
      console.error('glb failed', kind, spec.glb, err);
    }
  }));

  const props = new THREE.Group();
  props.name = 'props';
  scene.add(props);
  const contacts = new THREE.Group();
  contacts.name = 'contacts';
  scene.add(contacts);

  for (const inst of layout.instances || []) {
    const proto = prototypes[inst.kind];
    if (!proto) continue;
    const node = proto.clone(true);
    uniquifyMaterials(node);
    if (inst.tint) applyTint(node, inst.tint);
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
    if (inst.kind !== 'pendant_lamp' && inst.position[1] < 0.2) autoContact(contacts, node);
  }

  const params = new URLSearchParams(location.search);
  if (params.get('hud') === '0') {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
  }

  function setMode(mode) {
    shadingMode = mode;
    applyShading(shell, mode);
    applyShading(procedural, mode);
    applyShading(props, mode);
    const modeEl = document.getElementById('mode');
    if (modeEl) modeEl.textContent = mode.toUpperCase();
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

  const failNote = failed.length ? ` · missing ${failed.join(', ')}` : '';
  setStatus((opts.readyText || 'ready') + failNote);

  window.__scene = {
    renderer, scene, camera, controls, setMode, layout, failed, ready: true,
  };

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
