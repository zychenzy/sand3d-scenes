import * as THREE from 'three';
import { OrbitControls } from '../../../workshop/vendor/controls/OrbitControls.js';
import { GLTFLoader } from '../../../workshop/vendor/loaders/GLTFLoader.js';

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

function copySurface(m, src) {
  if (!src) return m;
  if (src.map) m.map = src.map;
  if (src.vertexColors) m.vertexColors = true;
  if (src.alphaMap) m.alphaMap = src.alphaMap;
  m.side = src.side || THREE.FrontSide;
  if (src.transparent) {
    m.transparent = true;
    m.opacity = src.opacity ?? 1;
  }
  if (src.depthWrite === false) m.depthWrite = false;
  if (src.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = src.polygonOffsetFactor;
    m.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  return m;
}

export function toToonMaterial(src) {
  const emissive = src && src.emissive && src.emissive.isColor ? src.emissive.clone() : new THREE.Color(0, 0, 0);
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
    gradientMap: toonGradient,
    emissive,
    emissiveIntensity: src && src.emissiveIntensity != null ? src.emissiveIntensity : 1,
  });
  return copySurface(m, src);
}

export function toUnlitMaterial(src) {
  let color = colorFromMaterial(src);
  if (src && src.emissive && src.emissive.isColor) {
    const e = src.emissive;
    if (e.r + e.g + e.b > 0.08) {
      color = e.clone();
      const gain = src.emissiveIntensity != null ? Math.min(src.emissiveIntensity, 1.4) : 1;
      color.multiplyScalar(gain);
    }
  }
  const m = new THREE.MeshBasicMaterial({ color });
  return copySurface(m, src);
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.userData.noShadow) {
      obj.castShadow = false;
      obj.receiveShadow = false;
    } else {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
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
    map: opts.map || null,
    gradientMap: toonGradient,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    emissive: new THREE.Color(opts.emissive != null ? opts.emissive : 0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    depthWrite: opts.depthWrite !== undefined ? opts.depthWrite : !opts.transparent,
  });
  if (opts.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = opts.polygonOffsetFactor ?? -2;
    m.polygonOffsetUnits = opts.polygonOffsetUnits ?? -2;
  }
  return m;
}

let contactMap;
function contactTexture() {
  if (contactMap) return contactMap;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 8, 64, 64, 62);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(0.55, 'rgba(0,0,0,0.22)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  contactMap = new THREE.CanvasTexture(c);
  contactMap.colorSpace = THREE.SRGBColorSpace;
  return contactMap;
}

/** Soft grounding disc. rx/rz are radii in metres. */
export function contactDisc(g, x, z, rx, rz, opacity = 0.5) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    toon('#1c1612', {
      map: contactTexture(),
      transparent: true,
      opacity,
      depthWrite: false,
      polygonOffset: true,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.scale.set(rx, rz, 1);
  m.position.set(x, 0.018, z);
  m.userData.noShadow = true;
  g.add(m);
  return m;
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  const errors = [];
  window.__errors = errors;
  let shadingMode = 'toon';

  setStatus('loading layout…');
  const layout = await fetch('./layout.json').then((r) => {
    if (!r.ok) throw new Error(`layout.json ${r.status}`);
    return r.json();
  });

  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFHardShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const clear = (layout.shell && layout.shell.clearColor) || '#e6dfd4';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  const fogCol = (layout.shell && layout.shell.fogColor) || clear;
  scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 18, layout.shell?.fogFar ?? 36);

  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, window.innerWidth / window.innerHeight, 0.08, 80);
  camera.position.set(...cam.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 1.1;
  controls.maxDistance = 24;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: 0xfff3e4, ground: 0x6d5a48, intensity: 0.42 };
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
  const keySpec = layout.lights?.key || { color: 0xfff6ea, intensity: 1.25, position: [6, 11, 5] };
  const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
  key.position.set(...keySpec.position);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sh = keySpec.shadow || {};
  key.shadow.camera.near = sh.near ?? 2;
  key.shadow.camera.far = sh.far ?? 32;
  key.shadow.camera.left = sh.left ?? -8;
  key.shadow.camera.right = sh.right ?? 8;
  key.shadow.camera.top = sh.top ?? 8;
  key.shadow.camera.bottom = sh.bottom ?? -8;
  key.shadow.bias = sh.bias ?? -0.00035;
  key.shadow.normalBias = sh.normalBias ?? 0.028;
  scene.add(key);
  const fillSpec = layout.lights?.fill || { color: 0xc9d4e6, intensity: 0.32, position: [-6, 5, 3] };
  const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
  fill.position.set(...fillSpec.position);
  scene.add(fill);
  if (layout.lights?.points) {
    for (const p of layout.lights.points) {
      const pl = new THREE.PointLight(p.color || 0xffc98a, p.intensity ?? 0.6, p.distance ?? 6, p.decay ?? 2);
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
        if (opts.preparePrototype) opts.preparePrototype(kind, prepared);
        applyShading(prepared, shadingMode);
        prototypes[kind] = prepared;
      } catch (err) {
        errors.push(`${kind}: ${err.message || err}`);
        console.error('asset failed', kind, spec.glb, err);
      }
    }),
  );

  const props = new THREE.Group();
  props.name = 'props';
  scene.add(props);
  let placed = 0;
  for (const inst of layout.instances || []) {
    const proto = prototypes[inst.kind];
    if (!proto) {
      errors.push(`missing kind ${inst.kind} for ${inst.id}`);
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
    props.add(node);
    placed += 1;
  }

  setStatus(
    errors.length
      ? `ready with ${errors.length} asset errors`
      : (opts.readyText || 'ready — drag orbit · U unlit · T toon'),
  );

  function setMode(mode) {
    shadingMode = mode;
    applyShading(shell, mode);
    applyShading(procedural, mode);
    applyShading(props, mode);
    const modeEl = document.getElementById('mode');
    if (modeEl) modeEl.textContent = mode.toUpperCase();
    if (window.__scene) window.__scene.shadingMode = mode;
  }

  const params = new URLSearchParams(location.search);
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
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  window.__scene = {
    renderer, scene, camera, controls, setMode, layout, placed, errors, shadingMode, ready: errors.length === 0,
  };
  window.__ready = errors.length === 0;

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
