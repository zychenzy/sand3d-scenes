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
  if (!src) return;
  if (src.transparent) {
    dst.transparent = true;
    dst.opacity = src.opacity ?? 1;
  }
  if (src.alphaTest) dst.alphaTest = src.alphaTest;
  if (src.depthWrite === false) dst.depthWrite = false;
  if (src.polygonOffset) {
    dst.polygonOffset = true;
    dst.polygonOffsetFactor = src.polygonOffsetFactor;
    dst.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  if (src.vertexColors) dst.vertexColors = true;
  if (src.emissive && src.emissive.isColor) {
    dst.emissive.copy(src.emissive);
    dst.emissiveIntensity = src.emissiveIntensity ?? 1;
  }
}

export function toToonMaterial(src) {
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
  });
  copySurface(m, src);
  return m;
}

export function toUnlitMaterial(src) {
  const m = new THREE.MeshBasicMaterial({
    color: colorFromMaterial(src),
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
  });
  if (src && src.alphaTest) m.alphaTest = src.alphaTest;
  if (src && src.depthWrite === false) m.depthWrite = false;
  if (src && src.vertexColors) m.vertexColors = true;
  return m;
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const shadow = obj.userData.shadow || 'both';
    obj.castShadow = shadow === 'both' || shadow === 'cast';
    obj.receiveShadow = shadow === 'both' || shadow === 'receive';
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
    map: opts.map || null,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
    polygonOffset: !!opts.polygonOffset,
    polygonOffsetFactor: opts.polygonOffsetFactor ?? 0,
    polygonOffsetUnits: opts.polygonOffsetUnits ?? 0,
  });
  if (opts.emissive) {
    m.emissive.set(opts.emissive);
    m.emissiveIntensity = opts.emissiveIntensity ?? 1;
  }
  if (opts.vertexColors) m.vertexColors = true;
  return m;
}

/** High-contrast leaf cookie so a spotlight breaks the toon bands into dapples. */
export function makeLeafCookie() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#fff8ee';
  g.fillRect(0, 0, 256, 256);
  const blobs = [
    [40, 36, 34, 16], [96, 28, 22, 12], [150, 48, 40, 18], [210, 30, 26, 14],
    [28, 90, 30, 14], [78, 110, 46, 20], [140, 96, 28, 36], [200, 120, 38, 16],
    [48, 160, 36, 18], [110, 170, 24, 14], [168, 158, 42, 20], [220, 190, 28, 16],
    [70, 210, 34, 14], [130, 220, 30, 18], [190, 230, 22, 12], [24, 220, 18, 10],
  ];
  blobs.forEach(([x, y, rx, ry], i) => {
    g.fillStyle = i % 3 === 0 ? 'rgba(20,28,18,0.55)' : 'rgba(12,18,12,0.92)';
    g.beginPath();
    g.ellipse(x, y, rx, ry, (i * 0.7) % Math.PI, 0, Math.PI * 2);
    g.fill();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  window.__sceneErrors = [];
  window.addEventListener('error', (e) => {
    window.__sceneErrors.push(String(e.message || e.error || 'error'));
  });

  let shadingMode = 'toon';
  try {
    if (new URLSearchParams(location.search).get('hud') === '0') {
      const hud = document.getElementById('hud');
      if (hud) hud.style.display = 'none';
    }

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
    const clear = (layout.shell && layout.shell.clearColor) || '#d5e6da';
    renderer.setClearColor(clear, 1);

    const scene = new THREE.Scene();
    const fogCol = (layout.shell && layout.shell.fogColor) || clear;
    scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 16, layout.shell?.fogFar ?? 36);

    const cam = layout.camera;
    const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.05, 80);
    camera.position.set(...cam.position);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...cam.target);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 0.9;
    controls.maxDistance = 28;
    controls.update();

    const hemi = layout.lights?.hemi || { sky: 0xfff4e4, ground: 0x5a6a48, intensity: 0.5 };
    scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));

    const keySpec = layout.lights?.key || { color: 0xfff2d4, intensity: 1.15, position: [5.2, 7.4, 4.4] };
    const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
    key.position.set(...keySpec.position);
    if (keySpec.target) key.target.position.set(...keySpec.target);
    else key.target.position.set(0, 0.6, -0.2);
    scene.add(key.target);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 28;
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.bias = -0.00045;
    key.shadow.normalBias = 0.028;
    key.shadow.intensity = keySpec.shadowIntensity ?? 0.82;
    scene.add(key);

    const fillSpec = layout.lights?.fill || { color: 0xd5e6ea, intensity: 0.28, position: [-6, 5, 2] };
    const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
    fill.position.set(...fillSpec.position);
    scene.add(fill);

    if (layout.lights?.points) {
      for (const p of layout.lights.points) {
        const pl = new THREE.PointLight(p.color || 0xffd8a8, p.intensity ?? 0.55, p.distance ?? 4.5, p.decay ?? 2);
        pl.position.set(...p.position);
        scene.add(pl);
      }
    }
    if (layout.lights?.spots) {
      for (const s of layout.lights.spots) {
        const sl = new THREE.SpotLight(
          s.color ?? 0xfff6e8,
          s.intensity ?? 4,
          s.distance ?? 8,
          s.angle ?? 0.7,
          s.penumbra ?? 0.55,
          s.decay ?? 1.4,
        );
        sl.position.set(...s.position);
        sl.target.position.set(...(s.target || [0, 0, 0]));
        scene.add(sl.target);
        if (s.cookie === 'leaves') sl.map = makeLeafCookie();
        sl.castShadow = false;
        scene.add(sl);
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
        if (opts.prepareKind) opts.prepareKind(kind, prepared);
        applyShading(prepared, shadingMode);
        prototypes[kind] = prepared;
      }),
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

    window.__scene = { renderer, scene, camera, controls, setMode, layout, ready: true };
    window.__cafe = window.__scene;

    function tick() {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();
  } catch (err) {
    console.error(err);
    window.__sceneErrors.push(String(err && err.stack || err));
    setStatus('error — see console');
  }
}
