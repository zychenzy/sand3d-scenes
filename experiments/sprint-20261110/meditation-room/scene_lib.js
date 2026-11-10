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

function copySurface(src, m) {
  m.depthWrite = src.depthWrite !== false;
  if (src.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = src.polygonOffsetFactor;
    m.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  if (src.userData && src.userData.unlitAlways) m.userData.unlitAlways = true;
  return m;
}

export function toToonMaterial(src) {
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    alphaMap: src && src.alphaMap ? src.alphaMap : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
  });
  if (src && src.emissive) m.emissive.copy(src.emissive);
  m.emissiveIntensity = src && src.emissiveIntensity != null ? src.emissiveIntensity : 1;
  return copySurface(src || {}, m);
}

export function toUnlitMaterial(src) {
  const color = colorFromMaterial(src);
  if (src && src.emissive && src.emissiveIntensity > 0.05 && src.emissive.getHex() !== 0) {
    color.lerp(src.emissive, Math.min(1, 0.45 + src.emissiveIntensity * 0.35));
  }
  const m = new THREE.MeshBasicMaterial({
    color,
    map: src && src.map ? src.map : null,
    alphaMap: src && src.alphaMap ? src.alphaMap : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
  });
  return copySurface(src || {}, m);
}

function shadeOne(src, mode) {
  if (!src) return new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
  if (src.userData && src.userData.unlitAlways) return toUnlitMaterial(src);
  return mode === 'toon' ? toToonMaterial(src) : toUnlitMaterial(src);
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = !(obj.userData && obj.userData.noCast);
    obj.receiveShadow = !(obj.userData && obj.userData.noReceive);
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
    const originals = materialBackup.get(obj);
    const next = originals.map((src) => shadeOne(src, mode));
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
    emissive: opts.emissive ?? '#000000',
    emissiveIntensity: opts.emissiveIntensity ?? (opts.emissive ? 1 : 0),
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    map: opts.map || null,
  });
  if (opts.depthWrite === false) m.depthWrite = false;
  if (opts.unlitAlways) m.userData.unlitAlways = true;
  if (opts.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = opts.polygonOffsetFactor ?? -2;
    m.polygonOffsetUnits = opts.polygonOffsetUnits ?? -2;
  }
  return m;
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

let contactTex = null;
function contactTexture() {
  if (contactTex) return contactTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
  grd.addColorStop(0, 'rgba(50,36,24,0.50)');
  grd.addColorStop(0.45, 'rgba(50,36,24,0.22)');
  grd.addColorStop(1, 'rgba(50,36,24,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  contactTex = new THREE.CanvasTexture(c);
  contactTex.colorSpace = THREE.SRGBColorSpace;
  contactTex.needsUpdate = true;
  return contactTex;
}

export function contactMaterial() {
  return toon('#ffffff', {
    map: contactTexture(),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    unlitAlways: true,
    polygonOffset: true,
  });
}

function asColor(c, fallback) {
  if (c == null) return new THREE.Color(fallback);
  return new THREE.Color(c);
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  let shadingMode = 'toon';
  window.__sceneError = '';
  window.addEventListener('error', (e) => { window.__sceneError = e.message || String(e.error); });
  window.addEventListener('unhandledrejection', (e) => { window.__sceneError = String(e.reason && e.reason.message || e.reason); });

  setStatus('loading layout…');
  const layout = await fetch('./layout.json').then((r) => r.json());
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot') === '1';

  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(shot ? 1 : Math.min(devicePixelRatio, 2));
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
  controls.enableDamping = !shot;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 0.7;
  controls.maxDistance = 26;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: '#fff0dd', ground: '#5a6a58', intensity: 0.55 };
  scene.add(new THREE.HemisphereLight(asColor(hemi.sky, '#fff0dd'), asColor(hemi.ground, '#5a6a58'), hemi.intensity));

  const keySpec = layout.lights?.key || { color: '#fff4e8', intensity: 1.35, position: [6.5, 11, 4.5] };
  const key = new THREE.DirectionalLight(asColor(keySpec.color, '#fff4e8'), keySpec.intensity);
  key.position.set(...keySpec.position);
  key.castShadow = true;
  key.shadow.mapSize.set(keySpec.mapSize || 2048, keySpec.mapSize || 2048);
  key.shadow.camera.near = keySpec.near ?? 0.5;
  key.shadow.camera.far = keySpec.far ?? 22;
  key.shadow.camera.left = keySpec.left ?? -8;
  key.shadow.camera.right = keySpec.right ?? 8;
  key.shadow.camera.top = keySpec.top ?? 8;
  key.shadow.camera.bottom = keySpec.bottom ?? -8;
  key.shadow.bias = keySpec.bias ?? -0.00022;
  key.shadow.normalBias = keySpec.normalBias ?? 0.028;
  scene.add(key);
  if (keySpec.target) {
    key.target.position.set(...keySpec.target);
    scene.add(key.target);
  }

  const fillSpec = layout.lights?.fill || { color: '#b8c8e0', intensity: 0.35, position: [-5, 6, 3] };
  const fill = new THREE.DirectionalLight(asColor(fillSpec.color, '#d5ddd8'), fillSpec.intensity);
  fill.position.set(...fillSpec.position);
  scene.add(fill);

  if (layout.lights?.points) {
    for (const p of layout.lights.points) {
      const pl = new THREE.PointLight(asColor(p.color, '#ffd8a8'), p.intensity ?? 0.5, p.distance ?? 12, p.decay ?? 2);
      pl.position.set(...p.position);
      scene.add(pl);
    }
  }
  if (layout.lights?.spots) {
    for (const s of layout.lights.spots) {
      const spot = new THREE.SpotLight(
        asColor(s.color, '#fff1d4'),
        s.intensity ?? 8,
        s.distance ?? 10,
        s.angle ?? 0.5,
        s.penumbra ?? 0.5,
        s.decay ?? 2,
      );
      spot.position.set(...s.position);
      spot.castShadow = false;
      scene.add(spot);
      spot.target.position.set(...s.target);
      scene.add(spot.target);
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
  await Promise.all(kinds.map(async (kind) => {
    const spec = layout.assets[kind];
    const gltf = await loader.loadAsync(spec.glb);
    const prepared = prepareAsset(gltf.scene, spec.targetHeight);
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
    if (inst.tint || inst.color) {
      const tint = inst.tint ? new THREE.Color(inst.tint) : null;
      const flat = inst.color ? new THREE.Color(inst.color) : null;
      node.traverse((o) => {
        if (!o.isMesh) return;
        const paint = (m) => {
          const c = m.clone();
          if (c.color) {
            if (flat) c.color.copy(flat);
            else c.color.multiply(tint);
          }
          return c;
        };
        o.material = Array.isArray(o.material) ? o.material.map(paint) : paint(o.material);
      });
    }
    applyShading(node, shadingMode);
    node.position.set(inst.position[0], inst.position[1], inst.position[2]);
    if (inst.rotationY) node.rotation.y = inst.rotationY;
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

  if (params.get('bounds') === '1') {
    props.updateWorldMatrix(true, true);
    window.__bounds = [];
    for (const inst of layout.instances || []) {
      const obj = props.getObjectByName(inst.id);
      if (!obj) continue;
      const b = new THREE.Box3().setFromObject(obj);
      window.__bounds.push({
        id: inst.id,
        min: b.min.toArray().map((n) => +n.toFixed(3)),
        max: b.max.toArray().map((n) => +n.toFixed(3)),
      });
    }
  }

  window.__scene = { renderer, scene, camera, controls, setMode, layout };
  window.__sceneReady = false;

  let frames = 0;
  function tick() {
    controls.update();
    renderer.render(scene, camera);
    frames += 1;
    if (frames === 2) window.__sceneReady = true;
    requestAnimationFrame(tick);
  }
  tick();
}
