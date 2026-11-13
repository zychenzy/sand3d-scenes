import * as THREE from 'three';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

export function makeToonGradient(stops = [28, 92, 168, 255]) {
  const steps = stops.length;
  const data = new Uint8Array(steps * 4);
  for (let i = 0; i < steps; i++) {
    const v = stops[i];
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

export const toonGradient = makeToonGradient();
const materialBackup = new WeakMap();

function colorFromMaterial(mat) {
  if (!mat) return new THREE.Color(0xaaaaaa);
  if (mat.color && mat.color.isColor) return mat.color.clone();
  return new THREE.Color(0xaaaaaa);
}

function emissiveInfo(src) {
  const data = src && src.userData;
  if (!data || !data.emissive) return null;
  return { color: data.emissive, intensity: data.emissiveIntensity ?? 0.8 };
}

export function toToonMaterial(src) {
  const color = colorFromMaterial(src);
  const em = emissiveInfo(src);
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
  });
  if (em) {
    m.emissive = new THREE.Color(em.color);
    m.emissiveIntensity = em.intensity;
    m.userData.emissive = em.color;
    m.userData.emissiveIntensity = em.intensity;
  }
  return m;
}

export function toUnlitMaterial(src) {
  const em = emissiveInfo(src);
  const color = em ? new THREE.Color(em.color) : colorFromMaterial(src);
  return new THREE.MeshBasicMaterial({
    color,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
  });
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh || obj.userData.noShade) return;
    obj.castShadow = obj.userData.castShadow !== false;
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

export function toon(color, opts = {}) {
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
  });
  if (opts.emissive) {
    m.emissive = new THREE.Color(opts.emissive);
    m.emissiveIntensity = opts.emissiveIntensity ?? 0.8;
    m.userData.emissive = opts.emissive;
    m.userData.emissiveIntensity = opts.emissiveIntensity ?? 0.8;
  }
  return m;
}

function mark(mesh, mat) {
  mesh.castShadow = !(mat && mat.transparent && mat.opacity < 0.92);
  mesh.receiveShadow = true;
  if (mat && mat.transparent && mat.opacity < 0.92) mesh.userData.castShadow = false;
  return mesh;
}

export function addBox(g, w, h, d, mat, x, y, z) {
  const m = mark(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), mat);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 16) {
  const m = mark(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat), mat);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

export function addSphere(g, r, mat, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = mark(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat), mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  g.add(m);
  return m;
}

export function addCone(g, r, h, mat, x, y, z, seg = 10) {
  const m = mark(new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat), mat);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

export function addTorus(g, radius, tube, mat, x, y, z, rotZ = 0) {
  const m = mark(new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 16), mat), mat);
  m.position.set(x, y, z);
  m.rotation.z = rotZ;
  g.add(m);
  return m;
}

function asColor(c) {
  if (c == null) return new THREE.Color(0xffffff);
  return new THREE.Color(c);
}

function cloneMaterials(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (Array.isArray(obj.material)) obj.material = obj.material.map((m) => m.clone());
    else if (obj.material) obj.material = obj.material.clone();
  });
}

function recolor(root, hex) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => {
      if (m && m.color) m.color.set(hex);
    });
  });
}

const CONTACT_SKIP = new Set(['pendant_lamp', 'wall_shelf', 'library_lamp', 'jam_jar', 'straw_holder']);

function addContact(g, x, y, z, rx, rz) {
  const geo = new THREE.CircleGeometry(1, 24);
  const tight = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color: 0x1c140e, transparent: true, opacity: 0.2, depthWrite: false }),
  );
  tight.rotation.x = -Math.PI / 2;
  tight.position.set(x, y, z);
  tight.scale.set(Math.max(rx, 0.05), Math.max(rz, 0.05), 1);
  tight.userData.noShade = true;
  tight.castShadow = false;
  tight.receiveShadow = false;
  g.add(tight);
  const ao = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color: 0x24180f, transparent: true, opacity: 0.09, depthWrite: false }),
  );
  ao.rotation.x = -Math.PI / 2;
  ao.position.set(x, y + 0.001, z);
  ao.scale.set(Math.max(rx, 0.05) * 1.45, Math.max(rz, 0.05) * 1.45, 1);
  ao.userData.noShade = true;
  ao.castShadow = false;
  ao.receiveShadow = false;
  g.add(ao);
}

export async function boot(opts) {
  window.__errors = window.__errors || [];
  window.addEventListener('error', (e) => {
    window.__errors.push(String(e.message || e.error || 'error'));
  });
  window.addEventListener('unhandledrejection', (e) => {
    window.__errors.push(String(e.reason && e.reason.stack || e.reason || 'rejection'));
  });
  const statusEl = document.getElementById('status');
  const setStatus = (t) => {
    if (statusEl) statusEl.textContent = t;
  };
  let shadingMode = 'toon';

  setStatus('loading layout…');
  const layout = await fetch('./layout.json').then((r) => {
    if (!r.ok) throw new Error(`layout.json ${r.status}`);
    return r.json();
  });

  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFHardShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const clear = (layout.shell && layout.shell.clearColor) || '#d4dce2';
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
  controls.minDistance = 1.2;
  controls.maxDistance = 34;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: '#fff0dd', ground: '#5a6a58', intensity: 0.55 };
  scene.add(new THREE.HemisphereLight(asColor(hemi.sky), asColor(hemi.ground), hemi.intensity));
  const keySpec = layout.lights?.key || { color: '#fff4e8', intensity: 1.35, position: [6.5, 11, 4.5] };
  const key = new THREE.DirectionalLight(asColor(keySpec.color), keySpec.intensity);
  key.position.set(...keySpec.position);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.4;
  key.shadow.camera.far = 48;
  key.shadow.camera.left = -12;
  key.shadow.camera.right = 12;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -12;
  key.shadow.bias = -0.00045;
  key.shadow.normalBias = 0.035;
  key.shadow.camera.updateProjectionMatrix();
  scene.add(key);
  const fillSpec = layout.lights?.fill || { color: '#b8c8e0', intensity: 0.35, position: [-5, 6, 3] };
  const fill = new THREE.DirectionalLight(asColor(fillSpec.color), fillSpec.intensity);
  fill.position.set(...fillSpec.position);
  scene.add(fill);
  if (layout.lights?.points) {
    for (const p of layout.lights.points) {
      const pl = new THREE.PointLight(asColor(p.color || '#ffd8a8'), p.intensity ?? 0.5, p.distance ?? 8, p.decay ?? 2);
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
      let gltf;
      try {
        gltf = await loader.loadAsync(spec.glb);
      } catch (err) {
        setStatus(`failed ${kind}: ${spec.glb}`);
        throw err;
      }
      const prepared = prepareAsset(gltf.scene, spec.targetHeight);
      if (opts.onBeforeShade) opts.onBeforeShade(kind, prepared, spec);
      applyShading(prepared, shadingMode);
      prototypes[kind] = prepared;
    }),
  );

  const props = new THREE.Group();
  props.name = 'props';
  scene.add(props);
  const bounds = {};
  for (const inst of layout.instances || []) {
    if (inst.procedural) continue;
    const proto = prototypes[inst.kind];
    if (!proto) {
      setStatus(`missing kind ${inst.kind}`);
      continue;
    }
    const node = proto.clone(true);
    cloneMaterials(node);
    if (inst.tint) recolor(node, inst.tint);
    applyShading(node, shadingMode);
    node.position.set(inst.position[0], inst.position[1], inst.position[2]);
    if (inst.rotationY) node.rotation.y = inst.rotationY;
    if (Array.isArray(inst.scale)) {
      if (inst.scale.length === 3) node.scale.multiply(new THREE.Vector3(...inst.scale));
      else node.scale.multiplyScalar(inst.scale[0]);
    } else if (inst.scale) node.scale.multiplyScalar(inst.scale);
    node.name = inst.id;
    node.updateWorldMatrix(true, true);
    props.add(node);
    const box = new THREE.Box3().setFromObject(node);
    bounds[inst.id] = {
      kind: inst.kind,
      min: box.min.toArray(),
      max: box.max.toArray(),
    };
  }

  const contacts = new THREE.Group();
  contacts.name = 'contacts';
  for (const inst of layout.instances || []) {
    if (inst.procedural || CONTACT_SKIP.has(inst.kind)) continue;
    const b = bounds[inst.id];
    if (!b) continue;
    const minY = b.min[1];
    if (minY > 0.55) continue;
    const sx = b.max[0] - b.min[0];
    const sz = b.max[2] - b.min[2];
    addContact(
      contacts,
      (b.min[0] + b.max[0]) / 2,
      minY + 0.008,
      (b.min[2] + b.max[2]) / 2,
      sx * 0.42,
      sz * 0.42,
    );
  }
  scene.add(contacts);

  setStatus(opts.readyText || 'ready — drag orbit · U unlit · T toon');

  function setMode(mode) {
    shadingMode = mode;
    applyShading(shell, mode);
    applyShading(procedural, mode);
    applyShading(props, mode);
    const modeEl = document.getElementById('mode');
    if (modeEl) modeEl.textContent = mode.toUpperCase();
    window.__shading = mode;
  }

  const params = new URLSearchParams(location.search);
  if (params.get('hud') === '0') {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
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

  window.__shading = shadingMode;
  window.__scene = { renderer, scene, camera, controls, setMode, layout, bounds, props, shell, procedural };
  if (opts.onReady) opts.onReady({ renderer, scene, camera, layout, bounds, props, shell, procedural, shadingMode });
  window.__ready = true;

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
