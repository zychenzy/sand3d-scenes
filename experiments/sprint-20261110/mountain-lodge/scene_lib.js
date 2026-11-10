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
  if (!src) return m;
  if (src.transparent) {
    m.transparent = true;
    m.opacity = src.opacity ?? 1;
  }
  if (src.depthWrite === false) m.depthWrite = false;
  if (src.emissive && src.emissive.isColor) {
    const e = src.emissive;
    if (e.r + e.g + e.b > 0.02 && m.emissive) {
      m.emissive.copy(e);
      m.emissiveIntensity = src.emissiveIntensity ?? 1;
    }
  }
  return m;
}

export function toToonMaterial(src) {
  const color = colorFromMaterial(src);
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
  });
  return copySurface(src, m);
}

export function toUnlitMaterial(src) {
  const color = colorFromMaterial(src);
  if (src && src.emissive && src.emissive.isColor && (src.emissiveIntensity ?? 1) > 0.15) {
    const e = src.emissive;
    if (e.r + e.g + e.b > 0.15) color.lerp(e, 0.72);
  }
  return new THREE.MeshBasicMaterial({
    color,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: src && src.depthWrite === false ? false : true,
  });
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh || obj.userData.noShade) return;
    obj.castShadow = !obj.userData.noCast;
    obj.receiveShadow = !obj.userData.noReceive;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
    const originals = materialBackup.get(obj);
    const next = originals.map((src) => (mode === 'toon' ? toToonMaterial(src) : toUnlitMaterial(src)));
    obj.material = Array.isArray(obj.material) ? next : next[0];
  });
}

/** Edit the materials that shading modes rebuild from. */
export function editSourceMaterials(root, fn) {
  root.traverse((obj) => {
    if (!obj.isMesh || obj.userData.noShade) return;
    const originals = materialBackup.get(obj);
    if (!originals) return;
    for (const src of originals) fn(src, obj);
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
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
  });
  if (opts.noCast) m.userData.noCast = true;
  if (opts.noReceive) m.userData.noReceive = true;
  if (opts.noShade) m.userData.noShade = true;
  return m;
}

function flagMesh(mesh, mat) {
  mesh.castShadow = !mat?.userData?.noCast;
  mesh.receiveShadow = !mat?.userData?.noReceive;
  if (mat?.userData?.noCast) mesh.userData.noCast = true;
  if (mat?.userData?.noReceive) mesh.userData.noReceive = true;
  if (mat?.userData?.noShade) mesh.userData.noShade = true;
}

export function addBox(g, w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  flagMesh(m, mat);
  g.add(m);
  return m;
}

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
  flagMesh(m, mat);
  g.add(m);
  return m;
}

export function addCone(g, r, h, mat, x, y, z, seg = 10) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat);
  m.position.set(x, y, z);
  flagMesh(m, mat);
  g.add(m);
  return m;
}

/** Soft contact disc. Stays unlit so it reads as AO in both modes. */
export function contactBlob(g, x, z, rx = 0.28, rz = 0.28, opacity = 0.34) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x1a100c,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  mat.userData.noShade = true;
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 22), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.036, z);
  m.scale.set(rx, rz, 1);
  m.userData.noShade = true;
  m.userData.noCast = true;
  m.renderOrder = 2;
  g.add(m);
  return m;
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  try {
    await bootInner(opts, setStatus);
  } catch (err) {
    console.error(err);
    setStatus('error: ' + (err && err.message ? err.message : err));
    window.__sceneError = String(err && err.stack || err);
  }
}

async function bootInner(opts, setStatus) {
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
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.06, 80);
  camera.position.set(...cam.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 1.15;
  controls.maxDistance = 28;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: 0xfff0dd, ground: 0x5a6a58, intensity: 0.55 };
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
  const keySpec = layout.lights?.key || { color: 0xfff4e8, intensity: 1.35, position: [6.5, 11, 4.5] };
  const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
  key.position.set(...keySpec.position);
  if (keySpec.target) key.target.position.set(...keySpec.target);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 40;
  const ext = keySpec.shadowExtent ?? 12;
  key.shadow.camera.left = -ext;
  key.shadow.camera.right = ext;
  key.shadow.camera.top = ext;
  key.shadow.camera.bottom = -ext;
  key.shadow.bias = keySpec.bias ?? -0.00045;
  key.shadow.normalBias = keySpec.normalBias ?? 0.025;
  scene.add(key);
  scene.add(key.target);
  const fillSpec = layout.lights?.fill || { color: 0xb8c8e0, intensity: 0.35, position: [-5, 6, 3] };
  const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
  fill.position.set(...fillSpec.position);
  if (fillSpec.target) {
    fill.target.position.set(...fillSpec.target);
    scene.add(fill.target);
  }
  scene.add(fill);
  if (layout.lights?.points) {
    for (const p of layout.lights.points) {
      const pl = new THREE.PointLight(p.color || 0xffd8a8, p.intensity ?? 0.5, p.distance ?? 12, p.decay ?? 2);
      pl.position.set(...p.position);
      scene.add(pl);
    }
  }
  if (layout.lights?.spots) {
    for (const s of layout.lights.spots) {
      const sp = new THREE.SpotLight(
        s.color || 0xffaa66,
        s.intensity ?? 2,
        s.distance ?? 9,
        s.angle ?? 0.7,
        s.penumbra ?? 0.45,
        s.decay ?? 2,
      );
      sp.position.set(...s.position);
      sp.target.position.set(...(s.target || [0, 0.5, 0]));
      if (s.castShadow) {
        sp.castShadow = true;
        sp.shadow.mapSize.set(1024, 1024);
        sp.shadow.bias = s.bias ?? -0.0006;
        sp.shadow.normalBias = 0.03;
        sp.shadow.camera.near = 0.25;
        sp.shadow.camera.far = s.distance ?? 10;
      }
      scene.add(sp);
      scene.add(sp.target);
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
      applyShading(prepared, shadingMode);
      if (opts.decoratePrototype) opts.decoratePrototype(kind, prepared, spec);
      applyShading(prepared, shadingMode);
      prototypes[kind] = prepared;
    }),
  );

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

  if (params.get('debug') === '1') {
    const lines = [];
    for (const inst of layout.instances || []) {
      const obj = props.getObjectByName(inst.id);
      if (!obj) continue;
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      lines.push(`${inst.id} ${size.x.toFixed(2)}×${size.y.toFixed(2)}×${size.z.toFixed(2)} y0=${box.min.y.toFixed(2)}`);
    }
    console.log(lines.join('\n'));
    window.__bounds = lines;
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

  window.__scene = { renderer, scene, camera, controls, setMode, layout, props };
  window.__sceneReady = true;

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
