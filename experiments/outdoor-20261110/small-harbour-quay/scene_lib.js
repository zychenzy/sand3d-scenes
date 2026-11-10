import * as THREE from 'three';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

/** Four hard toon bands with a lifted shadow floor so outdoor stone does not crush to black. */
export function makeToonGradient() {
  const stops = [78, 132, 188, 250];
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

function asColor(c) {
  if (c && c.isColor) return c;
  return new THREE.Color(c);
}

export function toToonMaterial(src) {
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    vertexColors: !!(src && src.vertexColors),
  });
  m.alphaTest = src && src.alphaTest ? src.alphaTest : 0;
  if (src && src.transparent) {
    m.transparent = true;
    m.opacity = src.opacity ?? 1;
  }
  if (src && src.depthWrite === false) m.depthWrite = false;
  if (src && src.fog === false) m.fog = false;
  if (src && src.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = src.polygonOffsetFactor;
    m.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  return m;
}

export function toUnlitMaterial(src) {
  const m = new THREE.MeshBasicMaterial({
    color: colorFromMaterial(src),
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    vertexColors: !!(src && src.vertexColors),
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
  });
  m.alphaTest = src && src.alphaTest ? src.alphaTest : 0;
  if (src && src.depthWrite === false) m.depthWrite = false;
  if (src && src.fog === false) m.fog = false;
  return m;
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = !obj.userData.noShadow;
    obj.receiveShadow = !obj.userData.noReceive;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
    const originals = materialBackup.get(obj);
    const next = originals.map((src) => (
      mode === 'toon' && !obj.userData.forceUnlit ? toToonMaterial(src) : toUnlitMaterial(src)
    ));
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

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  let shadingMode = 'toon';
  try {
    setStatus('loading layout…');
    const layout = await fetch('./layout.json').then((r) => r.json());
    const params = new URLSearchParams(location.search);

    const canvas = document.getElementById('c');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    const shot = params.get('shot') === '1';
    renderer.setPixelRatio(shot ? 1 : Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFHardShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    const clear = (layout.shell && layout.shell.clearColor) || '#a9c6de';
    renderer.setClearColor(clear, 1);

    const scene = new THREE.Scene();
    const fogCol = (layout.shell && layout.shell.fogColor) || clear;
    scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 36, layout.shell?.fogFar ?? 100);

    const cam = layout.camera;
    const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, cam.near ?? 0.08, cam.far ?? 220);
    camera.position.set(...cam.position);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...cam.target);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 0.7;
    controls.maxDistance = 48;
    controls.update();

    const hemi = layout.lights?.hemi || { sky: '#d7e7f4', ground: '#6d6458', intensity: 0.62 };
    scene.add(new THREE.HemisphereLight(asColor(hemi.sky), asColor(hemi.ground), hemi.intensity));

    const keySpec = layout.lights?.key || { color: '#fff1d8', intensity: 1.15, position: [16, 22, 12] };
    const key = new THREE.DirectionalLight(asColor(keySpec.color), keySpec.intensity);
    key.position.set(...keySpec.position);
    key.castShadow = true;
    const sh = keySpec.shadow || {};
    key.shadow.mapSize.set(sh.mapSize || 2048, sh.mapSize || 2048);
    key.shadow.camera.near = sh.near ?? 2;
    key.shadow.camera.far = sh.far ?? 72;
    key.shadow.camera.left = sh.left ?? -30;
    key.shadow.camera.right = sh.right ?? 30;
    key.shadow.camera.top = sh.top ?? 30;
    key.shadow.camera.bottom = sh.bottom ?? -30;
    key.shadow.bias = sh.bias ?? -0.00035;
    key.shadow.normalBias = sh.normalBias ?? 0.045;
    scene.add(key);
    scene.add(key.target);

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

    setStatus(opts.readyText || 'ready — drag orbit · U unlit · T toon');
    window.__ready = true;

    function setMode(mode) {
      shadingMode = mode;
      applyShading(shell, mode);
      applyShading(procedural, mode);
      applyShading(props, mode);
      const modeEl = document.getElementById('mode');
      if (modeEl) modeEl.textContent = mode.toUpperCase();
      window.__mode = mode;
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

    window.__scene = { renderer, scene, camera, controls, setMode, layout };

    function tick() {
      controls.update();
      if (opts.onFrame) opts.onFrame(performance.now() / 1000);
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();
  } catch (err) {
    console.error(err);
    window.__error = String((err && err.stack) || err);
    setStatus(window.__error);
  }
}
