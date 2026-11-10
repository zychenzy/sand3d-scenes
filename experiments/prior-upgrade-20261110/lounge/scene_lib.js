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

function copySurface(src, m) {
  if (!src) return m;
  if (src.transparent) {
    m.transparent = true;
    m.opacity = src.opacity ?? 1;
  }
  if (src.depthWrite === false) m.depthWrite = false;
  if (src.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = src.polygonOffsetFactor;
    m.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  if (src.emissive && src.emissive.isColor) {
    m.emissive = src.emissive.clone();
    m.emissiveIntensity = src.emissiveIntensity ?? 1;
  }
  if (src.emissiveMap) m.emissiveMap = src.emissiveMap;
  return m;
}

export function toToonMaterial(src) {
  const color = colorFromMaterial(src);
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
  });
  return copySurface(src, m);
}

export function toUnlitMaterial(src) {
  let color = colorFromMaterial(src);
  if (src && src.emissive && src.emissive.isColor && src.emissive.getHex() !== 0) {
    color = src.emissive.clone();
  }
  const map = (src && (src.map || src.emissiveMap)) || null;
  return new THREE.MeshBasicMaterial({
    color,
    map,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: !(src && src.depthWrite === false),
  });
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
    const originals = materialBackup.get(obj);
    const next = originals.map((src) => (mode === 'toon' ? toToonMaterial(src) : toUnlitMaterial(src)));
    obj.material = Array.isArray(obj.material) ? next : next[0];
    if (obj.userData.noCast) obj.castShadow = false;
    if (obj.userData.noReceive) obj.receiveShadow = false;
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
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    emissiveMap: opts.emissiveMap || null,
    map: opts.map || null,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
  });
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

export function addSphere(g, r, mat, x, y, z, seg = 14) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg >> 1)), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

/** Cutaway room from layout.meta.room + layout.shell. Back wall -Z, left wall -X. */
export function makeCutawayShell(layout, extra = {}) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell || {};
  const floorMat = toon(s.floorColor || '#c4b49a');
  const glass = !!extra.glass;
  const wallMat = glass
    ? toon(s.windowTint || '#c5e0d0', { transparent: true, opacity: extra.glassOpacity ?? 0.28, side: THREE.DoubleSide })
    : toon(s.wallColor || '#efe6d4');
  const ceilMat = toon(s.ceilingColor || '#f3eee4');

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), floorMat);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  g.add(floor);

  if (extra.carpet) {
    const c = extra.carpet;
    addBox(g, c.w ?? W - 1.2, 0.02, c.d ?? D - 1.1, toon(s.carpetColor || s.accentColor || '#5a2438'), c.x ?? 0, 0.01, c.z ?? 0.05);
  }

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, glass ? 0.05 : 0.14), wallMat);
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(glass ? 0.05 : 0.14, H, D), wallMat);
  left.position.set(-W / 2, H / 2, 0);
  left.receiveShadow = true;
  g.add(left);

  if (extra.wainscotH) {
    const wood = toon(s.woodColor || '#6a4e36');
    addBox(g, W - 0.3, extra.wainscotH, 0.06, wood, 0, extra.wainscotH / 2, -D / 2 + 0.1);
    addBox(g, 0.06, extra.wainscotH, D - 0.3, wood, -W / 2 + 0.1, extra.wainscotH / 2, 0);
  }

  if (extra.ceiling !== false) {
    const cw = extra.ceilingW ?? W * 0.9;
    const cd = extra.ceilingD ?? D * 0.68;
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(cw, glass ? 0.04 : 0.1, cd), glass ? wallMat : ceilMat);
    ceil.position.set(extra.ceilingX ?? -0.1, H - 0.05, extra.ceilingZ ?? -D * 0.12);
    g.add(ceil);
  }
  return g;
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  window.__errors = [];
  window.addEventListener('error', (ev) => {
    window.__errors.push(String(ev.message || ev.error || 'error'));
  });
  window.addEventListener('unhandledrejection', (ev) => {
    window.__errors.push(String(ev.reason || 'rejection'));
  });
  let shadingMode = 'toon';

  try {
    setStatus('loading layout…');
    const layout = await fetch('./layout.json').then((r) => r.json());

    const canvas = document.getElementById('c');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFHardShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const clear = (layout.shell && layout.shell.clearColor) || '#d4dce2';
    renderer.setClearColor(clear, 1);

    const scene = new THREE.Scene();
    const fogCol = (layout.shell && layout.shell.fogColor) || clear;
    scene.fog = new THREE.Fog(fogCol, layout.shell?.fogNear ?? 18, layout.shell?.fogFar ?? 42);

    const cam = layout.camera;
    const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.05, 80);
    camera.position.set(...cam.position);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...cam.target);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 1.4;
    controls.maxDistance = 28;
    controls.update();

    const hemi = layout.lights?.hemi || { sky: 0xfff0dd, ground: 0x5a6a58, intensity: 0.55 };
    scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
    const keySpec = layout.lights?.key || { color: 0xfff4e8, intensity: 1.35, position: [6.5, 11, 4.5] };
    const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
    key.position.set(...keySpec.position);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 40;
    const ext = keySpec.shadowExtent ?? 12;
    key.shadow.camera.left = -ext;
    key.shadow.camera.right = ext;
    key.shadow.camera.top = ext;
    key.shadow.camera.bottom = -ext;
    key.shadow.bias = -0.00035;
    key.shadow.normalBias = 0.02;
    scene.add(key);
    const fillSpec = layout.lights?.fill || { color: 0xb8c8e0, intensity: 0.35, position: [-5, 6, 3] };
    const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
    fill.position.set(...fillSpec.position);
    scene.add(fill);
    if (layout.lights?.points) {
      for (const p of layout.lights.points) {
        const pl = new THREE.PointLight(p.color || 0xffd8a8, p.intensity ?? 0.5, p.distance ?? 12, p.decay ?? 2);
        pl.position.set(...p.position);
        scene.add(pl);
      }
    }
    if (layout.lights?.spots) {
      for (const s of layout.lights.spots) {
        const spot = new THREE.SpotLight(
          s.color ?? 0xffe0b0,
          s.intensity ?? 6,
          s.distance ?? 8,
          s.angle ?? 0.6,
          s.penumbra ?? 0.5,
          s.decay ?? 2,
        );
        spot.position.set(...s.position);
        spot.target.position.set(...(s.target || [0, 0, 0]));
        scene.add(spot.target);
        scene.add(spot);
        if (s.castShadow !== false) {
          spot.castShadow = true;
          spot.shadow.mapSize.set(2048, 2048);
          spot.shadow.bias = -0.0006;
          spot.shadow.normalBias = 0.03;
          spot.shadow.camera.near = 0.25;
          spot.shadow.camera.far = s.distance ?? 8;
        }
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
        if (spec.tint) {
          const tint = new THREE.Color(spec.tint);
          const mix = spec.tintMix ?? 0.8;
          prepared.traverse((o) => {
            if (!o.isMesh || !o.material) return;
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            for (const mat of mats) if (mat && mat.color) mat.color.lerp(tint, mix);
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
      if (inst.rotationY != null) node.rotation.y = inst.rotationY;
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
    if (params.get('hud') === '0') {
      const hud = document.getElementById('hud');
      if (hud) hud.style.display = 'none';
    }
    if (params.get('shot') === '1') controls.enableDamping = false;
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

    const shot = params.get('shot') === '1';
    let frames = 0;
    function tick() {
      controls.update();
      renderer.render(scene, camera);
      frames += 1;
      if (shot && frames >= 6) {
        document.title = 'SHOT_READY';
        return;
      }
      requestAnimationFrame(tick);
    }
    tick();
  } catch (err) {
    console.error(err);
    window.__errors.push(String((err && err.stack) || err));
    setStatus('error — ' + err);
    window.__scene = { ready: false, error: String(err) };
  }
}
