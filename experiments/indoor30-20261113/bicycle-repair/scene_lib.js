import * as THREE from 'three';
import { OrbitControls } from '../../../workshop/vendor/controls/OrbitControls.js';
import { GLTFLoader } from '../../../workshop/vendor/loaders/GLTFLoader.js';

/** Four hard steps. The darkest stop stays lifted so shadows keep the material color. */
export function makeToonGradient(steps = 4, minLevel = 0.42) {
  const data = new Uint8Array(steps * 4);
  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 1 : i / (steps - 1);
    const v = Math.round((minLevel + (1 - minLevel) * t) * 255);
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

export const toonGradient = makeToonGradient(4, 0.42);
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
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: src && src.transparent ? src.depthWrite !== false : true,
    emissive: src && src.emissive && src.emissive.isColor ? src.emissive.clone() : new THREE.Color(0x000000),
    emissiveIntensity: src && src.emissiveIntensity != null ? src.emissiveIntensity : 1,
  });
  if (src && src.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = src.polygonOffsetFactor ?? -1;
    m.polygonOffsetUnits = src.polygonOffsetUnits ?? -1;
  }
  return m;
}

export function toUnlitMaterial(src) {
  const color = colorFromMaterial(src);
  if (src && src.emissive && src.emissive.isColor && src.emissive.getHex() !== 0) {
    color.lerp(src.emissive, Math.min(0.85, 0.45 + 0.2 * (src.emissiveIntensity || 1)));
  }
  const m = new THREE.MeshBasicMaterial({
    color,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: src && src.transparent ? src.depthWrite !== false : true,
  });
  if (src && src.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = src.polygonOffsetFactor ?? -1;
    m.polygonOffsetUnits = src.polygonOffsetUnits ?? -1;
  }
  return m;
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.userData.keepBasic) {
      obj.castShadow = false;
      obj.receiveShadow = false;
      return;
    }
    const name = (obj.name || '').toLowerCase();
    const thin = name.includes('spoke') || name.includes('cable');
    obj.castShadow = obj.userData.noCast || thin ? false : true;
    obj.receiveShadow = obj.userData.noReceive ? false : true;
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
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient,
    map: opts.map || null,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
    emissive: new THREE.Color(opts.emissive || 0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? (opts.emissive ? 1 : 0),
  });
  if (opts.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = opts.polygonOffsetFactor ?? -1;
    m.polygonOffsetUnits = opts.polygonOffsetUnits ?? -1;
  }
  return m;
}

export function markLamps(root) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const name = (obj.name || '').toLowerCase();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m || !m.color) continue;
      if (name.includes('light_tube') || name === 'bulb' || name.includes('bulb')) {
        m.color.set('#fff4d8');
        m.emissive = new THREE.Color('#fff1c4');
        m.emissiveIntensity = 1;
      } else if (name.includes('green_roof') || name.includes('end_cap') || name === 'shade') {
        m.emissive = new THREE.Color('#ffc56a');
        m.emissiveIntensity = 0.55;
      }
    }
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

export function addMesh(g, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

/** Cylinder from point a to point b. */
export function rod(g, a, b, r, mat, seg = 8) {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = dir.length() || 1e-4;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.multiplyScalar(1 / len));
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

let contactTex = null;
function contactTexture() {
  if (contactTex) return contactTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grd.addColorStop(0, 'rgba(70,48,28,0.55)');
  grd.addColorStop(0.6, 'rgba(70,48,28,0.18)');
  grd.addColorStop(1, 'rgba(70,48,28,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  contactTex = new THREE.CanvasTexture(c);
  contactTex.colorSpace = THREE.NoColorSpace;
  return contactTex;
}

export function addContact(g, x, z, w, d, opacity = 0.28) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.max(w, 0.05), Math.max(d, 0.05)),
    new THREE.MeshBasicMaterial({
      map: contactTexture(),
      transparent: true,
      depthWrite: false,
      opacity,
      toneMapped: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.021, z);
  m.userData.keepBasic = true;
  m.renderOrder = 2;
  g.add(m);
  return m;
}

function collectBounds(root) {
  const out = [];
  for (const c of root.children) {
    const b = new THREE.Box3().setFromObject(c);
    if (b.isEmpty()) continue;
    const size = new THREE.Vector3();
    b.getSize(size);
    out.push({
      id: c.name,
      min: [round(b.min.x), round(b.min.y), round(b.min.z)],
      max: [round(b.max.x), round(b.max.y), round(b.max.z)],
      size: [round(size.x), round(size.y), round(size.z)],
    });
  }
  return out;
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  window.__errors = window.__errors || [];
  window.__ready = false;
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
  const clear = (layout.shell && layout.shell.clearColor) || '#d4dce2';
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
  controls.minDistance = 1.15;
  controls.maxDistance = 26;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: '#fff2e4', ground: '#8a735c', intensity: 0.62 };
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));

  const keySpec = layout.lights?.key || { color: '#fff6ea', intensity: 1.05, position: [7, 10, 6] };
  const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
  key.position.set(...keySpec.position);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.6;
  key.shadow.camera.far = 32;
  key.shadow.camera.left = -12;
  key.shadow.camera.right = 12;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -12;
  key.shadow.bias = -0.00018;
  key.shadow.normalBias = 0.045;
  scene.add(key);
  scene.add(key.target);

  const fillSpec = layout.lights?.fill || { color: '#d5e2ef', intensity: 0.38, position: [-6, 5, 3] };
  const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
  fill.position.set(...fillSpec.position);
  scene.add(fill);

  if (layout.lights?.points) {
    for (const p of layout.lights.points) {
      const pl = new THREE.PointLight(p.color || '#ffd8a8', p.intensity ?? 0.4, p.distance ?? 8, p.decay ?? 2);
      pl.position.set(...p.position);
      pl.name = p.id || 'point';
      scene.add(pl);
    }
  }

  const shell = opts.makeShell(layout);
  scene.add(shell);
  applyShading(shell, shadingMode);

  const procedural = opts.makeProcedural ? opts.makeProcedural(layout) : new THREE.Group();
  procedural.name = 'procedural';
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
        markLamps(prepared);
        applyShading(prepared, shadingMode);
        prototypes[kind] = prepared;
      } catch (err) {
        const msg = `${kind} failed (${spec.glb}): ${err && err.message ? err.message : err}`;
        window.__errors.push(msg);
        setStatus(msg);
        throw err;
      }
    }),
  );

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
    if (Array.isArray(inst.rotation)) {
      node.rotation.set(inst.rotation[0], inst.rotation[1], inst.rotation[2]);
    } else if (inst.rotationY) {
      node.rotation.y = inst.rotationY;
    }
    node.name = inst.id;
    props.add(node);
  }

  const params = new URLSearchParams(location.search);
  if (params.get('hud') === '0' || params.get('shot') === '1') {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
  }

  function setMode(mode) {
    shadingMode = mode;
    renderer.shadowMap.enabled = mode !== 'unlit';
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

  setStatus(opts.readyText || 'ready — drag orbit · U unlit · T toon');

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

  const api = {
    renderer,
    scene,
    camera,
    controls,
    setMode,
    layout,
    props,
    procedural,
    ready: true,
    bounds: () => collectBounds(props),
  };
  window.__scene = api;
  window.__ready = window.__errors.length === 0;

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
  return api;
}
