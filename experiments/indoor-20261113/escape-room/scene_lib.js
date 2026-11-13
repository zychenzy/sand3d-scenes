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

export function colorValue(c) {
  if (c == null) return new THREE.Color(0xffffff);
  if (c.isColor) return c;
  return new THREE.Color(c);
}

function colorFromMaterial(mat) {
  if (!mat) return new THREE.Color(0xaaaaaa);
  if (mat.color && mat.color.isColor) return mat.color.clone();
  return new THREE.Color(0xaaaaaa);
}

function copySurface(dst, src) {
  if (!src) return dst;
  if (src.emissive && src.emissive.isColor && dst.emissive) {
    dst.emissive.copy(src.emissive);
    dst.emissiveIntensity = src.emissiveIntensity ?? 1;
  }
  if (src.emissiveMap && dst.emissiveMap !== undefined) dst.emissiveMap = src.emissiveMap;
  if (src.userData) dst.userData = { ...src.userData };
  return dst;
}

export function toToonMaterial(src) {
  if (src && src.userData && src.userData.keepBasic) return toUnlitMaterial(src);
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
  if (src && src.depthWrite === false) m.depthWrite = false;
  if (src && src.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = src.polygonOffsetFactor;
    m.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  return copySurface(m, src);
}

/** True unlit: MeshBasicMaterial, no lights, no toon ramp. */
export function toUnlitMaterial(src) {
  const color = colorFromMaterial(src);
  const m = new THREE.MeshBasicMaterial({
    color,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: !src || src.depthWrite !== false,
  });
  if (src && src.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = src.polygonOffsetFactor;
    m.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  if (src && src.userData) m.userData = { ...src.userData };
  return m;
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const shadow = obj.userData.shadow || 'both';
    obj.castShadow = shadow === 'both' || shadow === 'cast';
    obj.receiveShadow = shadow === 'both' || shadow === 'receive';
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
  });
  if (opts.emissive) {
    m.emissive = colorValue(opts.emissive);
    m.emissiveIntensity = opts.emissiveIntensity ?? 0.4;
    if (opts.map) m.emissiveMap = opts.map;
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
  if (opts.shadow) mesh.userData.shadow = opts.shadow;
  if (opts.pick) mesh.userData.pick = opts.pick;
  if (opts.name) mesh.name = opts.name;
  if (opts.rotY) mesh.rotation.y = opts.rotY;
  g.add(mesh);
  return mesh;
}

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 16, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  mesh.position.set(x, y, z);
  if (opts.shadow) mesh.userData.shadow = opts.shadow;
  if (opts.pick) mesh.userData.pick = opts.pick;
  if (opts.rotX) mesh.rotation.x = opts.rotX;
  if (opts.rotY) mesh.rotation.y = opts.rotY;
  if (opts.rotZ) mesh.rotation.z = opts.rotZ;
  g.add(mesh);
  return mesh;
}

function tintPrepared(root, tint) {
  const color = colorValue(tint);
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => {
      if (m && m.color) m.color.copy(color);
    });
  });
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  window.__errors = window.__errors || [];
  window.addEventListener('error', (event) => {
    window.__errors.push(String(event.message || event.error || 'error'));
  });
  let shadingMode = 'toon';

  setStatus('loading layout…');
  const layout = await fetch('./layout.json').then((r) => r.json());

  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const clear = (layout.shell && layout.shell.clearColor) || '#d7e3ea';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  const fogCol = (layout.shell && layout.shell.fogColor) || clear;
  scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 16, layout.shell?.fogFar ?? 34);

  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.05, 80);
  camera.position.set(...cam.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 0.8;
  controls.maxDistance = 26;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: '#fff3e4', ground: '#6d8c86', intensity: 0.78 };
  scene.add(new THREE.HemisphereLight(colorValue(hemi.sky), colorValue(hemi.ground), hemi.intensity));
  const keySpec = layout.lights?.key || { color: '#fff4e6', intensity: 1.12, position: [7, 12, 6] };
  const key = new THREE.DirectionalLight(colorValue(keySpec.color), keySpec.intensity);
  key.position.set(...keySpec.position);
  key.castShadow = true;
  const mapSize = keySpec.mapSize || 2048;
  key.shadow.mapSize.set(mapSize, mapSize);
  key.shadow.camera.near = 0.4;
  key.shadow.camera.far = keySpec.far || 32;
  const sh = keySpec.shadow || {};
  key.shadow.camera.left = sh.left ?? -8;
  key.shadow.camera.right = sh.right ?? 8;
  key.shadow.camera.top = sh.top ?? 8;
  key.shadow.camera.bottom = sh.bottom ?? -8;
  key.shadow.bias = sh.bias ?? -0.00035;
  key.shadow.normalBias = sh.normalBias ?? 0.03;
  if (keySpec.target) key.target.position.set(...keySpec.target);
  scene.add(key.target);
  scene.add(key);
  const fillSpec = layout.lights?.fill || { color: '#c5d8ea', intensity: 0.42, position: [-7, 6, 2] };
  const fill = new THREE.DirectionalLight(colorValue(fillSpec.color), fillSpec.intensity);
  fill.position.set(...fillSpec.position);
  scene.add(fill);
  if (layout.lights?.points) {
    for (const p of layout.lights.points) {
      const pl = new THREE.PointLight(
        colorValue(p.color || '#ffe0b0'),
        p.intensity ?? 0.5,
        p.distance ?? 8,
        p.decay ?? 2,
      );
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
  setStatus(`loading ${kinds.length} models…`);
  await Promise.all(
    kinds.map(async (kind) => {
      const spec = layout.assets[kind];
      try {
        const gltf = await loader.loadAsync(spec.glb);
        const prepared = prepareAsset(gltf.scene, spec.targetHeight);
        if (spec.tint) tintPrepared(prepared, spec.tint);
        applyShading(prepared, shadingMode);
        prototypes[kind] = prepared;
      } catch (err) {
        const msg = `GLB failed ${kind}: ${err && err.message ? err.message : err}`;
        console.error(msg);
        window.__errors.push(msg);
      }
    }),
  );

  const props = new THREE.Group();
  props.name = 'props';
  scene.add(props);
  for (const inst of layout.instances || []) {
    const proto = prototypes[inst.kind];
    if (!proto) {
      const msg = `missing prototype ${inst.kind}`;
      console.error(msg);
      window.__errors.push(msg);
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
    node.userData.kind = inst.kind;
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
    opts.onMode?.(mode);
  }

  const params = new URLSearchParams(location.search);
  if (params.get('shot') === '1' || params.get('hud') === '0') {
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

  const api = {
    renderer, scene, camera, controls, setMode, layout, props, procedural, shell, setStatus,
  };
  window.__scene = api;
  opts.onReady?.(api);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'u' || e.key === 'U') setMode('unlit');
    if (e.key === 't' || e.key === 'T') setMode('toon');
    opts.onKey?.(e);
  });
  document.getElementById('btn-toon')?.addEventListener('click', () => setMode('toon'));
  document.getElementById('btn-unlit')?.addEventListener('click', () => setMode('unlit'));

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || !opts.onPick) return;
    const dx = e.clientX - down[0];
    const dy = e.clientY - down[1];
    down = null;
    if (dx * dx + dy * dy > 25) return;
    const rect = canvas.getBoundingClientRect();
    ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    opts.onPick(hits, api);
  });

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    opts.onFrame?.(dt, now / 1000, api);
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  window.__ready = true;
  window.__mode = () => shadingMode;
  tick(performance.now());
}
