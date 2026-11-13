import * as THREE from 'three';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

/** Four hard bands. The shadow floor stays high enough that plaster and canvas keep their color. */
export function makeToonGradient(stops = [0.46, 0.64, 0.82, 1]) {
  const data = new Uint8Array(stops.length * 4);
  for (let i = 0; i < stops.length; i++) {
    const v = Math.round(Math.min(1, Math.max(0, stops[i])) * 255);
    data[i * 4 + 0] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, stops.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

export const toonGradient = makeToonGradient();
const materialBackup = new WeakMap();

function colorFromMaterial(mat) {
  if (!mat) return new THREE.Color(0xcccccc);
  if (mat.color && mat.color.isColor) return mat.color.clone();
  return new THREE.Color(0xcccccc);
}

function copySurface(dst, src) {
  if (!src) return dst;
  if (src.map) dst.map = src.map;
  if (src.side) dst.side = src.side;
  if (src.transparent) {
    dst.transparent = true;
    dst.opacity = src.opacity ?? 1;
  }
  if (src.depthWrite === false) dst.depthWrite = false;
  if (src.alphaTest) dst.alphaTest = src.alphaTest;
  if (src.polygonOffset) {
    dst.polygonOffset = true;
    dst.polygonOffsetFactor = src.polygonOffsetFactor;
    dst.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  if (dst.emissive && src.emissive && src.emissive.isColor) {
    dst.emissive.copy(src.emissive);
    dst.emissiveIntensity = src.emissiveIntensity ?? 1;
  }
  return dst;
}

export function toToonMaterial(src) {
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
    gradientMap: toonGradient,
  });
  return copySurface(m, src);
}

export function toUnlitMaterial(src) {
  let color = colorFromMaterial(src);
  if (
    src &&
    src.emissive &&
    src.emissive.isColor &&
    (src.emissiveIntensity ?? 1) > 0.55 &&
    src.emissive.r + src.emissive.g + src.emissive.b > 0.35
  ) {
    color = src.emissive.clone();
  }
  const m = new THREE.MeshBasicMaterial({ color });
  return copySurface(m, src);
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.userData.shade === 'decal') {
      obj.castShadow = false;
      obj.receiveShadow = false;
      return;
    }
    if (obj.userData.noShadow) {
      obj.castShadow = false;
      obj.receiveShadow = !!obj.userData.receive;
    } else if (obj.userData.receiveOnly) {
      obj.castShadow = false;
      obj.receiveShadow = true;
    } else {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
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
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
  });
  if (opts.emissive) {
    m.emissive = new THREE.Color(opts.emissive);
    m.emissiveIntensity = opts.emissiveIntensity ?? 0.35;
  }
  if (opts.map) m.map = opts.map;
  if (opts.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = opts.polygonOffsetFactor ?? 1;
    m.polygonOffsetUnits = opts.polygonOffsetUnits ?? 1;
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

function asColor(c) {
  if (typeof c === 'string') return new THREE.Color(c);
  return c;
}

function tintPrepared(root, hex) {
  const tint = new THREE.Color(hex);
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => {
      if (m.color && m.color.isColor) m.color.multiply(tint);
    });
  });
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => {
    if (statusEl) statusEl.textContent = t;
  };
  let shadingMode = 'toon';
  window.__ready = false;
  window.__bootError = null;

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
    // This three build has BasicShadowMap and PCFShadowMap. PCF keeps the toon read without the jagged acne of a binary map.
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    const clear = (layout.shell && layout.shell.clearColor) || '#d9d3c8';
    renderer.setClearColor(clear, 1);

    const scene = new THREE.Scene();
    const fogCol = (layout.shell && layout.shell.fogColor) || clear;
    scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 18, layout.shell?.fogFar ?? 40);

    const cam = layout.camera;
    const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.06, 80);
    camera.position.set(...cam.position);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...cam.target);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 0.7;
    controls.maxDistance = 26;
    controls.update();

    const hemi = layout.lights?.hemi || { sky: '#fff6ea', ground: '#d9c4a4', intensity: 0.78 };
    scene.add(new THREE.HemisphereLight(asColor(hemi.sky), asColor(hemi.ground), hemi.intensity));
    const keySpec = layout.lights?.key || { color: '#fff4e6', intensity: 1.15, position: [5.5, 10.5, 6.2] };
    const key = new THREE.DirectionalLight(asColor(keySpec.color), keySpec.intensity);
    key.position.set(...keySpec.position);
    if (keySpec.target) key.target.position.set(...keySpec.target);
    scene.add(key.target);
    key.castShadow = true;
    key.shadow.mapSize.set(4096, 4096);
    key.shadow.camera.near = 0.4;
    key.shadow.camera.far = 26;
    key.shadow.camera.left = -6.4;
    key.shadow.camera.right = 6.4;
    key.shadow.camera.top = 6.4;
    key.shadow.camera.bottom = -6.4;
    key.shadow.bias = -0.00015;
    key.shadow.normalBias = 0.045;
    scene.add(key);
    const fillSpec = layout.lights?.fill || { color: '#f0e4d2', intensity: 0.38, position: [-6, 4.2, 2] };
    const fill = new THREE.DirectionalLight(asColor(fillSpec.color), fillSpec.intensity);
    fill.position.set(...fillSpec.position);
    scene.add(fill);
    if (layout.lights?.points) {
      for (const p of layout.lights.points) {
        const pl = new THREE.PointLight(asColor(p.color || '#ffd2a4'), p.intensity ?? 0.4, p.distance ?? 4.5, p.decay ?? 2);
        pl.position.set(...p.position);
        scene.add(pl);
      }
    }

    const shell = opts.makeShell(layout);
    scene.add(shell);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    shell.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        if (m.map) m.map.anisotropy = maxAniso;
      });
    });
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
        if (spec.tint) tintPrepared(prepared, spec.tint);
        applyShading(prepared, shadingMode);
        prototypes[kind] = prepared;
      })
    );

    const props = new THREE.Group();
    props.name = 'props';
    scene.add(props);
    for (const inst of layout.instances || []) {
      const proto = prototypes[inst.kind];
      if (!proto) throw new Error('missing asset ' + inst.kind);
      const node = proto.clone(true);
      applyShading(node, shadingMode);
      node.position.set(inst.position[0], inst.position[1], inst.position[2]);
      if (inst.rotationY) node.rotation.y = inst.rotationY;
      if (Array.isArray(inst.scale)) {
        if (inst.scale.length === 3) node.scale.multiply(new THREE.Vector3(...inst.scale));
        else node.scale.multiplyScalar(inst.scale[0]);
      } else if (inst.scale) node.scale.multiplyScalar(inst.scale);
      node.name = inst.id;
      node.updateWorldMatrix(true, true);
      props.add(node);
    }

    if (opts.onReady) {
      const extra = opts.onReady({ scene, layout, props, procedural, THREE });
      if (extra) {
        procedural.add(extra);
        applyShading(extra, shadingMode);
      }
    }

    setStatus(opts.readyText || 'ready — drag orbit · U unlit · T toon');

    function setMode(mode) {
      shadingMode = mode;
      applyShading(shell, mode);
      applyShading(procedural, mode);
      applyShading(props, mode);
      const modeEl = document.getElementById('mode');
      if (modeEl) modeEl.textContent = mode.toUpperCase();
      if (window.__scene) window.__scene.mode = mode;
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

    window.__scene = { renderer, scene, camera, controls, setMode, layout, THREE, mode: shadingMode };
    window.__bounds = (name) => {
      const o = scene.getObjectByName(name);
      if (!o) return null;
      o.updateWorldMatrix(true, true);
      const b = new THREE.Box3().setFromObject(o);
      if (b.isEmpty()) return null;
      const round = (v) => v.toArray().map((n) => Math.round(n * 1000) / 1000);
      return { min: round(b.min), max: round(b.max) };
    };
    window.__ready = true;

    function tick() {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();
  } catch (err) {
    console.error(err);
    window.__bootError = String(err && err.stack ? err.stack : err);
    setStatus('load error: ' + (err && err.message ? err.message : err));
  }
}
