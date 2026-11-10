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
  if (!src) return;
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
}

export function toToonMaterial(src) {
  const emissive = src && src.emissive && src.emissive.isColor
    ? src.emissive.clone()
    : new THREE.Color(0, 0, 0);
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    emissive,
    emissiveIntensity: src && src.emissiveIntensity != null ? src.emissiveIntensity : 1,
  });
  copySurface(m, src);
  return m;
}

export function toUnlitMaterial(src) {
  const color = colorFromMaterial(src);
  if (src && src.emissive && src.emissive.isColor) {
    const e = src.emissive;
    if (e.r + e.g + e.b > 0.04) color.copy(e);
  }
  const m = new THREE.MeshBasicMaterial({
    color,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
  });
  copySurface(m, src);
  return m;
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const skipShadow = !!obj.userData.noShadow;
    obj.castShadow = !skipShadow;
    obj.receiveShadow = !skipShadow;
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
    emissive: new THREE.Color(opts.emissive || 0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
    map: opts.map || null,
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

function col(c, fallback) {
  if (c == null) return fallback;
  if (typeof c === 'number') return c;
  return new THREE.Color(c).getHex();
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  window.__errors = window.__errors || [];
  try {
    await bootInner(opts, setStatus);
  } catch (err) {
    console.error(err);
    const msg = err && err.stack ? String(err.stack) : String(err);
    window.__errors.push(msg);
    setStatus('failed: ' + (err && err.message ? err.message : err));
  }
}

async function bootInner(opts, setStatus) {
  let shadingMode = 'toon';
  if (new URLSearchParams(location.search).get('hud') === '0') {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
  }

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
  const clear = (layout.shell && layout.shell.clearColor) || '#2a211e';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  const fogCol = (layout.shell && layout.shell.fogColor) || clear;
  scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 16, layout.shell?.fogFar ?? 36);

  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.05, 80);
  camera.position.set(...cam.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 1.1;
  controls.maxDistance = 28;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: 0xffe6d0, ground: 0x4a3030, intensity: 0.45 };
  scene.add(new THREE.HemisphereLight(col(hemi.sky, 0xffe6d0), col(hemi.ground, 0x4a3030), hemi.intensity));

  const keySpec = layout.lights?.key || { color: 0xffe2c4, intensity: 0.7, position: [4, 8, 3] };
  const key = new THREE.DirectionalLight(col(keySpec.color, 0xffe2c4), keySpec.intensity);
  key.position.set(...keySpec.position);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = keySpec.shadowFar ?? 32;
  const ext = keySpec.shadowExtent ?? 12;
  key.shadow.camera.left = -ext;
  key.shadow.camera.right = ext;
  key.shadow.camera.top = ext;
  key.shadow.camera.bottom = -ext;
  key.shadow.bias = keySpec.bias ?? -0.0008;
  key.shadow.normalBias = keySpec.normalBias ?? 0.035;
  if (keySpec.target) {
    key.target.position.set(...keySpec.target);
    scene.add(key.target);
  }
  scene.add(key);

  const fillSpec = layout.lights?.fill || { color: 0x6a5048, intensity: 0.2, position: [-4, 3, 2] };
  const fill = new THREE.DirectionalLight(col(fillSpec.color, 0x6a5048), fillSpec.intensity);
  fill.position.set(...fillSpec.position);
  scene.add(fill);

  if (layout.lights?.points) {
    for (const p of layout.lights.points) {
      const pl = new THREE.PointLight(
        col(p.color, 0xffb56a),
        p.intensity ?? 1,
        p.distance ?? 4,
        p.decay ?? 2,
      );
      pl.position.set(...p.position);
      scene.add(pl);
    }
  }

  if (layout.lights?.spots) {
    for (const s of layout.lights.spots) {
      const spot = new THREE.SpotLight(
        col(s.color, 0xffc48a),
        s.intensity ?? 4,
        s.distance ?? 7,
        s.angle ?? 0.5,
        s.penumbra ?? 0.55,
        s.decay ?? 2,
      );
      spot.position.set(...s.position);
      spot.target.position.set(...s.target);
      scene.add(spot);
      scene.add(spot.target);
      if (s.castShadow) {
        spot.castShadow = true;
        spot.shadow.mapSize.set(1024, 1024);
        spot.shadow.bias = -0.001;
        spot.shadow.normalBias = 0.04;
      }
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
      const prepared = prepareAsset(gltf.scene, spec.targetHeight);
      if (opts.onPrototype) opts.onPrototype(kind, prepared, spec);
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
      window.__errors.push('missing prototype ' + inst.kind);
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
    node.userData.role = inst.role || '';
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

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
