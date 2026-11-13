import * as THREE from 'three';
import { OrbitControls } from '../../../library/vendor/controls/OrbitControls.js';
import { GLTFLoader } from '../../../library/vendor/loaders/GLTFLoader.js';

/** Hard 4-stop ramp. Nearest sampling keeps the steps from blending. */
const STOPS = [58, 122, 186, 255];

function makeToonGradient() {
  const data = new Uint8Array(STOPS.length * 4);
  for (let i = 0; i < STOPS.length; i++) {
    data[i * 4] = STOPS[i];
    data[i * 4 + 1] = STOPS[i];
    data[i * 4 + 2] = STOPS[i];
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, STOPS.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

export const toonGradient = makeToonGradient();
const materialBackup = new WeakMap();

function colorFromMaterial(mat) {
  if (mat?.color?.isColor) return mat.color.clone();
  return new THREE.Color(0xaaaaaa);
}

export function toToonMaterial(src) {
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
    gradientMap: toonGradient,
    map: src?.map || null,
    side: src?.side ?? THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: src ? src.depthWrite !== false : true,
  });
  if (src?.emissive?.isColor && (src.emissiveIntensity ?? 0) > 0) {
    m.emissive = src.emissive.clone();
    m.emissiveIntensity = src.emissiveIntensity ?? 1;
  }
  if (src?.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = src.polygonOffsetFactor;
    m.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  return m;
}

export function toUnlitMaterial(src) {
  let color = colorFromMaterial(src);
  if (src?.emissive?.isColor && (src.emissiveIntensity ?? 0) > 0.12) {
    color = color.clone().lerp(src.emissive, 0.72);
  }
  const m = new THREE.MeshBasicMaterial({
    color,
    map: src?.map || null,
    side: src?.side ?? THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: src ? src.depthWrite !== false : true,
  });
  if (src?.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = src.polygonOffsetFactor;
    m.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  return m;
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh || obj.userData.unshaded) return;
    const quiet = !!obj.userData.noShadow;
    obj.castShadow = !quiet;
    obj.receiveShadow = !quiet;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
    const originals = materialBackup.get(obj);
    const next = originals.map((src) => (mode === 'toon' ? toToonMaterial(src) : toUnlitMaterial(src)));
    obj.material = Array.isArray(obj.material) ? next : next[0];
  });
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
  });
  if (opts.emissive) {
    m.emissive = new THREE.Color(opts.emissive);
    m.emissiveIntensity = opts.emissiveIntensity ?? 1;
  }
  if (opts.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = opts.polygonOffsetFactor ?? -1;
    m.polygonOffsetUnits = opts.polygonOffsetUnits ?? -1;
  }
  return m;
}

export function addBox(g, w, h, d, mat, x, y, z, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  if (opts.rotY) mesh.rotation.y = opts.rotY;
  if (opts.shadow === false) mesh.userData.noShadow = true;
  mesh.castShadow = opts.shadow !== false;
  mesh.receiveShadow = opts.shadow !== false;
  if (opts.name) mesh.name = opts.name;
  if (opts.userData) Object.assign(mesh.userData, opts.userData);
  g.add(mesh);
  return mesh;
}

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 12, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  mesh.position.set(x, y, z);
  if (opts.rotX) mesh.rotation.x = opts.rotX;
  if (opts.rotZ) mesh.rotation.z = opts.rotZ;
  if (opts.shadow === false) mesh.userData.noShadow = true;
  mesh.castShadow = opts.shadow !== false;
  mesh.receiveShadow = opts.shadow !== false;
  if (opts.name) mesh.name = opts.name;
  g.add(mesh);
  return mesh;
}

export function canvasTexture(draw, w = 128, h = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function makeContactMaterial() {
  const tex = canvasTexture((ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.08, w / 2, h / 2, w * 0.48);
    g.addColorStop(0, 'rgba(30,24,18,0.45)');
    g.addColorStop(0.55, 'rgba(30,24,18,0.16)');
    g.addColorStop(1, 'rgba(30,24,18,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, 64, 64);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    color: 0x221810,
  });
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -2;
  mat.polygonOffsetUnits = -2;
  return mat;
}

export function addContact(parent, x, z, rx, rz, mat) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.012, z);
  mesh.userData.unshaded = true;
  mesh.userData.noShadow = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = 2;
  parent.add(mesh);
  return mesh;
}

function tintMeshes(root, tints) {
  if (!tints) return;
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const hex = tints[obj.name];
    if (!hex || !obj.material?.color) return;
    obj.material.color = new THREE.Color(hex);
    if (obj.material.emissive && tints[`${obj.name}Emissive`]) {
      obj.material.emissive = new THREE.Color(tints[`${obj.name}Emissive`]);
      obj.material.emissiveIntensity = 0.35;
    }
  });
}

export function prepareAsset(scene, spec) {
  const outer = new THREE.Group();
  outer.add(scene);
  scene.updateWorldMatrix(true, true);
  const size0 = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
  if (Array.isArray(spec.fit)) {
    scene.scale.set(
      spec.fit[0] / (size0.x || 1e-6),
      spec.fit[1] / (size0.y || 1e-6),
      spec.fit[2] / (size0.z || 1e-6),
    );
  } else {
    const s = (spec.targetHeight || 1) / (size0.y || 1e-6);
    scene.scale.setScalar(s);
  }
  scene.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(scene);
  const center = box.getCenter(new THREE.Vector3());
  scene.position.x += -center.x;
  scene.position.z += -center.z;
  scene.position.y += -box.min.y;
  scene.updateWorldMatrix(true, true);
  tintMeshes(scene, spec.tints);
  outer.userData.size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
  return outer;
}

export async function boot({ build }) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  const bootErrors = [];
  window.__bootErrors = bootErrors;
  window.addEventListener('error', (e) => bootErrors.push(String(e.message)));

  let shadingMode = 'toon';
  setStatus('loading layout…');
  const layout = await fetch('./layout.json').then((r) => r.json());
  const shellColors = layout.shell || {};

  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFHardShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const clear = shellColors.clearColor || '#d5d0c6';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(shellColors.fogColor || clear, shellColors.fogNear ?? 16, shellColors.fogFar ?? 36);

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

  const L = layout.lights || {};
  const hemi = L.hemi || { sky: 0xe7eef2, ground: 0x6a6258, intensity: 0.46 };
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));

  const keySpec = L.key || { color: 0xfff3e6, intensity: 0.78, position: [2.2, 8.2, 6.4] };
  const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
  key.position.set(...keySpec.position);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.4;
  key.shadow.camera.far = 28;
  const span = keySpec.shadowSpan || 12;
  key.shadow.camera.left = -span;
  key.shadow.camera.right = span;
  key.shadow.camera.top = span;
  key.shadow.camera.bottom = -span;
  key.shadow.bias = keySpec.bias ?? -0.00025;
  key.shadow.normalBias = keySpec.normalBias ?? 0.045;
  scene.add(key);
  if (L.fill) {
    const fill = new THREE.DirectionalLight(L.fill.color, L.fill.intensity);
    fill.position.set(...L.fill.position);
    scene.add(fill);
  }

  const contactMat = makeContactMaterial();
  const props = new THREE.Group();
  props.name = 'props';
  const api = {
    THREE,
    layout,
    toon,
    addBox,
    addCyl,
    canvasTexture,
    contact: (x, z, rx, rz) => addContact(props, x, z, rx, rz, contactMat),
    addLight: (light) => scene.add(light),
  };
  const built = build(api) || {};
  const roots = [built.shell, built.dressing, props].filter(Boolean);
  if (built.shell) scene.add(built.shell);
  if (built.dressing) scene.add(built.dressing);
  scene.add(props);
  for (const root of roots) applyShading(root, shadingMode);

  const loader = new GLTFLoader();
  const failed = [];
  const prototypes = {};
  const assetSizes = {};
  const kinds = Object.keys(layout.assets || {});
  setStatus(`loading ${kinds.length} models…`);
  await Promise.all(kinds.map(async (kind) => {
    const spec = layout.assets[kind];
    try {
      const gltf = await loader.loadAsync(spec.glb);
      const prepared = prepareAsset(gltf.scene, spec);
      applyShading(prepared, shadingMode);
      prototypes[kind] = prepared;
      assetSizes[kind] = {
        x: +prepared.userData.size.x.toFixed(3),
        y: +prepared.userData.size.y.toFixed(3),
        z: +prepared.userData.size.z.toFixed(3),
      };
    } catch (err) {
      failed.push(`${kind}: ${err.message || err}`);
    }
  }));

  for (const inst of layout.instances || []) {
    const proto = prototypes[inst.kind];
    if (!proto) {
      failed.push(`missing kind ${inst.kind} for ${inst.id}`);
      continue;
    }
    const node = proto.clone(true);
    applyShading(node, shadingMode);
    node.position.set(inst.position[0], inst.position[1], inst.position[2]);
    node.rotation.y = inst.rotationY || 0;
    node.name = inst.id;
    node.userData.kind = inst.kind;
    props.add(node);
    if (inst.contact) {
      addContact(props, inst.position[0], inst.position[2], inst.contact[0], inst.contact[1], contactMat);
    }
  }

  setStatus(failed.length ? `loaded with ${failed.length} errors` : (layout.meta?.readyText || 'ready'));

  function setMode(mode) {
    shadingMode = mode;
    for (const root of roots) applyShading(root, mode);
    const modeEl = document.getElementById('mode');
    if (modeEl) modeEl.textContent = mode.toUpperCase();
  }

  function setCamera(name) {
    const p = name === 'default' || !name ? layout.camera : (layout.cameraPresets || {})[name];
    if (!p) return;
    camera.position.set(...(p.position || layout.camera.position));
    controls.target.set(...(p.target || layout.camera.target));
    controls.update();
  }

  const params = new URLSearchParams(location.search);
  if (params.get('mode') === 'unlit') setMode('unlit');
  if (params.get('cam')) setCamera(params.get('cam'));
  if (params.get('hud') === '0') {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'u' || e.key === 'U') setMode('unlit');
    if (e.key === 't' || e.key === 'T') setMode('toon');
    if (e.key === '1') setCamera('default');
    if (e.key === '2') setCamera('corner');
    if (e.key === '3') setCamera('detail');
  });
  document.getElementById('btn-toon')?.addEventListener('click', () => setMode('toon'));
  document.getElementById('btn-unlit')?.addEventListener('click', () => setMode('unlit'));
  document.getElementById('btn-room')?.addEventListener('click', () => setCamera('default'));
  document.getElementById('btn-corner')?.addEventListener('click', () => setCamera('corner'));
  document.getElementById('btn-detail')?.addEventListener('click', () => setCamera('detail'));

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  let meshCount = 0;
  scene.traverse((o) => { if (o.isMesh) meshCount += 1; });
  window.__scene = {
    renderer,
    scene,
    camera,
    controls,
    setMode,
    setCamera,
    layout,
    ready: failed.length === 0,
    failed,
    assetSizes,
    meshCount,
    shadingMode: () => shadingMode,
  };

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
