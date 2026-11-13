import * as THREE from 'three';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

const gradients = new Map();

export function makeToonGradient(steps = 4) {
  const cached = gradients.get(steps);
  if (cached) return cached;
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
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  gradients.set(steps, tex);
  return tex;
}

const materialBackup = new WeakMap();

function colorFromMaterial(mat) {
  if (!mat) return new THREE.Color(0xaaaaaa);
  if (mat.color && mat.color.isColor) return mat.color.clone();
  return new THREE.Color(0xaaaaaa);
}

function shadeStepsOf(mesh, src) {
  return mesh?.userData?.shadeSteps || src?.userData?.shadeSteps || 4;
}

function copyEmissive(dst, src) {
  if (src && src.emissive && src.emissive.isColor && src.emissive.getHex() !== 0) {
    dst.emissive = src.emissive.clone();
    dst.emissiveIntensity = src.emissiveIntensity ?? 1;
  }
}

export function toToonMaterial(src, mesh) {
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
    gradientMap: makeToonGradient(shadeStepsOf(mesh, src)),
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
  });
  if (src && src.transparent) {
    m.transparent = true;
    m.opacity = src.opacity ?? 1;
    m.depthWrite = src.depthWrite !== false;
  }
  copyEmissive(m, src);
  m.userData.shadeSteps = shadeStepsOf(mesh, src);
  return m;
}

export function toUnlitMaterial(src) {
  return new THREE.MeshBasicMaterial({
    color: colorFromMaterial(src),
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: !src || src.depthWrite !== false,
  });
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.userData && obj.userData.keepBasic) {
      obj.castShadow = false;
      obj.receiveShadow = false;
      return;
    }
    obj.castShadow = obj.userData?.castShadow !== false;
    obj.receiveShadow = obj.userData?.receiveShadow !== false;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
    const originals = materialBackup.get(obj);
    const next = originals.map((src) => (mode === 'toon' ? toToonMaterial(src, obj) : toUnlitMaterial(src)));
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
  const steps = opts.steps || 4;
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: makeToonGradient(steps),
    map: opts.map || null,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
  });
  m.userData.shadeSteps = steps;
  if (opts.emissive) {
    m.emissive = new THREE.Color(opts.emissive);
    m.emissiveIntensity = opts.emissiveIntensity ?? 0.85;
  }
  return m;
}

export function addMesh(parent, geo, mat, x, y, z, extra = {}) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  if (extra.rot) mesh.rotation.set(extra.rot[0] || 0, extra.rot[1] || 0, extra.rot[2] || 0);
  if (extra.steps) mesh.userData.shadeSteps = extra.steps;
  else if (mat?.userData?.shadeSteps) mesh.userData.shadeSteps = mat.userData.shadeSteps;
  mesh.castShadow = extra.cast !== false;
  mesh.receiveShadow = extra.receive !== false;
  if (extra.cast === false) mesh.userData.castShadow = false;
  if (extra.receive === false) mesh.userData.receiveShadow = false;
  if (extra.name) mesh.name = extra.name;
  parent.add(mesh);
  return mesh;
}

export function addBox(g, w, h, d, mat, x, y, z, extra) {
  return addMesh(g, new THREE.BoxGeometry(w, h, d), mat, x, y, z, extra);
}

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 16, extra) {
  return addMesh(g, new THREE.CylinderGeometry(rTop, rBot, h, seg), mat, x, y, z, extra);
}

function addDirectional(scene, spec, { cast = false } = {}) {
  if (!spec) return null;
  const light = new THREE.DirectionalLight(spec.color, spec.intensity);
  light.position.set(...spec.position);
  if (spec.target) {
    const t = new THREE.Object3D();
    t.position.set(...spec.target);
    scene.add(t);
    light.target = t;
  }
  if (cast) {
    const sh = spec.shadow || {};
    light.castShadow = true;
    light.shadow.mapSize.set(sh.mapSize || 2048, sh.mapSize || 2048);
    light.shadow.camera.near = sh.near ?? 0.5;
    light.shadow.camera.far = sh.far ?? 40;
    light.shadow.camera.left = sh.left ?? -12;
    light.shadow.camera.right = sh.right ?? 12;
    light.shadow.camera.top = sh.top ?? 12;
    light.shadow.camera.bottom = sh.bottom ?? -12;
    light.shadow.bias = sh.bias ?? -0.00035;
    light.shadow.normalBias = sh.normalBias ?? 0.025;
  }
  scene.add(light);
  return light;
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  window.__errors = [];
  window.addEventListener('error', (ev) => window.__errors.push(String(ev.message || ev.error || 'error')));

  const params = new URLSearchParams(location.search);
  if (params.get('shot') === '1') {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
  }
  let shadingMode = 'toon';

  try {
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
    const clear = (layout.shell && layout.shell.clearColor) || '#d5e4ea';
    renderer.setClearColor(clear, 1);

    const scene = new THREE.Scene();
    const fogCol = (layout.shell && layout.shell.fogColor) || clear;
    scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 20, layout.shell?.fogFar ?? 42);

    const cam = layout.camera;
    const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.05, 80);
    camera.position.set(...cam.position);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...cam.target);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 0.8;
    controls.maxDistance = 32;
    controls.update();

    const hemi = layout.lights?.hemi || { sky: 0xe7f2f6, ground: 0x6d7c86, intensity: 0.42 };
    scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
    addDirectional(scene, layout.lights?.key, { cast: true });
    addDirectional(scene, layout.lights?.fill, { cast: false });
    if (layout.lights?.points) {
      for (const p of layout.lights.points) {
        const pl = new THREE.PointLight(p.color || 0xe7f3ff, p.intensity ?? 0.35, p.distance ?? 8, p.decay ?? 2);
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
          throw new Error(`${kind} (${spec.glb}): ${err.message || err}`);
        }
        gltf.scene.traverse((obj) => {
          if (!obj.isMesh) return;
          obj.userData.shadeSteps = spec.shadeSteps || 3;
        });
        if (opts.tuneAsset) opts.tuneAsset(kind, gltf.scene);
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
      node.traverse((obj) => {
        if (obj.isMesh) obj.userData.shadeSteps = layout.assets[inst.kind].shadeSteps || 3;
      });
      if (opts.dressInstance) opts.dressInstance(node, inst, layout);
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

    renderer.render(scene, camera);
    window.__scene = { renderer, scene, camera, controls, setMode, layout, ready: true };

    function tick() {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();
  } catch (err) {
    console.error(err);
    window.__errors.push(String(err.message || err));
    setStatus(`error — ${err.message || err}`);
  }
}
