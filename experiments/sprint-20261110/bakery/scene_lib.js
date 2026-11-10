import * as THREE from 'three';
import { OrbitControls } from '../../../workshop/vendor/controls/OrbitControls.js';
import { GLTFLoader } from '../../../workshop/vendor/loaders/GLTFLoader.js';

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

function copySurface(dst, src) {
  if (!src) return dst;
  if (src.map) dst.map = src.map;
  if (src.transparent) {
    dst.transparent = true;
    dst.opacity = src.opacity ?? 1;
  }
  if (src.side != null) dst.side = src.side;
  if (src.depthWrite === false) dst.depthWrite = false;
  if (src.polygonOffset) {
    dst.polygonOffset = true;
    dst.polygonOffsetFactor = src.polygonOffsetFactor;
    dst.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  if (src.alphaTest) dst.alphaTest = src.alphaTest;
  return dst;
}

export function toToonMaterial(src) {
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
    gradientMap: toonGradient,
    emissive: src && src.emissive ? src.emissive.clone() : new THREE.Color(0, 0, 0),
    emissiveIntensity: src && src.emissiveIntensity != null ? src.emissiveIntensity : 1,
  });
  return copySurface(m, src);
}

export function toUnlitMaterial(src) {
  const color = colorFromMaterial(src);
  if (src && src.emissive && src.emissive.r + src.emissive.g + src.emissive.b > 0.04) {
    color.lerp(src.emissive, 0.82);
  }
  const m = new THREE.MeshBasicMaterial({ color });
  return copySurface(m, src);
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (mats.some((m) => m && m.userData && m.userData.keepBasic)) {
      obj.castShadow = false;
      obj.receiveShadow = false;
      return;
    }
    if (obj.userData && obj.userData.noShadow) {
      obj.castShadow = false;
      obj.receiveShadow = !!obj.userData.receiveShadow;
    } else {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
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
    emissive: opts.emissive || 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    map: opts.map || null,
  });
  if (opts.depthWrite === false) m.depthWrite = false;
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

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  window.__errors = window.__errors || [];
  let shadingMode = 'toon';

  try {
    setStatus('loading layout…');
    const layout = await fetch('./layout.json').then((r) => {
      if (!r.ok) throw new Error('layout.json ' + r.status);
      return r.json();
    });

    const canvas = document.getElementById('c');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFHardShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const clear = (layout.shell && layout.shell.clearColor) || '#efe4d4';
    renderer.setClearColor(clear, 1);

    const scene = new THREE.Scene();
    const fogCol = (layout.shell && layout.shell.fogColor) || clear;
    scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 14, layout.shell?.fogFar ?? 32);

    const cam = layout.camera;
    const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.05, 80);
    camera.position.set(...cam.position);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...cam.target);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 1.2;
    controls.maxDistance = 22;
    controls.update();

    const hemi = layout.lights?.hemi || { sky: 0xfff3e2, ground: 0x7a5a3e, intensity: 0.5 };
    scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
    const keySpec = layout.lights?.key || { color: 0xfff6e8, intensity: 1.35, position: [-6, 9, 2] };
    const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
    key.position.set(...keySpec.position);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const ext = keySpec.shadowExtent ?? 16;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 40;
    key.shadow.camera.left = -ext;
    key.shadow.camera.right = ext;
    key.shadow.camera.top = ext;
    key.shadow.camera.bottom = -ext;
    key.shadow.bias = keySpec.bias ?? -0.00035;
    key.shadow.normalBias = keySpec.normalBias ?? 0.025;
    scene.add(key);
    const fillSpec = layout.lights?.fill || { color: 0xffd0a0, intensity: 0.36, position: [5, 4, 6] };
    const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
    fill.position.set(...fillSpec.position);
    scene.add(fill);
    if (layout.lights?.points) {
      for (const p of layout.lights.points) {
        const pl = new THREE.PointLight(p.color || 0xffd8a8, p.intensity ?? 0.5, p.distance ?? 8, p.decay ?? 2);
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
        const gltf = await loader.loadAsync(spec.glb);
        const prepared = prepareAsset(gltf.scene, spec.targetHeight);
        if (opts.decoratePrototype) opts.decoratePrototype(kind, prepared);
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
    }

    const params = new URLSearchParams(location.search);
    if (params.get('shot') === '1') {
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

    window.__scene = { renderer, scene, camera, controls, setMode, layout, ready: true };
    window.__cafe = window.__scene;
    if (opts.onReady) opts.onReady(window.__scene);

    function tick() {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();
  } catch (err) {
    console.error(err);
    window.__errors.push(String(err && err.stack || err));
    setStatus('error: ' + (err && err.message ? err.message : err));
    throw err;
  }
}
