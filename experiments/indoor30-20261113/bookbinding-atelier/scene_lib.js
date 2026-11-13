import * as THREE from 'three';
import { OrbitControls } from '../../../workshop/vendor/controls/OrbitControls.js';
import { GLTFLoader } from '../../../workshop/vendor/loaders/GLTFLoader.js';

/** Four hard steps. The darkest stop is lifted so walnut and steel do not crush to black. */
export function makeToonGradient(stops = [82, 150, 208, 255]) {
  const data = new Uint8Array(stops.length * 4);
  stops.forEach((v, i) => {
    data[i * 4 + 0] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  });
  const tex = new THREE.DataTexture(data, stops.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

export const toonGradient = makeToonGradient();
const materialBackup = new WeakMap();

function colorFromMaterial(mat) {
  if (!mat) return new THREE.Color(0xaaaaaa);
  if (mat.color && mat.color.isColor) return mat.color.clone();
  return new THREE.Color(0xaaaaaa);
}

function liftBlack(color) {
  if (Math.max(color.r, color.g, color.b) < 0.035) color.setRGB(0.09, 0.086, 0.08);
  return color;
}

export function toToonMaterial(src) {
  const color = liftBlack(colorFromMaterial(src));
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
  });
  if (src && src.emissive && src.emissive.isColor) {
    m.emissive.copy(src.emissive);
    m.emissiveIntensity = src.emissiveIntensity ?? 1;
  }
  if (src && src.transparent) {
    m.transparent = true;
    m.opacity = src.opacity ?? 1;
    m.depthWrite = src.depthWrite !== false;
  }
  if (src && src.alphaTest) m.alphaTest = src.alphaTest;
  return m;
}

export function toUnlitMaterial(src) {
  const color = liftBlack(colorFromMaterial(src));
  if (src && src.emissive && src.emissive.isColor && src.emissive.getHex() !== 0) {
    color.lerp(src.emissive, Math.min(0.85, 0.45 + 0.2 * (src.emissiveIntensity || 1)));
  }
  return new THREE.MeshBasicMaterial({
    color,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: src && src.transparent ? src.depthWrite !== false : true,
  });
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.userData.keepBasic) {
      obj.castShadow = false;
      obj.receiveShadow = false;
      return;
    }
    obj.castShadow = obj.userData.noCast ? false : true;
    obj.receiveShadow = obj.userData.noReceive ? false : true;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
    const originals = materialBackup.get(obj);
    const next = originals.map((src) => (mode === 'toon' ? toToonMaterial(src) : toUnlitMaterial(src)));
    obj.material = Array.isArray(obj.material) ? next : next[0];
  });
}

const EMITTER_NAMES = ['bulb', 'light_tube'];

export function markEmitters(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const name = (obj.name || '').toLowerCase();
    if (!EMITTER_NAMES.some((n) => name.includes(n))) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m || !m.color) continue;
      m.color.set('#fff4d2');
      if (m.emissive) {
        m.emissive.set('#ffe2a4');
        m.emissiveIntensity = 0.85;
      }
    }
    obj.userData.noCast = true;
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
    emissive: opts.emissive ? new THREE.Color(opts.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? 1,
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

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 12) {
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
  const grd = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grd.addColorStop(0, 'rgba(40,28,18,0.45)');
  grd.addColorStop(0.55, 'rgba(40,28,18,0.16)');
  grd.addColorStop(1, 'rgba(40,28,18,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  contactTex = new THREE.CanvasTexture(c);
  contactTex.colorSpace = THREE.NoColorSpace;
  return contactTex;
}

export function addContact(g, x, z, w, d, opacity = 0.38) {
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
  m.position.set(x, 0.028, z);
  m.userData.keepBasic = true;
  m.renderOrder = 2;
  g.add(m);
  return m;
}

function addWall(g, w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  m.castShadow = false;
  m.userData.noCast = true;
  g.add(m);
  return m;
}

/** Cutaway room. Back wall is -Z, left wall is -X. Front and right stay open. */
export function makeCutawayShell(layout, extra = {}) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell || {};
  const floorMat = toon(s.floorColor || '#c4b49a');
  const wallMat = toon(s.wallColor || '#efe6d4');
  const thick = 0.12;

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), floorMat);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  floor.castShadow = false;
  floor.userData.noCast = true;
  g.add(floor);

  addWall(g, W, H, thick, wallMat, 0, H / 2, -D / 2);

  const opening = extra.leftOpening;
  if (!opening) {
    addWall(g, thick, H, D, wallMat, -W / 2, H / 2, 0);
  } else {
    const { z0, z1, y0, y1 } = opening;
    const dBack = z0 + D / 2;
    addWall(g, thick, H, dBack, wallMat, -W / 2, H / 2, -D / 2 + dBack / 2);
    const dFront = D / 2 - z1;
    addWall(g, thick, H, dFront, wallMat, -W / 2, H / 2, z1 + dFront / 2);
    const span = z1 - z0;
    const zc = (z0 + z1) / 2;
    addWall(g, thick, y0, span, wallMat, -W / 2, y0 / 2, zc);
    const over = H - y1;
    addWall(g, thick, over, span, wallMat, -W / 2, y1 + over / 2, zc);
  }
  return g;
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  window.__errors = [];
  window.__ready = false;
  window.addEventListener('error', (e) => window.__errors.push(String(e.message || e.error || 'error')));
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason && e.reason.message ? e.reason.message : e.reason;
    window.__errors.push(String(reason));
  });

  let shadingMode = 'toon';
  setStatus('loading layout…');
  const layout = await fetch('./layout.json').then((r) => r.json());

  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.toneMapping = THREE.NoToneMapping;
  const params = new URLSearchParams(location.search);
  const dprCap = params.get('dpr') ? Number(params.get('dpr')) : 1.5;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap || 1));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFHardShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const clear = (layout.shell && layout.shell.clearColor) || '#e6dfd2';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  const fogCol = (layout.shell && layout.shell.fogColor) || clear;
  scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 22, layout.shell?.fogFar ?? 42);
  scene.background = new THREE.Color(clear);

  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.08, 80);
  camera.position.set(...cam.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minDistance = 0.8;
  controls.maxDistance = 22;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: '#fff6ea', ground: '#6a5340', intensity: 0.42 };
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));

  const keySpec = layout.lights?.key || { color: '#fff3e4', intensity: 1.05, position: [7, 11, 6] };
  const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
  key.position.set(...keySpec.position);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.4;
  key.shadow.camera.far = 32;
  key.shadow.camera.left = -9;
  key.shadow.camera.right = 9;
  key.shadow.camera.top = 9;
  key.shadow.camera.bottom = -9;
  key.shadow.bias = -0.00035;
  key.shadow.normalBias = 0.042;
  key.target.position.set(0, 0.7, -0.4);
  scene.add(key);
  scene.add(key.target);

  const fillSpec = layout.lights?.fill || { color: '#c9d6ea', intensity: 0.32, position: [-7, 5, 1.2] };
  const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
  fill.position.set(...fillSpec.position);
  scene.add(fill);

  if (layout.lights?.points) {
    for (const p of layout.lights.points) {
      const pl = new THREE.PointLight(p.color || '#ffd8a8', p.intensity ?? 0.4, p.distance ?? 4, p.decay ?? 2);
      pl.position.set(...p.position);
      pl.name = p.id || 'point';
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
        markEmitters(gltf.scene);
        const prepared = prepareAsset(gltf.scene, spec.targetHeight);
        applyShading(prepared, shadingMode);
        prototypes[kind] = prepared;
      } catch (err) {
        console.error('GLB failed', kind, spec.glb, err);
        window.__errors.push(`${kind}: ${spec.glb}`);
        setStatus(`failed: ${kind}`);
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
    if (inst.rotationY) node.rotation.y = inst.rotationY;
    if (Array.isArray(inst.scale)) node.scale.multiply(new THREE.Vector3(...inst.scale));
    else if (inst.scale) node.scale.multiplyScalar(inst.scale);
    node.name = inst.id;
    props.add(node);
  }

  if (params.get('hud') === '0') {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
  }

  scene.updateMatrixWorld(true);
  let metrics = null;
  if (opts.measure) metrics = opts.measure(scene);

  function setMode(mode) {
    shadingMode = mode;
    applyShading(shell, mode);
    applyShading(procedural, mode);
    applyShading(props, mode);
    const modeEl = document.getElementById('mode');
    if (modeEl) modeEl.textContent = mode.toUpperCase();
  }

  if (params.get('mode') === 'unlit') setMode('unlit');
  const presets = { ...(layout.cameraPresets || {}) };
  let camKey = params.get('cam');
  if (camKey === 'detail') camKey = 'close';
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

  const errNote = window.__errors.length ? ` · ${window.__errors.length} error(s)` : '';
  setStatus((opts.readyText || 'ready — drag orbit · U unlit · T toon') + errNote);

  const api = { renderer, scene, camera, controls, setMode, layout, props, metrics };
  window.__scene = api;
  window.__metrics = metrics;
  renderer.render(scene, camera);
  window.__ready = window.__errors.length === 0;

  if (params.get('debug') === '1') console.log('metrics', metrics);

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
  return api;
}

export function meshExtent(object) {
  const box = new THREE.Box3().setFromObject(object);
  return {
    minY: round(box.min.y),
    maxY: round(box.max.y),
    size: box.getSize(new THREE.Vector3()).toArray().map(round),
  };
}
