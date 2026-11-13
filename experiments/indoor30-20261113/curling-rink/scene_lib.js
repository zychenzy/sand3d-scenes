import * as THREE from 'three';
import { OrbitControls } from '../../../gym/vendor/controls/OrbitControls.js';
import { GLTFLoader } from '../../../gym/vendor/loaders/GLTFLoader.js';

export function makeToonGradient(steps = 4) {
  const data = new Uint8Array(steps * 4);
  for (let i = 0; i < steps; i++) {
    const v = Math.round((i / (steps - 1)) * 255);
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.NoColorSpace;
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
  if (src.emissiveMap && dst.emissiveMap !== undefined) dst.emissiveMap = src.emissiveMap;
  if (src.emissive && dst.emissive) dst.emissive.copy(src.emissive);
  if (src.emissiveIntensity != null && dst.emissiveIntensity != null) dst.emissiveIntensity = src.emissiveIntensity;
  if (src.alphaTest) dst.alphaTest = src.alphaTest;
  dst.side = src.side || THREE.FrontSide;
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
  const glow = src && src.emissive && src.emissive.isColor && src.emissive.getHex() !== 0 && src.emissiveIntensity > 0.35;
  if (glow) color = color.clone().lerp(src.emissive, Math.min(1, src.emissiveIntensity));
  const m = new THREE.MeshBasicMaterial({ color });
  return copySurface(m, src);
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = !obj.userData.noCast;
    obj.receiveShadow = !obj.userData.noReceive;
    if (obj.userData.keepMaterial) return;
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
    map: opts.map || null,
    emissive: opts.emissive ?? 0x000000,
    emissiveMap: opts.emissiveMap || null,
    emissiveIntensity: opts.emissiveIntensity ?? (opts.emissive ? 1 : 0),
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    alphaTest: opts.alphaTest ?? 0,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
    polygonOffset: !!opts.polygonOffset,
    polygonOffsetFactor: opts.polygonOffsetFactor ?? 0,
    polygonOffsetUnits: opts.polygonOffsetUnits ?? 0,
  });
}

function flag(mesh, opts) {
  if (!opts) return mesh;
  if (opts.role) mesh.userData.role = opts.role;
  if (opts.noCast) mesh.userData.noCast = true;
  if (opts.noReceive) mesh.userData.noReceive = true;
  if (opts.keepMaterial) mesh.userData.keepMaterial = true;
  if (opts.rotX) mesh.rotation.x = opts.rotX;
  if (opts.rotY) mesh.rotation.y = opts.rotY;
  if (opts.rotZ) mesh.rotation.z = opts.rotZ;
  if (opts.renderOrder) mesh.renderOrder = opts.renderOrder;
  return mesh;
}

export function addBox(g, w, h, d, mat, x, y, z, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  g.add(m);
  return flag(m, opts);
}

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 16, opts) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
  g.add(m);
  return flag(m, opts);
}

export function addSphere(g, r, mat, x, y, z, seg = 14, opts) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg - 4)), mat);
  m.position.set(x, y, z);
  g.add(m);
  return flag(m, opts);
}

function sampleFrame() {
  const r = window.__scene.renderer;
  r.render(window.__scene.scene, window.__scene.camera);
  const gl = r.getContext();
  const w = gl.drawingBufferWidth;
  const h = gl.drawingBufferHeight;
  const pts = [[0.18, 0.22], [0.5, 0.28], [0.5, 0.52], [0.82, 0.38], [0.32, 0.7], [0.68, 0.74], [0.12, 0.48], [0.88, 0.58], [0.5, 0.14]];
  const out = [];
  const px = new Uint8Array(4);
  for (const [u, v] of pts) {
    gl.readPixels(Math.floor(u * (w - 1)), Math.floor(v * (h - 1)), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    out.push([px[0], px[1], px[2]]);
  }
  return out;
}

function probeScene(scene, mode) {
  const roles = {};
  let toonCount = 0;
  let basicCount = 0;
  let meshes = 0;
  scene.traverse((obj) => {
    if (!obj.isMesh) return;
    meshes += 1;
    if (obj.userData.role) roles[obj.userData.role] = (roles[obj.userData.role] || 0) + 1;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m) continue;
      if (m.isMeshBasicMaterial) basicCount += 1;
      if (m.isMeshToonMaterial) toonCount += 1;
    }
  });
  return { meshes, toon: toonCount, basic: basicCount, roles, mode };
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  let shadingMode = 'toon';
  window.__errors = [];
  window.addEventListener('error', (e) => {
    window.__errors.push(e.message || 'error');
  });
  window.addEventListener('unhandledrejection', (e) => {
    window.__errors.push(String(e.reason && e.reason.message ? e.reason.message : e.reason));
  });

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
    const clear = (layout.shell && layout.shell.clearColor) || '#d5dee4';
    renderer.setClearColor(clear, 1);

    const scene = new THREE.Scene();
    const fogCol = (layout.shell && layout.shell.fogColor) || clear;
    scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 34, layout.shell?.fogFar ?? 82);

    const cam = layout.camera;
    const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, cam.near ?? 0.08, cam.far ?? 130);
    camera.position.set(...cam.position);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...cam.target);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 0.8;
    controls.maxDistance = 72;
    controls.update();

    const hemi = layout.lights?.hemi || { sky: 0xfff8f2, ground: 0xc5d0d4, intensity: 0.78 };
    scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
    const keySpec = layout.lights?.key || {};
    const key = new THREE.DirectionalLight(keySpec.color ?? 0xfff4e6, keySpec.intensity ?? 1.3);
    key.position.set(...(keySpec.position || [-7.5, 13.5, 24]));
    if (keySpec.target) key.target.position.set(...keySpec.target);
    key.castShadow = true;
    const shadowBox = keySpec.shadow ?? 15;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.6;
    key.shadow.camera.far = 64;
    key.shadow.camera.left = -shadowBox;
    key.shadow.camera.right = shadowBox;
    key.shadow.camera.top = shadowBox;
    key.shadow.camera.bottom = -shadowBox;
    key.shadow.bias = keySpec.bias ?? -0.00055;
    key.shadow.normalBias = keySpec.normalBias ?? 0.04;
    key.shadow.camera.updateProjectionMatrix();
    scene.add(key);
    scene.add(key.target);
    const fillSpec = layout.lights?.fill || { color: 0xd5e4ea, intensity: 0.32, position: [-8, 6, 16] };
    const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
    fill.position.set(...fillSpec.position);
    scene.add(fill);
    if (layout.lights?.points) {
      for (const p of layout.lights.points) {
        const pl = new THREE.PointLight(p.color || 0xffe2b0, p.intensity ?? 0.4, p.distance ?? 5, p.decay ?? 2);
        pl.position.set(...p.position);
        scene.add(pl);
      }
    }

    const shell = opts.makeShell(layout);
    scene.add(shell);
    const procedural = opts.makeProcedural ? opts.makeProcedural(layout) : new THREE.Group();
    scene.add(procedural);

    const loader = new GLTFLoader();
    const prototypes = {};
    const kinds = Object.keys(layout.assets || {});
    setStatus(`loading ${kinds.length} GLBs…`);
    await Promise.all(kinds.map(async (kind) => {
      const spec = layout.assets[kind];
      let gltf;
      try {
        gltf = await loader.loadAsync(spec.glb);
      } catch (err) {
        throw new Error(`${kind} (${spec.glb}): ${err.message || err}`);
      }
      const prepared = prepareAsset(gltf.scene, spec.targetHeight);
      if (opts.decoratePrototype) opts.decoratePrototype(kind, prepared, spec);
      prototypes[kind] = prepared;
    }));

    const props = new THREE.Group();
    props.name = 'props';
    scene.add(props);
    for (const inst of layout.instances || []) {
      const proto = prototypes[inst.kind];
      if (!proto) throw new Error(`missing prototype ${inst.kind}`);
      const node = proto.clone(true);
      node.position.set(inst.position[0], inst.position[1], inst.position[2]);
      if (inst.rotationY) node.rotation.y = inst.rotationY;
      if (Array.isArray(inst.scale)) {
        if (inst.scale.length === 3) node.scale.multiply(new THREE.Vector3(...inst.scale));
        else node.scale.multiplyScalar(inst.scale[0]);
      } else if (inst.scale) node.scale.multiplyScalar(inst.scale);
      node.name = inst.id;
      node.userData.role = inst.kind;
      props.add(node);
    }

    applyShading(shell, shadingMode);
    applyShading(procedural, shadingMode);
    applyShading(props, shadingMode);

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
    if (params.get('hud') === '0') {
      const hud = document.getElementById('hud');
      if (hud) hud.style.display = 'none';
    }
    if (params.get('mode') === 'unlit') setMode('unlit');
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

    window.__scene = { renderer, scene, camera, controls, setMode, layout };
    window.__probe = () => probeScene(scene, shadingMode);
    window.__sample = sampleFrame;
    window.__ready = true;

    function tick() {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();
  } catch (err) {
    console.error(err);
    window.__errors.push(String(err && err.message ? err.message : err));
    setStatus(`error — ${err.message || err}`);
    window.__ready = false;
  }
}
