import * as THREE from 'three';
import { OrbitControls } from '../../../music/vendor/controls/OrbitControls.js';
import { GLTFLoader } from '../../../music/vendor/loaders/GLTFLoader.js';
import { rotationFor } from './orient.js';

/** Hard steps with the shadow band lifted so large walls do not crush to black. */
export function makeToonGradient(stops = [68, 128, 192, 255]) {
  const data = new Uint8Array(stops.length * 4);
  stops.forEach((v, i) => {
    data[i * 4] = v;
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

function glowOf(src) {
  return src?.userData?.glow || null;
}

export function toToonMaterial(src) {
  const color = colorFromMaterial(src);
  const glow = glowOf(src);
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    emissive: glow ? new THREE.Color(glow.color) : new THREE.Color(0x000000),
    emissiveIntensity: glow ? glow.intensity : 0,
    side: (src && src.side) || THREE.FrontSide,
  });
  if (src && src.transparent) {
    m.transparent = true;
    m.opacity = src.opacity ?? 1;
    m.depthWrite = src.depthWrite !== false;
  }
  if (src && src.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = src.polygonOffsetFactor;
    m.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  if (glow) m.userData.glow = glow;
  return m;
}

export function toUnlitMaterial(src) {
  const color = colorFromMaterial(src);
  const glow = glowOf(src);
  if (glow) color.lerp(new THREE.Color(glow.color), 0.72);
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
    m.polygonOffsetFactor = src.polygonOffsetFactor;
    m.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  if (glow) m.userData.glow = glow;
  return m;
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh || obj.userData.skipShade) return;
    const quiet = !!obj.userData.noShadow;
    obj.castShadow = !quiet && obj.userData.castShadow !== false;
    obj.receiveShadow = !quiet && obj.userData.receiveShadow !== false;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
    const originals = materialBackup.get(obj);
    const next = originals.map((src) => (mode === 'toon' ? toToonMaterial(src) : toUnlitMaterial(src)));
    obj.material = Array.isArray(obj.material) ? next : next[0];
  });
}

export function prepareAsset(scene, targetHeight, fit = 'floor') {
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
  if (fit === 'center') {
    scene.position.sub(center);
  } else {
    scene.position.x -= center.x;
    scene.position.z -= center.z;
    scene.position.y -= box.min.y;
  }
  scene.updateWorldMatrix(true, true);
  return outer;
}

export function toon(color, opts = {}) {
  const glow = opts.emissive
    ? { color: opts.emissive, intensity: opts.emissiveIntensity ?? 0.85 }
    : null;
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient,
    map: opts.map || null,
    emissive: glow ? new THREE.Color(glow.color) : new THREE.Color(0x000000),
    emissiveIntensity: glow ? glow.intensity : 0,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    depthWrite: opts.depthWrite !== false,
    side: opts.side || THREE.FrontSide,
    polygonOffset: !!opts.polygonOffset,
    polygonOffsetFactor: opts.polygonOffsetFactor ?? 0,
    polygonOffsetUnits: opts.polygonOffsetUnits ?? 0,
  });
  if (glow) m.userData.glow = glow;
  return m;
}

export function addBox(g, w, h, d, mat, x, y, z, rotY = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
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

function recolor(node, hex) {
  node.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const next = mats.map((m) => {
      const c = m.clone();
      c.color = new THREE.Color(hex);
      return c;
    });
    obj.material = Array.isArray(obj.material) ? next : next[0];
  });
}

function colorOf(value) {
  if (typeof value === 'string') return new THREE.Color(value);
  return new THREE.Color(value);
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  let shadingMode = 'toon';

  setStatus('loading layout…');
  const layout = await fetch('./layout.json').then((r) => r.json());
  const manifest = opts.manifest
    ? await fetch(opts.manifest).then((r) => r.json())
    : null;
  opts.transformLayout?.(layout, manifest);

  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const clear = (layout.shell && layout.shell.clearColor) || '#d7d2c8';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(layout.shell?.fogColor || clear, layout.shell?.fogNear ?? 18, layout.shell?.fogFar ?? 42);

  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.08, 80);
  camera.position.set(...cam.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 0.8;
  controls.maxDistance = 26;
  controls.update();

  const hemi = layout.lights.hemi;
  scene.add(new THREE.HemisphereLight(colorOf(hemi.sky), colorOf(hemi.ground), hemi.intensity));
  const keySpec = layout.lights.key;
  const key = new THREE.DirectionalLight(colorOf(keySpec.color), keySpec.intensity);
  key.position.set(...keySpec.position);
  key.castShadow = true;
  const sh = layout.lights.shadow;
  key.shadow.mapSize.set(sh.mapSize, sh.mapSize);
  key.shadow.camera.near = sh.near;
  key.shadow.camera.far = sh.far;
  key.shadow.camera.left = -sh.extent;
  key.shadow.camera.right = sh.extent;
  key.shadow.camera.top = sh.extent;
  key.shadow.camera.bottom = -sh.extent;
  key.shadow.bias = sh.bias;
  key.shadow.normalBias = sh.normalBias;
  key.shadow.camera.updateProjectionMatrix();
  scene.add(key);
  const fillSpec = layout.lights.fill;
  const fill = new THREE.DirectionalLight(colorOf(fillSpec.color), fillSpec.intensity);
  fill.position.set(...fillSpec.position);
  scene.add(fill);
  for (const p of layout.lights.points || []) {
    const pl = new THREE.PointLight(colorOf(p.color), p.intensity, p.distance, p.decay ?? 2);
    pl.position.set(...p.position);
    scene.add(pl);
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
  try {
    await Promise.all(kinds.map(async (kind) => {
      const spec = layout.assets[kind];
      const gltf = await loader.loadAsync(spec.glb);
      const prepared = prepareAsset(gltf.scene, spec.targetHeight, spec.fit || 'floor');
      applyShading(prepared, shadingMode);
      prototypes[kind] = prepared;
    }));
  } catch (err) {
    setStatus(`asset failed — ${err.message || err}`);
    throw err;
  }

  const props = new THREE.Group();
  props.name = 'props';
  scene.add(props);
  for (const inst of layout.instances || []) {
    const proto = prototypes[inst.kind];
    if (!proto) continue;
    const node = proto.clone(true);
    node.position.set(inst.position[0], inst.position[1], inst.position[2]);
    if (inst.tint) recolor(node, inst.tint);
    if (inst.kind === 'foley_shoe' || inst.kind === 'foley_shoe_r') {
      node.traverse((obj) => {
        if (obj.isMesh) obj.userData.noShadow = true;
      });
    }
    if (inst.aim) {
      const dir = new THREE.Vector3(...inst.aim).sub(node.position);
      if (dir.lengthSq() > 1e-8) node.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.normalize());
    } else if (inst.lookAt) {
      node.rotation.y = rotationFor(inst.modelForward || 'posZ', inst.position, inst.lookAt);
    } else if (inst.rotationY) node.rotation.y = inst.rotationY;
    if (Array.isArray(inst.scale)) node.scale.multiply(new THREE.Vector3(...inst.scale));
    node.name = inst.id;
    node.userData.kind = inst.kind;
    applyShading(node, shadingMode);
    props.add(node);
  }

  opts.onReady?.({ scene, props, layout, manifest, camera, controls, renderer });
  setStatus(opts.readyText || 'ready — foley stage · T toon · U unlit');

  function setMode(mode) {
    shadingMode = mode;
    applyShading(shell, mode);
    applyShading(procedural, mode);
    applyShading(props, mode);
    const modeEl = document.getElementById('mode');
    if (modeEl) modeEl.textContent = mode.toUpperCase();
  }

  const params = new URLSearchParams(location.search);
  if (params.get('clean') === '1') document.body.classList.add('clean');
  if (params.get('mode') === 'unlit') setMode('unlit');
  const camKey = params.get('cam');
  if (camKey && layout.cameraPresets?.[camKey]) {
    const p = layout.cameraPresets[camKey];
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

  window.__scene = { renderer, scene, camera, controls, setMode, layout, manifest, gradient: toonGradient, props };

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
