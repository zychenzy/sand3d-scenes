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

export function toToonMaterial(src) {
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
  return m;
}

export function toUnlitMaterial(src) {
  const color = colorFromMaterial(src);
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
    if (!obj.isMesh) return;
    obj.castShadow = !obj.userData.noCast;
    obj.receiveShadow = !obj.userData.noReceive;
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
    map: opts.map || null,
    gradientMap: toonGradient,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
  });
}

export function skyTexture(top, mid, horizon) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, top);
  grd.addColorStop(0.52, mid);
  grd.addColorStop(1, horizon);
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function addLight(scene, SpecCtor, spec, cast) {
  const light = new SpecCtor(spec.color, spec.intensity);
  light.position.set(...spec.position);
  if (cast) {
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 42;
    light.shadow.camera.left = -14;
    light.shadow.camera.right = 14;
    light.shadow.camera.top = 14;
    light.shadow.camera.bottom = -14;
    light.shadow.bias = -0.0004;
    light.shadow.normalBias = 0.035;
    if (spec.target) {
      light.target.position.set(...spec.target);
      scene.add(light.target);
    }
  }
  scene.add(light);
  return light;
}

/** Upward rays: open sky over the court, cover only where the arcade roof should be. */
export function auditSky(scene, layout) {
  const raycaster = new THREE.Raycaster();
  const dir = new THREE.Vector3(0, 1, 0);
  const results = [];
  for (const spec of layout.auditRays || []) {
    raycaster.set(new THREE.Vector3(...spec.origin), dir);
    raycaster.far = 24;
    const hits = raycaster.intersectObjects(scene.children, true);
    const blockers = hits.filter((h) => h.object.visible && !h.object.userData.skyIgnore && h.distance > 0.05);
    const covered = blockers.length > 0;
    const hit = blockers[0];
    results.push({
      name: spec.name,
      expect: spec.expect,
      covered,
      hit: hit ? (hit.object.name || hit.object.parent?.name || hit.object.type) : null,
      distance: hit ? Math.round(hit.distance * 100) / 100 : null,
      ok: (spec.expect === 'covered') === covered,
    });
  }
  return results;
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
  renderer.shadowMap.type = THREE.PCFHardShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const clear = (layout.shell && layout.shell.clearColor) || '#d5e4f0';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  const shellSpec = layout.shell || {};
  if (shellSpec.skyTop) {
    scene.background = skyTexture(
      shellSpec.skyTop,
      shellSpec.skyMid || '#c5d6ea',
      shellSpec.skyHorizon || '#f3dcc4',
    );
  }
  scene.fog = new THREE.Fog(
    shellSpec.fogColor || '#ead7c0',
    shellSpec.fogNear ?? 20,
    shellSpec.fogFar ?? 48,
  );

  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.08, 90);
  camera.position.set(...cam.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = 1.2;
  controls.maxDistance = 32;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: '#fff0dd', ground: '#b08960', intensity: 0.5 };
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
  const key = addLight(scene, THREE.DirectionalLight, layout.lights.key, true);
  if (layout.lights.fill) addLight(scene, THREE.DirectionalLight, layout.lights.fill, false);
  if (layout.lights.bounce) addLight(scene, THREE.DirectionalLight, layout.lights.bounce, false);

  const built = opts.makeShell(layout);
  scene.add(built);
  applyShading(built, shadingMode);

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
      if (spec.tint) {
        gltf.scene.traverse((obj) => {
          if (!obj.isMesh || !obj.material) return;
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) if (m.color) m.color.set(spec.tint);
        });
      }
      const prepared = prepareAsset(gltf.scene, spec.targetHeight);
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
    node.userData.kind = inst.kind;
    props.add(node);
  }

  const checks = auditSky(scene, layout);
  const failed = checks.filter((c) => !c.ok);

  setStatus(opts.readyText || 'ready — drag orbit · U unlit · T toon');

  function setMode(mode) {
    shadingMode = mode;
    applyShading(built, mode);
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

  window.__scene = {
    renderer,
    scene,
    camera,
    controls,
    setMode,
    layout,
    checks,
    key,
    openSky: layout.meta?.openSky === true && layout.meta?.ceiling === false,
  };
  if (failed.length) {
    console.warn('sky audit failed', failed);
  }

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
