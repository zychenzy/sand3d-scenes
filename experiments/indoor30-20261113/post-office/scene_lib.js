import * as THREE from 'three';
import { OrbitControls } from '../../../museum/vendor/controls/OrbitControls.js';
import { GLTFLoader } from '../../../museum/vendor/loaders/GLTFLoader.js';

// Cedar Lane post office. Shared museum vendor is imported, not copied.
// Default shading is a 4-step nearest toon gradient. The darkest step is
// lifted off zero so shadow sides keep their material instead of crushing
// to black. Unlit is a real MeshBasicMaterial swap (mode=unlit / key U).

export function makeToonGradient(steps = 4) {
  const stops = [78, 142, 204, 255];
  const data = new Uint8Array(steps * 4);
  for (let i = 0; i < steps; i++) {
    const v = stops[i];
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
  dst.side = src.side || THREE.FrontSide;
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
  return dst;
}

export function toToonMaterial(src) {
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    emissive: src && src.emissive ? src.emissive.clone() : new THREE.Color(0x000000),
    emissiveIntensity: src && src.emissiveIntensity != null ? src.emissiveIntensity : 1,
  });
  return copySurface(m, src);
}

export function toUnlitMaterial(src) {
  let color = colorFromMaterial(src);
  const emissive = src && src.emissive;
  if (emissive && (emissive.r + emissive.g + emissive.b) > 0.2) {
    color = emissive.clone();
  }
  const m = new THREE.MeshBasicMaterial({
    color,
    map: src && src.map ? src.map : null,
  });
  return copySurface(m, src);
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const flat = obj.userData.shading === 'flat';
    obj.castShadow = !flat && obj.userData.castShadow !== false;
    obj.receiveShadow = !flat && obj.userData.receiveShadow !== false;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
    const originals = materialBackup.get(obj);
    const next = originals.map((src) => {
      if (flat || mode !== 'toon') return toUnlitMaterial(src);
      return toToonMaterial(src);
    });
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
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
    polygonOffset: !!opts.polygonOffset,
    polygonOffsetFactor: opts.polygonOffsetFactor ?? 0,
    polygonOffsetUnits: opts.polygonOffsetUnits ?? 0,
  });
}

export function addBox(g, w, h, d, mat, x, y, z, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (opts.name) m.name = opts.name;
  if (opts.rotY) m.rotation.y = opts.rotY;
  if (opts.cast === false) m.userData.castShadow = false;
  if (opts.receive === false) m.userData.receiveShadow = false;
  if (opts.flat) m.userData.shading = 'flat';
  m.castShadow = opts.cast !== false;
  m.receiveShadow = opts.receive !== false;
  g.add(m);
  return m;
}

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 16, opts = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
  if (opts.name) m.name = opts.name;
  if (opts.rotX) m.rotation.x = opts.rotX;
  if (opts.rotZ) m.rotation.z = opts.rotZ;
  if (opts.cast === false) m.userData.castShadow = false;
  m.castShadow = opts.cast !== false;
  m.receiveShadow = opts.receive !== false;
  g.add(m);
  return m;
}

export function labelTexture(text, w, h, opts = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = opts.bg || '#efe6d4';
  ctx.fillRect(0, 0, w, h);
  if (opts.rule) {
    ctx.strokeStyle = opts.rule;
    ctx.lineWidth = opts.ruleWidth || 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);
  }
  ctx.fillStyle = opts.fg || '#2a2420';
  ctx.font = `${opts.weight || 650} ${opts.px || Math.floor(h * 0.46)}px ${opts.font || 'Georgia, serif'}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = String(text).split('\n');
  const lh = opts.px ? opts.px * 1.15 : h / (lines.length + 0.4);
  const y0 = h / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((line, i) => ctx.fillText(line, w / 2, y0 + i * lh));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  let shadingMode = 'toon';
  window.__errors = window.__errors || [];
  window.__toonGradient = toonGradient;

  try {
    setStatus('loading layout…');
    const layout = await fetch('./layout.json').then((r) => {
      if (!r.ok) throw new Error('layout.json ' + r.status);
      return r.json();
    });

    const params = new URLSearchParams(location.search);
    const canvas = document.getElementById('c');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(params.get('shot') ? 1 : Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    const clear = (layout.shell && layout.shell.clearColor) || '#e6ddd0';
    renderer.setClearColor(clear, 1);

    const scene = new THREE.Scene();
    const fogCol = (layout.shell && layout.shell.fogColor) || clear;
    scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 20, layout.shell?.fogFar ?? 46);

    const cam = layout.camera;
    const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.08, 80);
    camera.position.set(...cam.position);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...cam.target);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 1.15;
    controls.maxDistance = 28;
    controls.update();

    const hemi = layout.lights?.hemi || { sky: 0xfff4e6, ground: 0xa89880, intensity: 0.78 };
    scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
    const keySpec = layout.lights?.key || { color: 0xfff3e0, intensity: 1.05, position: [8, 11, 8] };
    const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
    key.position.set(...keySpec.position);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sh = layout.lights?.shadow || {};
    key.shadow.camera.near = sh.near ?? 2;
    key.shadow.camera.far = sh.far ?? 40;
    key.shadow.camera.left = sh.left ?? -12;
    key.shadow.camera.right = sh.right ?? 12;
    key.shadow.camera.top = sh.top ?? 12;
    key.shadow.camera.bottom = sh.bottom ?? -12;
    key.shadow.camera.updateProjectionMatrix();
    key.shadow.bias = sh.bias ?? -0.00018;
    key.shadow.normalBias = sh.normalBias ?? 0.07;
    scene.add(key);
    const fillSpec = layout.lights?.fill || { color: 0xd5e4f2, intensity: 0.42, position: [-7, 6, 3] };
    const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
    fill.position.set(...fillSpec.position);
    scene.add(fill);
    if (layout.lights?.points) {
      for (const p of layout.lights.points) {
        const pl = new THREE.PointLight(p.color || 0xfff1d4, p.intensity ?? 0.45, p.distance ?? 9, p.decay ?? 2);
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
        applyShading(prepared, shadingMode);
        prototypes[kind] = prepared;
      })
    );

    const props = new THREE.Group();
    props.name = 'props';
    scene.add(props);
    for (const inst of layout.instances || []) {
      const proto = prototypes[inst.kind];
      if (!proto) throw new Error('missing kind ' + inst.kind);
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
      window.__shading = mode;
    }

    if (params.get('mode') === 'unlit') setMode('unlit');
    else window.__shading = 'toon';
    const presets = { ...(layout.cameraPresets || {}), ...(opts.cameraPresets || {}) };
    const camKey = params.get('cam');
    if (camKey && presets[camKey]) {
      const p = presets[camKey];
      camera.position.set(...p.position);
      controls.target.set(...p.target);
      controls.update();
    }
    if (params.get('shot')) {
      const hud = document.getElementById('hud');
      if (hud) hud.style.display = 'none';
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

    function boundsOf(name) {
      const obj = scene.getObjectByName(name);
      if (!obj) return null;
      const box = new THREE.Box3().setFromObject(obj);
      return {
        min: [box.min.x, box.min.y, box.min.z],
        max: [box.max.x, box.max.y, box.max.z],
      };
    }

    window.__scene = { renderer, scene, camera, controls, setMode, layout, toonGradient };
    window.__bounds = boundsOf;
    window.__loaded = kinds.length;

    function tick() {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    renderer.render(scene, camera);
    window.__sceneReady = true;
    window.__ready = true;
    tick();
  } catch (err) {
    console.error(err);
    window.__sceneError = String(err && err.message ? err.message : err);
    window.__errors.push(window.__sceneError);
    setStatus('error — ' + window.__sceneError);
  }
}
