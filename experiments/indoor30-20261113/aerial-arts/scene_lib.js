import * as THREE from 'three';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

/** Four hard steps. The darkest stop stays lifted so ceilings and beam undersides do not crush to black. */
export function makeToonGradient() {
  const stops = [0.22, 0.48, 0.73, 1];
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
    side: (src && src.side) || THREE.FrontSide,
    emissive: src && src.emissive ? src.emissive.clone() : new THREE.Color(0x000000),
    emissiveIntensity: src && src.emissiveIntensity ? src.emissiveIntensity : 0,
  });
  if (src && src.transparent) {
    m.transparent = true;
    m.opacity = src.opacity ?? 1;
    m.depthWrite = src.depthWrite !== false;
  }
  if (src && src.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = src.polygonOffsetFactor;
    m.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  return m;
}

export function toUnlitMaterial(src) {
  if (src && src.userData && src.userData.keep) return src;
  return new THREE.MeshBasicMaterial({
    color: colorFromMaterial(src),
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: !src || src.depthWrite !== false,
  });
}

function applySpecial(obj) {
  const shade = obj.userData && obj.userData.shade;
  if (shade === 'emissive') {
    obj.material = new THREE.MeshBasicMaterial({ color: obj.userData.color || '#fff1c9' });
    obj.castShadow = false;
    obj.receiveShadow = false;
    return true;
  }
  if (shade === 'shadow') {
    const m = new THREE.MeshBasicMaterial({
      color: '#1a140f',
      transparent: true,
      opacity: obj.userData.opacity ?? 0.28,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    obj.material = m;
    obj.castShadow = false;
    obj.receiveShadow = false;
    return true;
  }
  if (shade === 'decal') {
    obj.material = new THREE.MeshBasicMaterial({
      map: obj.userData.map || null,
      color: '#ffffff',
      side: THREE.FrontSide,
    });
    obj.castShadow = false;
    obj.receiveShadow = false;
    return true;
  }
  return false;
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (applySpecial(obj)) return;
    const quiet = !!(obj.userData && obj.userData.noShadow);
    obj.castShadow = !(quiet || (obj.userData && obj.userData.noCast));
    obj.receiveShadow = !quiet;
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
    emissive: new THREE.Color(opts.emissive || 0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
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

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function col(value, fallback) {
  return new THREE.Color(value == null ? fallback : value);
}

function addDirectional(scene, spec, cast) {
  const light = new THREE.DirectionalLight(col(spec.color, 0xfff4e8), spec.intensity);
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
    light.shadow.camera.far = sh.far ?? 40;
    light.shadow.camera.left = sh.left ?? -14;
    light.shadow.camera.right = sh.right ?? 14;
    light.shadow.camera.top = sh.top ?? 14;
    light.shadow.camera.bottom = sh.bottom ?? -14;
    light.shadow.bias = sh.bias ?? -0.00015;
    light.shadow.normalBias = sh.normalBias ?? 0.05;
    light.shadow.camera.updateProjectionMatrix();
  }
  scene.add(light);
  return light;
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  let shadingMode = 'toon';
  window.__bootError = null;
  window.__ready = false;
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
    const clear = (layout.shell && layout.shell.clearColor) || '#d5dde3';
    renderer.setClearColor(clear, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(
      (layout.shell && layout.shell.fogColor) || clear,
      layout.shell?.fogNear ?? 22,
      layout.shell?.fogFar ?? 56,
    );

    const cam = layout.camera;
    const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.05, 80);
    camera.position.set(...cam.position);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...cam.target);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 1.1;
    controls.maxDistance = cam.maxDistance || 34;
    controls.update();

    const hemi = layout.lights?.hemi || { sky: '#fff6ec', ground: '#ead8c2', intensity: 0.8 };
    scene.add(new THREE.HemisphereLight(col(hemi.sky), col(hemi.ground), hemi.intensity));
    addDirectional(scene, layout.lights.key, true);
    if (layout.lights.window) addDirectional(scene, layout.lights.window, false);
    if (layout.lights.fill) addDirectional(scene, layout.lights.fill, false);
    for (const p of layout.lights.points || []) {
      const pl = new THREE.PointLight(col(p.color), p.intensity ?? 0.4, p.distance ?? 6, p.decay ?? 2);
      pl.position.set(...p.position);
      scene.add(pl);
    }

    const shell = opts.makeShell(layout);
    shell.name = 'shell';
    scene.add(shell);
    applyShading(shell, shadingMode);

    const procedural = opts.makeProcedural ? opts.makeProcedural(layout) : new THREE.Group();
    procedural.name = 'procedural';
    scene.add(procedural);
    applyShading(procedural, shadingMode);

    const loader = new GLTFLoader();
    const prototypes = {};
    const failures = [];
    const kinds = Object.keys(layout.assets || {});
    setStatus(`loading ${kinds.length} GLBs…`);
    await Promise.all(kinds.map(async (kind) => {
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
    }));
    if (failures.length) throw new Error(`asset failed: ${failures.join(', ')}`);

    const props = new THREE.Group();
    props.name = 'props';
    scene.add(props);
    for (const inst of layout.instances || []) {
      const proto = prototypes[inst.kind];
      if (!proto) throw new Error(`missing prototype ${inst.kind}`);
      const node = proto.clone(true);
      applyShading(node, shadingMode);
      node.position.set(inst.position[0], inst.position[1], inst.position[2]);
      if (inst.rotationY) node.rotation.y = inst.rotationY;
      node.name = inst.id;
      props.add(node);
    }

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
    if (params.get('hud') === '0') {
      const hud = document.getElementById('hud');
      if (hud) hud.style.display = 'none';
    }
    const presets = layout.cameraPresets || {};
    const camKey = params.get('cam');
    if (camKey && presets[camKey]) {
      const p = presets[camKey];
      camera.position.set(...p.position);
      controls.target.set(...p.target);
      if (p.fov) {
        camera.fov = p.fov;
        camera.updateProjectionMatrix();
      }
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

    window.__bounds = (name) => {
      const obj = scene.getObjectByName(name);
      if (!obj) return null;
      obj.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(obj);
      return {
        min: [box.min.x, box.min.y, box.min.z],
        max: [box.max.x, box.max.y, box.max.z],
      };
    };
    window.__scene = { renderer, scene, camera, controls, setMode, layout };
    if (opts.onReady) opts.onReady({ scene, camera, layout, props, setMode });
    window.__ready = true;
    setStatus(opts.readyText || 'ready — drag orbit · U unlit · T toon');

    function tick() {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();
  } catch (err) {
    console.error(err);
    window.__bootError = String(err && (err.stack || err.message) || err);
    window.__ready = false;
    setStatus(`error: ${err.message || err}`);
  }
}
