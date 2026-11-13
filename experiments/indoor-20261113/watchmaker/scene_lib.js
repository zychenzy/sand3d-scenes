import * as THREE from 'three';
import { OrbitControls } from '../../../workshop/vendor/controls/OrbitControls.js';
import { GLTFLoader } from '../../../workshop/vendor/loaders/GLTFLoader.js';

/** Hard four-stop ramp with a real shadow toe, so form survives a bright task pool. */
export function makeToonGradient() {
  const stops = [28, 96, 158, 214, 255];
  const data = new Uint8Array(stops.length * 4);
  for (let i = 0; i < stops.length; i++) {
    data[i * 4] = stops[i];
    data[i * 4 + 1] = stops[i];
    data[i * 4 + 2] = stops[i];
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, stops.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export const toonGradient = makeToonGradient();
const materialBackup = new WeakMap();

function colorFromMaterial(mat) {
  if (mat && mat.color && mat.color.isColor) return mat.color.clone();
  return new THREE.Color(0xaaaaaa);
}

function copySurface(dst, src) {
  if (!src) return dst;
  if (src.map) dst.map = src.map;
  if (src.transparent) {
    dst.transparent = true;
    dst.opacity = src.opacity ?? 1;
  }
  if (src.alphaTest) dst.alphaTest = src.alphaTest;
  if (src.side != null) dst.side = src.side;
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
    emissive: src && src.emissive ? src.emissive.clone() : new THREE.Color(0, 0, 0),
    emissiveIntensity: src && src.emissiveIntensity != null ? src.emissiveIntensity : 1,
  });
  return copySurface(m, src);
}

/** True unlit: MeshBasicMaterial, no lights. Lamp glow is folded into the albedo. */
export function toUnlitMaterial(src) {
  const color = colorFromMaterial(src);
  if (src && src.emissive && src.emissive.r + src.emissive.g + src.emissive.b > 0.04) {
    const glow = Math.min(1, src.emissiveIntensity || 1);
    color.lerp(src.emissive, Math.min(0.9, glow));
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
    map: opts.map || null,
    emissive: opts.emissive || 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
  });
  if (opts.depthWrite === false) m.depthWrite = false;
  if (opts.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = opts.polygonOffsetFactor ?? -1;
    m.polygonOffsetUnits = opts.polygonOffsetUnits ?? -1;
  }
  return m;
}

export function markLamps(root) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const name = (obj.name || '').toLowerCase();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m || !m.color) continue;
      if (name.includes('light_tube') || name === 'bulb') {
        m.color.set('#fff6d8');
        m.emissive = new THREE.Color('#ffe7b0');
        m.emissiveIntensity = 0.95;
      } else if (name.includes('green_roof') || name === 'shade') {
        m.emissive = new THREE.Color('#ffc56a');
        m.emissiveIntensity = 0.42;
      }
    }
  });
}

export function addBox(g, w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
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
    // Soft filtered PCF. Hard nearest-neighbour sampling stair-steps thin tool shadows.
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const clear = (layout.shell && layout.shell.clearColor) || '#d9d3c6';
    renderer.setClearColor(clear, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(
      (layout.shell && layout.shell.fogColor) || clear,
      layout.shell?.fogNear ?? 14,
      layout.shell?.fogFar ?? 30,
    );

    const cam = layout.camera;
    const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.05, 80);
    camera.position.set(...cam.position);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...cam.target);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 0.8;
    controls.maxDistance = 22;
    controls.update();

    const hemi = layout.lights.hemi;
    scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
    const keySpec = layout.lights.key;
    const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
    key.position.set(...keySpec.position);
    key.castShadow = true;
    // The map covers the room, not a 22 m pad, so a tool shadow is several texels wide.
    key.shadow.mapSize.set(keySpec.mapSize || 4096, keySpec.mapSize || 4096);
    const ext = keySpec.shadowExtent ?? 6.2;
    key.shadow.camera.near = keySpec.shadowNear ?? 1.2;
    key.shadow.camera.far = keySpec.shadowFar ?? 24;
    key.shadow.camera.left = -ext;
    key.shadow.camera.right = ext;
    key.shadow.camera.top = ext;
    key.shadow.camera.bottom = -ext;
    // normalBias is in metres and kills acne on flat receivers. bias stays small so
    // the shadow does not detach from the lamp and the stool.
    key.shadow.bias = keySpec.bias ?? -0.00015;
    key.shadow.normalBias = keySpec.normalBias ?? 0.025;
    const aim = keySpec.target || [-0.6, 0.9, -1.4];
    key.target.position.set(aim[0], aim[1], aim[2]);
    scene.add(key.target);
    scene.add(key);
    const fillSpec = layout.lights.fill;
    const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
    fill.position.set(...fillSpec.position);
    scene.add(fill);
    for (const p of layout.lights.points || []) {
      const pl = new THREE.PointLight(p.color, p.intensity, p.distance, p.decay ?? 2);
      pl.position.set(...p.position);
      scene.add(pl);
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
    await Promise.all(kinds.map(async (kind) => {
      const spec = layout.assets[kind];
      const gltf = await loader.loadAsync(spec.glb);
      const prepared = prepareAsset(gltf.scene, spec.targetHeight);
      markLamps(prepared);
      if (opts.decoratePrototype) opts.decoratePrototype(kind, prepared, spec);
      applyShading(prepared, shadingMode);
      prototypes[kind] = prepared;
    }));

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
    const camKey = params.get('cam');
    if (camKey && layout.cameraPresets && layout.cameraPresets[camKey]) {
      const p = layout.cameraPresets[camKey];
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
    if (window.__errors.length) setStatus(window.__errors.join(' | '));

    (function tick() {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    })();
  } catch (err) {
    console.error(err);
    window.__errors.push(String(err && err.message ? err.message : err));
    setStatus('error: ' + (err && err.message ? err.message : err));
    throw err;
  }
}
