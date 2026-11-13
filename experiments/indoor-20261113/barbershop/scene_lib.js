import * as THREE from 'three';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { yawForFront } from './facing.js';

export function makeToonGradient(stops) {
  const data = new Uint8Array(stops.length * 4);
  for (let i = 0; i < stops.length; i++) {
    const v = stops[i];
    data[i * 4 + 0] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, stops.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/** Four hard bands that stay above black so the shadow map, not the ramp, cuts the darks. */
export const toonGradient = makeToonGradient([82, 148, 204, 255]);
/** Three-step metal ramp: sharper break between shade and highlight. */
export const metalGradient = makeToonGradient([56, 176, 255]);

const materialBackup = new WeakMap();

function colorFromMaterial(mat) {
  if (!mat) return new THREE.Color(0xaaaaaa);
  if (mat.color && mat.color.isColor) return mat.color.clone();
  return new THREE.Color(0xaaaaaa);
}

function bandOf(src) {
  if (!src) return 'cloth';
  if (src.userData && src.userData.band) return src.userData.band;
  const name = (src.name || '').toLowerCase();
  if ((src.metalness || 0) > 0.42 || /steel|aluminium|aluminum|metal|chrome/.test(name)) return 'metal';
  return 'cloth';
}

export function toToonMaterial(src) {
  const band = bandOf(src);
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
    gradientMap: band === 'metal' ? metalGradient : toonGradient,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: !(src && src.depthWrite === false),
    emissive: src && src.emissive && src.emissive.isColor ? src.emissive.clone() : new THREE.Color(0x000000),
    emissiveIntensity: src && src.emissiveIntensity != null ? src.emissiveIntensity : 1,
  });
  m.name = src && src.name ? src.name : '';
  m.userData = { band, ...(src && src.userData ? src.userData : {}) };
  if (src && src.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = src.polygonOffsetFactor;
    m.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  return m;
}

export function toUnlitMaterial(src) {
  const color = colorFromMaterial(src);
  const glow = src && src.emissive && src.emissive.isColor ? src.emissive : null;
  if (glow && (src.emissiveIntensity || 0) > 0.15 && glow.r + glow.g + glow.b > 0.04) {
    color.lerp(glow, Math.min(1, src.emissiveIntensity * 0.65));
  }
  const m = new THREE.MeshBasicMaterial({
    color,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: !(src && src.depthWrite === false),
  });
  m.name = src && src.name ? src.name : '';
  if (src && src.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = src.polygonOffsetFactor;
    m.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  return m;
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
    const originals = materialBackup.get(obj);
    const next = originals.map((src) => (mode === 'toon' ? toToonMaterial(src) : toUnlitMaterial(src)));
    obj.material = Array.isArray(obj.material) ? next : next[0];
    const quiet = obj.userData && obj.userData.noShadow;
    obj.castShadow = !quiet;
    obj.receiveShadow = quiet ? !!obj.userData.receiveShadow : true;
  });
}

export function prepareAsset(scene, spec) {
  const targetHeight = typeof spec === 'number' ? spec : spec.targetHeight;
  const outer = new THREE.Group();
  outer.add(scene);
  scene.updateWorldMatrix(true, true);
  let box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  let s;
  if (spec && spec.fit === 'long') {
    const long = Math.max(size.x, size.y, size.z);
    s = (spec.targetLong || targetHeight) / (long || 1e-6);
  } else {
    s = targetHeight / (size.y || 1e-6);
  }
  scene.scale.setScalar(s);
  if (spec && spec.minAxis) {
    scene.updateWorldMatrix(true, true);
    box = new THREE.Box3().setFromObject(scene);
    box.getSize(size);
    const dims = [size.x, size.y, size.z];
    let axis = 0;
    if (dims[1] <= dims[0] && dims[1] <= dims[2]) axis = 1;
    else if (dims[2] <= dims[0] && dims[2] <= dims[1]) axis = 2;
    if (dims[axis] > 1e-6 && dims[axis] < spec.minAxis) {
      const f = spec.minAxis / dims[axis];
      if (axis === 0) scene.scale.x *= f;
      else if (axis === 1) scene.scale.y *= f;
      else scene.scale.z *= f;
    }
  }
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
    gradientMap: opts.band === 'metal' ? metalGradient : toonGradient,
    map: opts.map || null,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
    emissive: new THREE.Color(opts.emissive || 0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? (opts.emissive ? 1 : 0),
  });
  m.name = opts.name || '';
  m.userData.band = opts.band || 'cloth';
  if (opts.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = opts.polygonOffsetFactor ?? -1;
    m.polygonOffsetUnits = opts.polygonOffsetUnits ?? -1;
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

function liftDarkAlbedo(root) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m.color) continue;
      const name = `${obj.name} ${m.name || ''}`.toLowerCase();
      const c = m.color;
      const l = c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
      if (name.includes('leather') || (c.r > c.g * 1.6 && c.r > c.b * 1.4 && l < 0.16)) {
        c.lerp(new THREE.Color(0.45, 0.1, 0.07), 0.7);
      }
    }
  });
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  let shadingMode = 'toon';

  setStatus('loading layout…');
  const layout = await fetch('./layout.json').then((r) => r.json());

  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const clear = (layout.shell && layout.shell.clearColor) || '#d4dce2';
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
  controls.minDistance = 0.7;
  controls.maxDistance = 32;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: 0xfff0dd, ground: 0x5a6a58, intensity: 0.5 };
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
  const keySpec = layout.lights?.key || { color: 0xfff4e8, intensity: 1.45, position: [6, 10, 5], target: [0, 0.6, -1] };
  const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
  key.position.set(...keySpec.position);
  key.target.position.set(...(keySpec.target || [0, 0.5, -0.8]));
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 32;
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  key.shadow.bias = -0.0008;
  scene.add(key);
  scene.add(key.target);
  const fillSpec = layout.lights?.fill || { color: 0xc5d4e6, intensity: 0.32, position: [-5, 6, 4] };
  const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
  fill.position.set(...fillSpec.position);
  scene.add(fill);
  if (layout.lights?.points) {
    for (const p of layout.lights.points) {
      const pl = new THREE.PointLight(p.color || 0xffd8a8, p.intensity ?? 0.45, p.distance ?? 6, p.decay ?? 2);
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
  window.__errors = [];
  await Promise.all(
    kinds.map(async (kind) => {
      const spec = layout.assets[kind];
      try {
        const gltf = await loader.loadAsync(spec.glb);
        const prepared = prepareAsset(gltf.scene, spec);
        if (spec.liftDark) liftDarkAlbedo(prepared);
        applyShading(prepared, shadingMode);
        prototypes[kind] = prepared;
      } catch (err) {
        const msg = `${kind} failed (${spec.glb}): ${err && err.message ? err.message : err}`;
        window.__errors.push(msg);
        setStatus(msg);
        throw err;
      }
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
    let ry = inst.rotationY || 0;
    if (inst.lookAt && (inst.rotationY === undefined || inst.rotationY === null)) {
      const front = (layout.assets[inst.kind] && layout.assets[inst.kind].front) || '+Z';
      ry = yawForFront(front, inst.lookAt[0] - inst.position[0], inst.lookAt[1] - inst.position[2]);
    }
    if (ry) node.rotation.y = ry;
    if (Array.isArray(inst.scale)) {
      if (inst.scale.length === 3) node.scale.multiply(new THREE.Vector3(...inst.scale));
      else node.scale.multiplyScalar(inst.scale[0]);
    } else if (inst.scale) node.scale.multiplyScalar(inst.scale);
    node.name = inst.id;
    if (inst.castShadow === false) {
      node.traverse((obj) => {
        if (obj.isMesh) {
          obj.userData.noShadow = true;
          obj.castShadow = false;
        }
      });
    }
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
  if (params.get('shot') === '1') {
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
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  window.__scene = { renderer, scene, camera, controls, setMode, layout };
  window.__ready = true;
  if (window.__errors.length) setStatus(window.__errors.join(' | '));

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
