import * as THREE from 'three';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

/** Four hard bands. The shadow floor stays high enough that maple and plaster do not crush to black. */
export function makeToonGradient(stops = [0.38, 0.58, 0.8, 1]) {
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
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
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
    (src.emissiveIntensity ?? 1) > 0.45 &&
    src.emissive.r + src.emissive.g + src.emissive.b > 0.2
  ) {
    color = src.emissive.clone();
  }
  const m = new THREE.MeshBasicMaterial({ color });
  return copySurface(m, src);
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const modeName = obj.userData.shadowMode;
    if (modeName === 'receive') {
      obj.castShadow = false;
      obj.receiveShadow = true;
    } else if (modeName === 'none' || modeName === 'decal') {
      obj.castShadow = false;
      obj.receiveShadow = false;
    } else if (modeName === 'cast') {
      obj.castShadow = true;
      obj.receiveShadow = false;
    } else {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
    if (obj.userData.keepMaterial) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
    const originals = materialBackup.get(obj);
    const next = originals.map((src) => (mode === 'toon' ? toToonMaterial(src) : toUnlitMaterial(src)));
    obj.material = Array.isArray(obj.material) ? next : next[0];
  });
}

export function prepareAsset(scene, targetHeight, prepRotation) {
  if (Array.isArray(prepRotation)) {
    scene.rotation.set(prepRotation[0] || 0, prepRotation[1] || 0, prepRotation[2] || 0);
  }
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
    m.emissiveIntensity = opts.emissiveIntensity ?? 1;
  }
  if (opts.map) m.map = opts.map;
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
  g.add(m);
  return m;
}

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

function asColor(c) {
  if (typeof c === 'string') return new THREE.Color(c);
  return new THREE.Color(c);
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => {
    if (statusEl) statusEl.textContent = t;
  };
  let shadingMode = 'toon';
  window.__ready = false;
  window.__errors = [];
  window.addEventListener('error', (e) => window.__errors.push(String(e.message || e.error || 'error')));
  window.addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason?.message || e.reason || 'rejection')));

  try {
    setStatus('loading layout…');
    const layout = await fetch('./layout.json').then((r) => {
      if (!r.ok) throw new Error(`layout.json ${r.status}`);
      return r.json();
    });

    const params = new URLSearchParams(location.search);
    const canvas = document.getElementById('c');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    const dprParam = Number(params.get('dpr'));
    renderer.setPixelRatio(Number.isFinite(dprParam) && dprParam > 0 ? dprParam : Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFHardShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const clear = (layout.shell && layout.shell.clearColor) || '#efe4d4';
    renderer.setClearColor(clear, 1);

    const scene = new THREE.Scene();
    const fogCol = (layout.shell && layout.shell.fogColor) || clear;
    scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 18, layout.shell?.fogFar ?? 40);

    const cam = layout.camera;
    const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.08, 90);
    camera.position.set(...cam.position);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...cam.target);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 0.9;
    controls.maxDistance = 26;
    controls.update();

    const hemi = layout.lights?.hemi || { sky: '#fff4e6', ground: '#c4a888', intensity: 0.52 };
    scene.add(new THREE.HemisphereLight(asColor(hemi.sky), asColor(hemi.ground), hemi.intensity));
    const keySpec = layout.lights?.key || { color: '#fff6ea', intensity: 1.25, position: [6, 12, 7] };
    const key = new THREE.DirectionalLight(asColor(keySpec.color), keySpec.intensity);
    key.position.set(...keySpec.position);
    key.target.position.set(...(keySpec.target || [0, 0, 0]));
    scene.add(key.target);
    key.castShadow = true;
    const sh = keySpec.shadow || {};
    key.shadow.mapSize.set(sh.mapSize || 2048, sh.mapSize || 2048);
    key.shadow.camera.near = sh.near ?? 0.6;
    key.shadow.camera.far = sh.far ?? 36;
    key.shadow.camera.left = sh.left ?? -12;
    key.shadow.camera.right = sh.right ?? 12;
    key.shadow.camera.top = sh.top ?? 12;
    key.shadow.camera.bottom = sh.bottom ?? -12;
    key.shadow.bias = sh.bias ?? -0.00025;
    key.shadow.normalBias = sh.normalBias ?? 0.045;
    scene.add(key);
    const fillSpec = layout.lights?.fill || { color: '#f0e2d0', intensity: 0.32, position: [-8, 6, 3] };
    const fill = new THREE.DirectionalLight(asColor(fillSpec.color), fillSpec.intensity);
    fill.position.set(...fillSpec.position);
    scene.add(fill);
    if (layout.lights?.points) {
      for (const p of layout.lights.points) {
        const pl = new THREE.PointLight(asColor(p.color || '#ffd7a8'), p.intensity ?? 0.45, p.distance ?? 8, p.decay ?? 2);
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
        try {
          const gltf = await loader.loadAsync(spec.glb);
          const prepared = prepareAsset(gltf.scene, spec.targetHeight, spec.prepRotation);
          if (spec.tint) tintPrepared(prepared, spec.tint);
          applyShading(prepared, shadingMode);
          prototypes[kind] = prepared;
        } catch (err) {
          window.__errors.push(`${kind}: ${err.message || err}`);
        }
      }),
    );

    const props = new THREE.Group();
    props.name = 'props';
    scene.add(props);
    for (const inst of layout.instances || []) {
      const proto = prototypes[inst.kind];
      if (!proto) {
        window.__errors.push(`missing prototype ${inst.kind}`);
        continue;
      }
      const node = proto.clone(true);
      applyShading(node, shadingMode);
      node.position.set(inst.position[0], inst.position[1], inst.position[2]);
      if (inst.rotationX) node.rotation.x = inst.rotationX;
      if (inst.rotationY) node.rotation.y = inst.rotationY;
      if (inst.rotationZ) node.rotation.z = inst.rotationZ;
      if (Array.isArray(inst.scale)) {
        if (inst.scale.length === 3) node.scale.multiply(new THREE.Vector3(...inst.scale));
        else node.scale.multiplyScalar(inst.scale[0]);
      } else if (inst.scale) node.scale.multiplyScalar(inst.scale);
      node.name = inst.id;
      node.userData.kind = inst.kind;
      props.add(node);
    }

    const fail = window.__errors.length ? ` · failed: ${window.__errors.join('; ')}` : '';
    setStatus((opts.readyText || 'ready — drag orbit · U unlit · T toon') + fail);

    function setMode(mode) {
      shadingMode = mode;
      applyShading(shell, mode);
      applyShading(procedural, mode);
      applyShading(props, mode);
      const modeEl = document.getElementById('mode');
      if (modeEl) modeEl.textContent = mode.toUpperCase();
    }

    if (params.get('mode') === 'unlit') setMode('unlit');
    if (params.get('hud') === '0') {
      const hud = document.getElementById('hud');
      if (hud) hud.style.display = 'none';
    }
    const presets = { ...(layout.cameraPresets || {}) };
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

    let meshes = 0;
    scene.traverse((o) => { if (o.isMesh) meshes += 1; });
    window.__meshCount = meshes;
    window.__scene = { renderer, scene, camera, controls, setMode, layout, THREE };
    window.__ready = window.__errors.length === 0;

    function tick() {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();
  } catch (err) {
    console.error(err);
    window.__errors.push(String(err.message || err));
    window.__ready = false;
    setStatus(`error: ${err.message || err}`);
  }
}
