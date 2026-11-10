import * as THREE from 'three';
import { OrbitControls } from '../../../ktv/vendor/controls/OrbitControls.js';
import { GLTFLoader } from '../../../ktv/vendor/loaders/GLTFLoader.js';

// Local adapter for this experiment only. Shared ktv three.js is referenced, not copied.
// Adds emissive preservation (lamps, screen, LED), flat contact discs, and GLB recolor.

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

export function toToonMaterial(src) {
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    emissive: src && src.emissive ? src.emissive.clone() : new THREE.Color(0x000000),
    emissiveIntensity: src && src.emissiveIntensity != null ? src.emissiveIntensity : 1,
    emissiveMap: src && src.emissiveMap ? src.emissiveMap : null,
    side: (src && src.side) || THREE.FrontSide,
    fog: !src || src.fog !== false,
  });
  if (src && src.transparent) {
    m.transparent = true;
    m.opacity = src.opacity ?? 1;
    m.depthWrite = src.depthWrite !== false;
  }
  return m;
}

export function toUnlitMaterial(src) {
  const glow = src && src.emissive ? src.emissive.r + src.emissive.g + src.emissive.b : 0;
  const hasGlow = glow > 0.08 && src.emissiveIntensity > 0.2 && !src.map && !src.emissiveMap;
  const map = (src && (src.map || src.emissiveMap)) || null;
  return new THREE.MeshBasicMaterial({
    color: hasGlow ? src.emissive.clone() : (map ? new THREE.Color(0xffffff) : colorFromMaterial(src)),
    map,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: !src || src.depthWrite !== false,
    fog: !src || src.fog !== false,
  });
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (!obj.userData.noShadow) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
    const originals = materialBackup.get(obj);
    let next;
    if (obj.userData.shading === 'flat') {
      next = originals.map((src) => new THREE.MeshBasicMaterial({
        color: colorFromMaterial(src),
        transparent: !!(src && src.transparent),
        opacity: src && src.opacity != null ? src.opacity : 1,
        depthWrite: src ? src.depthWrite !== false : true,
        side: (src && src.side) || THREE.FrontSide,
      }));
    } else {
      next = originals.map((src) => (mode === 'toon' ? toToonMaterial(src) : toUnlitMaterial(src)));
    }
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

function applyRecolor(root, spec) {
  const rules = spec.recolor || null;
  const glow = spec.emissive || null;
  if (!rules && !glow) return;
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m || !m.color) continue;
      const name = (m.name || '').toLowerCase();
      if (rules) {
        for (const [key, hex] of Object.entries(rules)) {
          if (!name.includes(String(key).toLowerCase())) continue;
          if (name.includes('#000000')) continue;
          m.color.set(hex);
        }
      }
      if (glow) {
        for (const [key, hex] of Object.entries(glow)) {
          if (!name.includes(String(key).toLowerCase())) continue;
          if (!m.emissive) m.emissive = new THREE.Color(hex);
          else m.emissive.set(hex);
          m.emissiveIntensity = spec.emissiveIntensity ?? 0.9;
        }
      }
    }
  });
}

export function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient,
    map: opts.map || null,
    emissive: opts.emissive != null ? new THREE.Color(opts.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    emissiveMap: opts.emissiveMap || null,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    fog: opts.fog !== false,
    depthWrite: opts.depthWrite !== false,
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

/** Soft contact disc. rx/rz are radii in metres. */
export function addContact(g, x, z, rx, rz) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 22),
    new THREE.MeshBasicMaterial({
      color: 0x12080e,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.028, z);
  m.scale.set(rx, rz, 1);
  m.userData.shading = 'flat';
  m.userData.noShadow = true;
  m.renderOrder = 2;
  g.add(m);
  return m;
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  let shadingMode = 'toon';

  setStatus('loading layout…');
  const layout = await fetch('./layout.json').then((r) => r.json());

  const canvas = document.getElementById('c');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  } catch (err) {
    setStatus(`webgl failed: ${err.message}`);
    throw err;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFHardShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const clear = (layout.shell && layout.shell.clearColor) || '#d4dce2';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  const fogCol = (layout.shell && layout.shell.fogColor) || clear;
  scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 18, layout.shell?.fogFar ?? 42);

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

  const hemi = layout.lights?.hemi || { sky: 0xfff0dd, ground: 0x5a6a58, intensity: 0.55 };
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
  const keySpec = layout.lights?.key || { color: 0xfff4e8, intensity: 1.35, position: [6.5, 11, 4.5] };
  const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
  key.position.set(...keySpec.position);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sh = keySpec.shadow || {};
  key.shadow.camera.near = sh.near ?? 0.5;
  key.shadow.camera.far = sh.far ?? 28;
  key.shadow.camera.left = sh.left ?? -8;
  key.shadow.camera.right = sh.right ?? 8;
  key.shadow.camera.top = sh.top ?? 8;
  key.shadow.camera.bottom = sh.bottom ?? -8;
  key.shadow.bias = sh.bias ?? -0.00045;
  key.shadow.normalBias = sh.normalBias ?? 0.025;
  if (keySpec.target) {
    key.target.position.set(...keySpec.target);
    scene.add(key.target);
  }
  scene.add(key);
  const fillSpec = layout.lights?.fill || { color: 0xb8c8e0, intensity: 0.35, position: [-5, 6, 3] };
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
  setStatus(`loading ${kinds.length} GLBs…`);
  await Promise.all(
    kinds.map(async (kind) => {
      const spec = layout.assets[kind];
      const gltf = await loader.loadAsync(spec.glb);
      applyRecolor(gltf.scene, spec);
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
      console.warn('missing asset', inst.kind);
      continue;
    }
    const node = proto.clone(true);
    applyShading(node, shadingMode);
    node.position.set(inst.position[0], inst.position[1], inst.position[2]);
    if (typeof inst.rotationY === 'number') node.rotation.y = inst.rotationY;
    if (Array.isArray(inst.scale)) {
      if (inst.scale.length === 3) node.scale.multiply(new THREE.Vector3(...inst.scale));
      else node.scale.multiplyScalar(inst.scale[0]);
    } else if (inst.scale) node.scale.multiplyScalar(inst.scale);
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
  }

  const params = new URLSearchParams(location.search);
  const shot = params.get('shot') === '1';
  if (params.get('mode') === 'unlit') setMode('unlit');
  if (params.get('hud') === '0') {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
  }
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
  window.__cafe = window.__scene;

  let frames = 0;
  function tick() {
    controls.update();
    renderer.render(scene, camera);
    frames += 1;
    if (shot && frames >= 3) {
      window.__shot = true;
      return;
    }
    requestAnimationFrame(tick);
  }
  tick();
}
