import * as THREE from 'three';
import { OrbitControls } from '../../../workshop/vendor/controls/OrbitControls.js';
import { GLTFLoader } from '../../../workshop/vendor/loaders/GLTFLoader.js';

/** Four hard steps. The darkest stop is lifted so wool and walnut do not crush. */
export function makeToonGradient() {
  const stops = [0.22, 0.46, 0.72, 1];
  const data = new Uint8Array(stops.length * 4);
  for (let i = 0; i < stops.length; i++) {
    const v = Math.round(stops[i] * 255);
    data[i * 4 + 0] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, stops.length, 1, THREE.RGBAFormat);
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

export function toToonMaterial(src) {
  if (src && src.userData && src.userData.keep) return src;
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    normalMap: src && src.normalMap ? src.normalMap : null,
    normalScale: src && src.normalScale ? src.normalScale.clone() : new THREE.Vector2(1, 1),
    side: (src && src.side) || THREE.FrontSide,
    vertexColors: !!(src && src.vertexColors),
    emissive: src && src.emissive ? src.emissive.clone() : new THREE.Color(0x000000),
    emissiveIntensity: src && src.emissiveIntensity ? src.emissiveIntensity : 0,
  });
  if (src && src.transparent) {
    m.transparent = true;
    m.opacity = src.opacity ?? 1;
    m.depthWrite = src.depthWrite !== false;
  }
  return m;
}

function hasGlow(src) {
  if (!src || !src.emissive || !src.emissive.isColor) return false;
  if ((src.emissiveIntensity || 0) <= 0.2) return false;
  return (src.emissive.r + src.emissive.g + src.emissive.b) > 0.05;
}

/** True unlit: MeshBasicMaterial, no lights. Glow meshes keep their emissive color. */
export function toUnlitMaterial(src) {
  if (src && src.userData && src.userData.keep) return src;
  const glow = hasGlow(src);
  return new THREE.MeshBasicMaterial({
    color: glow ? src.emissive.clone() : colorFromMaterial(src),
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: src ? src.depthWrite !== false : true,
  });
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const quiet = !!(obj.userData && obj.userData.noShadow);
    obj.castShadow = !quiet;
    obj.receiveShadow = true;
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
    normalMap: opts.normalMap || null,
    normalScale: opts.normalScale || new THREE.Vector2(1, 1),
    gradientMap: toonGradient,
    emissive: new THREE.Color(opts.emissive || 0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
  });
  if (opts.keep) m.userData.keep = true;
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

function addDirectional(scene, spec, cast) {
  const light = new THREE.DirectionalLight(spec.color, spec.intensity);
  light.position.set(...spec.position);
  if (spec.target) {
    light.target.position.set(...spec.target);
    scene.add(light.target);
  }
  if (cast) {
    light.castShadow = true;
    const sh = spec.shadow || {};
    light.shadow.mapSize.set(sh.mapSize || 2048, sh.mapSize || 2048);
    light.shadow.camera.near = sh.near ?? 0.5;
    light.shadow.camera.far = sh.far ?? 36;
    light.shadow.camera.left = sh.left ?? -9;
    light.shadow.camera.right = sh.right ?? 9;
    light.shadow.camera.top = sh.top ?? 9;
    light.shadow.camera.bottom = sh.bottom ?? -9;
    light.shadow.bias = sh.bias ?? -0.00025;
    light.shadow.normalBias = sh.normalBias ?? 0.04;
    light.shadow.camera.updateProjectionMatrix();
  }
  scene.add(light);
  return light;
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  window.__errors = [];
  window.addEventListener('error', (e) => window.__errors.push(String(e.message)));
  window.addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason)));
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
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const clear = (layout.shell && layout.shell.clearColor) || '#c9d0d4';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  const fogCol = (layout.shell && layout.shell.fogColor) || clear;
  scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 24, layout.shell?.fogFar ?? 48);

  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.05, 80);
  camera.position.set(...cam.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 1.05;
  controls.maxDistance = 26;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: 0xf3efe6, ground: 0x6a5344, intensity: 0.4 };
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
  const keySpec = layout.lights?.key || { color: 0xfff1df, intensity: 1.25, position: [7, 9, 6] };
  addDirectional(scene, keySpec, true);
  if (layout.lights?.window) addDirectional(scene, layout.lights.window, false);
  if (layout.lights?.fill) addDirectional(scene, layout.lights.fill, false);
  if (layout.lights?.points) {
    for (const p of layout.lights.points) {
      const pl = new THREE.PointLight(p.color || 0xffc98a, p.intensity ?? 0.5, p.distance ?? 8, p.decay ?? 2);
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
  const failures = [];
  await Promise.all(
    kinds.map(async (kind) => {
      const spec = layout.assets[kind];
      try {
        const gltf = await loader.loadAsync(spec.glb);
        const prepared = prepareAsset(gltf.scene, spec.targetHeight);
        applyShading(prepared, shadingMode);
        prototypes[kind] = prepared;
      } catch (err) {
        failures.push(`${kind} (${spec.glb})`);
        console.error('GLB failed', kind, spec.glb, err);
      }
    })
  );
  if (failures.length) setStatus(`asset failed: ${failures.join(', ')}`);

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

  if (!failures.length) setStatus(opts.readyText || 'ready — drag orbit · U unlit · T toon');

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
  if (params.get('hud') === '0' || params.get('shot') === '1') {
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

  window.__scene = { renderer, scene, camera, controls, setMode, layout, failures };

  function renderFrame() {
    if (opts.beforeRender) opts.beforeRender({ renderer, scene, camera, mode: shadingMode });
    renderer.render(scene, camera);
  }

  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
  renderFrame();
  window.__ready = failures.length === 0;

  function tick() {
    controls.update();
    renderFrame();
    requestAnimationFrame(tick);
  }
  tick();
}
