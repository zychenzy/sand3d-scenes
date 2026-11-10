import * as THREE from 'three';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

export function makeToonGradient(steps = 4) {
  const data = new Uint8Array(steps * 4);
  for (let i = 0; i < steps; i++) {
    const v = Math.round(32 + (i / (steps - 1)) * (255 - 32));
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
  }
  if (src && src.vertexColors) m.vertexColors = true;
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
    vertexColors: !!(src && src.vertexColors),
  });
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.userData && obj.userData.noShade) return;
    obj.castShadow = obj.userData.noCast ? false : true;
    obj.receiveShadow = obj.userData.noReceive ? false : true;
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
    gradientMap: toonGradient,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
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

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 8) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  let shadingMode = 'toon';
  const params = new URLSearchParams(location.search);
  if (params.get('shot') === '1') {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
  }

  try {
    setStatus('loading layout…');
    const layout = await fetch('./layout.json').then((r) => {
      if (!r.ok) throw new Error(`layout.json ${r.status}`);
      return r.json();
    });

    const canvas = document.getElementById('c');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(params.get('shot') === '1' ? 1 : Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFHardShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const clear = (layout.shell && layout.shell.clearColor) || '#e7b48a';
    renderer.setClearColor(clear, 1);

    const scene = new THREE.Scene();
    const fogCol = (layout.shell && layout.shell.fogColor) || clear;
    scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 16, layout.shell?.fogFar ?? 46);

    const cam = layout.camera;
    const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.08, 180);
    camera.position.set(...cam.position);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...cam.target);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 1.2;
    controls.maxDistance = 32;
    controls.update();

    const hemi = layout.lights?.hemi || { sky: '#ffe0c0', ground: '#5c5348', intensity: 0.6 };
    scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));

    const keySpec = layout.lights?.key || { color: '#ffc48a', intensity: 1.3, position: [11, 7.2, 8.5] };
    const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
    key.position.set(...keySpec.position);
    key.castShadow = true;
    const extent = keySpec.shadowExtent || 16;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 48;
    key.shadow.camera.left = -extent;
    key.shadow.camera.right = extent;
    key.shadow.camera.top = extent;
    key.shadow.camera.bottom = -extent;
    key.shadow.bias = -0.00035;
    key.shadow.normalBias = 0.025;
    scene.add(key);

    const fillSpec = layout.lights?.fill || { color: '#8aa4c8', intensity: 0.4, position: [-7, 6, -2] };
    const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
    fill.position.set(...fillSpec.position);
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
        if (spec.tint) {
          const tint = new THREE.Color(spec.tint);
          prepared.traverse((obj) => {
            if (!obj.isMesh || !obj.material) return;
            const list = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (const m of list) {
              if (m && m.color) m.color.lerp(tint, 0.72);
            }
          });
        }
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
      node.userData.role = inst.role || '';
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
    window.__cafe = window.__scene;

    function tick() {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();
    requestAnimationFrame(() => {
      window.__ready = true;
    });
  } catch (err) {
    console.error(err);
    setStatus(err && err.message ? err.message : String(err));
    window.__error = String(err && err.stack ? err.stack : err);
  }
}
