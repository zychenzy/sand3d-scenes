import * as THREE from 'three';
import { OrbitControls } from '../../../library/vendor/controls/OrbitControls.js';
import { GLTFLoader } from '../../../library/vendor/loaders/GLTFLoader.js';

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

function colorFromMaterial(src) {
  if (!src) return new THREE.Color(0xaaaaaa);
  if (src.color && src.color.isColor) return src.color.clone();
  return new THREE.Color(0xaaaaaa);
}

export function toToonMaterial(src) {
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
  if (src && src.alphaTest) m.alphaTest = src.alphaTest;
  if (src && src.emissive && src.emissive.isColor) {
    const e = src.emissive.r + src.emissive.g + src.emissive.b;
    if (e > 0.001) {
      m.emissive.copy(src.emissive);
      m.emissiveIntensity = src.emissiveIntensity ?? 1;
    }
  }
  if (src && src.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = src.polygonOffsetFactor;
    m.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  return m;
}

export function toUnlitMaterial(src) {
  const color = colorFromMaterial(src);
  if (src && src.emissive && src.emissiveIntensity > 0.35) {
    color.lerp(new THREE.Color(0xfff6e4), 0.45);
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
    obj.castShadow = !obj.userData.noCast;
    obj.receiveShadow = !obj.userData.noReceive;
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

/** Banker's lamp and pendant bulbs/shades keep a visible glow through the toon step. */
export function markLampEmissive(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const n = (obj.name || '').toLowerCase();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m || !m.color) continue;
      if (n.includes('light_tube') || n.includes('bulb')) {
        m.color.set('#fff3cf');
        m.emissive = new THREE.Color('#fff1c4');
        m.emissiveIntensity = 0.95;
        obj.userData.noCast = true;
      } else if (n.includes('green_roof') || n === 'shade' || n.includes('shade')) {
        m.emissive = m.color.clone();
        m.emissiveIntensity = 0.28;
      }
    }
  });
}

export function tintMeshes(root, hex, mix = 1) {
  const tint = new THREE.Color(hex);
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m || !m.color) continue;
      if (mix >= 1) m.color.copy(tint);
      else m.color.lerp(tint, mix);
    }
  });
}

export function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
    map: opts.map || null,
    emissive: opts.emissive || 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
}

export function addBox(g, w, h, d, mat, x, y, z, extra = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (extra.rotY) m.rotation.y = extra.rotY;
  if (extra.rotX) m.rotation.x = extra.rotX;
  if (extra.rotZ) m.rotation.z = extra.rotZ;
  if (extra.noCast) m.userData.noCast = true;
  if (extra.name) m.name = extra.name;
  m.castShadow = !extra.noCast;
  m.receiveShadow = extra.receive !== false;
  g.add(m);
  return m;
}

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 16, extra = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
  if (extra.rotX) m.rotation.x = extra.rotX;
  if (extra.rotZ) m.rotation.z = extra.rotZ;
  if (extra.rotY) m.rotation.y = extra.rotY;
  if (extra.noCast) m.userData.noCast = true;
  m.castShadow = !extra.noCast;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

const labelCache = new Map();

export function labelTexture(text, opts = {}) {
  const w = opts.w || 256;
  const h = opts.h || 128;
  const key = JSON.stringify([text, opts.bg, opts.fg, opts.border, w, h, opts.font]);
  if (labelCache.has(key)) return labelCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = opts.bg || '#f4ecd8';
  ctx.fillRect(0, 0, w, h);
  if (opts.border !== 'none') {
    ctx.strokeStyle = opts.border || '#5c4030';
    ctx.lineWidth = Math.max(4, Math.round(w / 48));
    ctx.strokeRect(6, 6, w - 12, h - 12);
  }
  ctx.fillStyle = opts.fg || '#2a2118';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = opts.font || `600 ${Math.round(h * 0.28)}px serif`;
  const lines = String(text).split('\n');
  const gap = h / (lines.length + 0.6);
  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, gap * (i + 0.8), w - 24);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  labelCache.set(key, tex);
  return tex;
}

/** Soft floor ellipses under grounded groups. Kept unlit so they survive both modes. */
export function addContactShadows(parent, nodes) {
  const geo = new THREE.CircleGeometry(1, 18);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x2c241c,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const g = new THREE.Group();
  g.name = 'contacts';
  for (const node of nodes) {
    if (!node) continue;
    node.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(node);
    if (box.isEmpty()) continue;
    if (box.min.y > 0.45) continue;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    if (size.x < 0.08 || size.z < 0.08) continue;
    if (size.x > 6 || size.z > 6) continue;
    const ellipse = new THREE.Mesh(geo, mat);
    ellipse.rotation.x = -Math.PI / 2;
    ellipse.scale.set(Math.min(size.x * 0.46, 1.8), Math.min(size.z * 0.46, 1.5), 1);
    ellipse.position.set(center.x, 0.022, center.z);
    ellipse.userData.noCast = true;
    ellipse.receiveShadow = false;
    g.add(ellipse);
  }
  parent.add(g);
  return g;
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  let shadingMode = 'toon';

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
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 40;
  key.shadow.camera.left = -14;
  key.shadow.camera.right = 14;
  key.shadow.camera.top = 14;
  key.shadow.camera.bottom = -14;
  key.shadow.bias = -0.00035;
  key.shadow.normalBias = 0.025;
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
  const failed = [];
  await Promise.all(
    kinds.map(async (kind) => {
      const spec = layout.assets[kind];
      try {
        const gltf = await loader.loadAsync(spec.glb);
        const prepared = prepareAsset(gltf.scene, spec.targetHeight);
        if (spec.tint) tintMeshes(prepared, spec.tint, spec.tintMix ?? 1);
        if (spec.noCast) {
          prepared.traverse((obj) => { if (obj.isMesh) obj.userData.noCast = true; });
        }
        if (kind === 'library_lamp' || kind === 'pendant_lamp') markLampEmissive(prepared);
        applyShading(prepared, shadingMode);
        prototypes[kind] = prepared;
      } catch (err) {
        console.error('GLB failed', kind, spec.glb, err);
        failed.push(kind);
      }
    })
  );
  if (failed.length) setStatus('missing GLB: ' + failed.join(', '));

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
    if (Array.isArray(inst.scale)) {
      if (inst.scale.length === 3) node.scale.multiply(new THREE.Vector3(...inst.scale));
      else node.scale.multiplyScalar(inst.scale[0]);
    } else if (inst.scale) node.scale.multiplyScalar(inst.scale);
    node.name = inst.id;
    node.userData.kind = inst.kind;
    props.add(node);
  }

  const grounded = [
    ...procedural.children.filter((c) => c.userData && c.userData.contact),
    ...props.children.filter((c) => (c.position?.y || 0) < 0.35),
  ];
  addContactShadows(scene, grounded);

  if (!failed.length) setStatus(opts.readyText || 'ready — drag orbit · U unlit · T toon');

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

  window.__scene = { renderer, scene, camera, controls, setMode, layout, failed };
  window.__ready = failed.length === 0;

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
