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

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function colorFromMaterial(mat) {
  if (!mat) return new THREE.Color(0xaaaaaa);
  if (mat.color && mat.color.isColor) return mat.color.clone();
  return new THREE.Color(0xaaaaaa);
}

function copySurface(dst, src) {
  dst.fog = src ? src.fog !== false : true;
  if (src && src.depthWrite === false) dst.depthWrite = false;
  if (src && src.vertexColors) dst.vertexColors = true;
  return dst;
}

export function toToonMaterial(src) {
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
  });
  if (src && src.transparent) {
    m.transparent = true;
    m.opacity = src.opacity ?? 1;
  }
  return copySurface(m, src);
}

export function toUnlitMaterial(src) {
  const m = new THREE.MeshBasicMaterial({
    color: colorFromMaterial(src),
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
  });
  return copySurface(m, src);
}

function shadowModeOf(obj) {
  let o = obj;
  while (o) {
    if (o.userData && o.userData.forceBasic) return 'none';
    if (o.userData && o.userData.shadowMode) return o.userData.shadowMode;
    o = o.parent;
  }
  return 'cast';
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const shadowMode = shadowModeOf(obj);
    obj.castShadow = shadowMode === 'cast';
    obj.receiveShadow = shadowMode === 'cast' || shadowMode === 'receive';
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
    const originals = materialBackup.get(obj);
    const forceBasic = shadowModeOf(obj) === 'none' && obj.userData.forceBasic || parentForceBasic(obj);
    const next = originals.map((src) => (
      mode === 'toon' && !forceBasic ? toToonMaterial(src) : toUnlitMaterial(src)
    ));
    obj.material = Array.isArray(obj.material) ? next : next[0];
  });
}

function parentForceBasic(obj) {
  let o = obj;
  while (o) {
    if (o.userData && o.userData.forceBasic) return true;
    o = o.parent;
  }
  return false;
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
    map: opts.map || null,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
    fog: opts.fog !== false,
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

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

/** Cylinder or box stretched between two world points. */
export function addSpan(g, a, b, radius, mat, seg = 5) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = dir.length();
  if (len < 1e-4) return null;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, seg), mat);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  let shadingMode = 'toon';

  try {
    setStatus('loading layout…');
    const layout = await fetch('./layout.json').then((r) => r.json());

    const canvas = document.getElementById('c');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFHardShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    const clear = (layout.shell && layout.shell.clearColor) || '#d7e3f0';
    renderer.setClearColor(clear, 1);

    const scene = new THREE.Scene();
    const fogCol = (layout.shell && layout.shell.fogColor) || clear;
    scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 22, layout.shell?.fogFar ?? 48);

    const cam = layout.camera;
    const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.08, 120);
    camera.position.set(...cam.position);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...cam.target);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.492;
    controls.minDistance = 0.9;
    controls.maxDistance = 36;
    controls.update();

    const hemi = layout.lights?.hemi || { sky: 0xfff3e4, ground: 0x6a7a52, intensity: 0.6 };
    scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
    const keySpec = layout.lights?.key || { color: 0xffe2b8, intensity: 1.15, position: [13, 7.5, 8] };
    const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
    key.position.set(...keySpec.position);
    key.castShadow = true;
    const sh = keySpec.shadow || {};
    const S = sh.size ?? 20;
    key.shadow.mapSize.set(sh.map ?? 4096, sh.map ?? 4096);
    key.shadow.camera.near = sh.near ?? 1;
    key.shadow.camera.far = sh.far ?? 48;
    key.shadow.camera.left = -S;
    key.shadow.camera.right = S;
    key.shadow.camera.top = S;
    key.shadow.camera.bottom = -S;
    key.shadow.bias = sh.bias ?? -0.00035;
    key.shadow.normalBias = sh.normalBias ?? 0.035;
    key.target.position.set(...(keySpec.target || [0, 0.4, -0.4]));
    scene.add(key);
    scene.add(key.target);
    const fillSpec = layout.lights?.fill || { color: 0xc5d4e6, intensity: 0.34, position: [-9, 6, -4] };
    const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
    fill.position.set(...fillSpec.position);
    fill.castShadow = false;
    scene.add(fill);

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
        prototypes[kind] = prepared;
      })
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

    let meshes = 0;
    scene.traverse((o) => { if (o.isMesh) meshes += 1; });
    console.log('community-allotment meshes', meshes);
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

    window.__scene = { renderer, scene, camera, controls, setMode, layout, meshes };
    window.__cafe = window.__scene;

    function tick() {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();
  } catch (err) {
    console.error(err);
    setStatus('error: ' + (err && err.message ? err.message : err));
  }
}
