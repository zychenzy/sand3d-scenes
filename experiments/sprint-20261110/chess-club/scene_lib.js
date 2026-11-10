import * as THREE from 'three';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

/** Stepped toon ramp. The toe is lifted so shadowed wood still reads. */
export function makeToonGradient(steps = 4) {
  const data = new Uint8Array(steps * 4);
  const toe = 32;
  for (let i = 0; i < steps; i++) {
    const v = Math.round(toe + (i / (steps - 1)) * (255 - toe));
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
  if (src.emissive && dst.emissive) {
    dst.emissive.copy(src.emissive);
    dst.emissiveIntensity = src.emissiveIntensity ?? 1;
  }
  if (src.transparent) {
    dst.transparent = true;
    dst.opacity = src.opacity ?? 1;
    dst.depthWrite = src.depthWrite !== false;
  }
  if (src.alphaTest) dst.alphaTest = src.alphaTest;
  dst.side = src.side || THREE.FrontSide;
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
  if (src && src.emissive && (src.emissiveIntensity ?? 0) > 0.15) {
    const glow = src.emissive.clone().multiplyScalar(Math.min(src.emissiveIntensity, 1.4));
    if (glow.r + glow.g + glow.b > 0.12) color = color.clone().lerp(glow, 0.72);
  }
  const m = new THREE.MeshBasicMaterial({ color });
  return copySurface(m, src);
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.userData.locked) return;
    if (obj.castShadow !== false) obj.castShadow = true;
    if (obj.receiveShadow !== false) obj.receiveShadow = true;
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
    emissive: new THREE.Color(opts.emissive ?? 0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? 1,
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

let contactTex = null;
export function contactTexture() {
  if (contactTex) return contactTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  g.addColorStop(0, 'rgba(28,16,8,0.62)');
  g.addColorStop(0.55, 'rgba(28,16,8,0.28)');
  g.addColorStop(1, 'rgba(28,16,8,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  contactTex = new THREE.CanvasTexture(c);
  contactTex.colorSpace = THREE.SRGBColorSpace;
  return contactTex;
}

/** Soft grounding disc. Locked so shading swaps do not turn it into an opaque toon quad. */
export function addContact(g, x, z, w, d, yaw = 0, y = 0.032) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({
      map: contactTexture(),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  m.rotation.order = 'YXZ';
  m.rotation.y = yaw;
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.userData.locked = true;
  m.castShadow = false;
  m.receiveShadow = false;
  m.renderOrder = 2;
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
  floor.name = 'floor';
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  floor.castShadow = false;
  g.add(floor);

  if (extra.carpet) {
    const c = extra.carpet;
    addBox(g, c.w ?? W - 1.2, 0.02, c.d ?? D - 1.1, toon(s.carpetColor || s.accentColor || '#5a2438'), c.x ?? 0, 0.01, c.z ?? 0.05);
  }

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, glass ? 0.05 : 0.14), wallMat);
  back.name = 'wall-back';
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  back.castShadow = false;
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(glass ? 0.05 : 0.14, H, D), wallMat);
  left.name = 'wall-left';
  left.position.set(-W / 2, H / 2, 0);
  left.receiveShadow = true;
  left.castShadow = false;
  g.add(left);

  if (extra.wainscotH) {
    const wood = toon(s.woodColor || '#6a4e36');
    addBox(g, W - 0.2, extra.wainscotH, 0.045, wood, 0, extra.wainscotH / 2, -D / 2 + 0.1);
    addBox(g, 0.045, extra.wainscotH, D - 0.2, wood, -W / 2 + 0.1, extra.wainscotH / 2, 0);
  }

  if (extra.ceiling !== false) {
    const cw = extra.ceilingW ?? W * 0.9;
    const cd = extra.ceilingD ?? D * 0.68;
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(cw, glass ? 0.04 : 0.08, cd), glass ? wallMat : ceilMat);
    ceil.name = 'ceiling';
    ceil.position.set(extra.ceilingX ?? -0.15, H - 0.05, extra.ceilingZ ?? -D * 0.12);
    ceil.castShadow = false;
    ceil.receiveShadow = true;
    g.add(ceil);
  }
  return g;
}

const BOOK_COLORS = ['#6b3a2a', '#2f4a3c', '#3a3a6a', '#7a5a28', '#5a2a3a', '#2a4a6a', '#4a3a28', '#8a4a2a', '#35503a', '#7a3030', '#2c3e55'];

/** Book slabs so empty display cases read as stacks. Local +Z is the case front. */
export function fillBooks(g, x, z, rotY = 0, opts = {}) {
  const grp = new THREE.Group();
  const shelves = opts.shelves ?? 4;
  const per = opts.perShelf ?? 9;
  const caseW = opts.width ?? 0.78;
  for (let s = 0; s < shelves; s++) {
    const y0 = 0.28 + s * 0.46;
    for (let i = 0; i < per; i++) {
      const bw = 0.04 + (i % 3) * 0.012;
      const bh = 0.22 + ((i + s) % 4) * 0.03;
      const bx = -caseW / 2 + 0.06 + i * (caseW - 0.1) / Math.max(per - 1, 1);
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.16), toon(BOOK_COLORS[(i + s * 3) % BOOK_COLORS.length]));
      m.position.set(bx, y0 + bh / 2, 0.02);
      m.castShadow = true;
      m.receiveShadow = true;
      grp.add(m);
    }
  }
  grp.position.set(x, 0, z);
  grp.rotation.y = rotY;
  g.add(grp);
  return grp;
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  let shadingMode = 'toon';

  setStatus('loading layout…');
  const layout = await fetch('./layout.json').then((r) => r.json());
  if (opts.prepareLayout) opts.prepareLayout(layout);

  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const clear = (layout.shell && layout.shell.clearColor) || '#d4dce2';
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
  controls.minDistance = 0.7;
  controls.maxDistance = 28;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: 0xfff0dd, ground: 0x5a6a58, intensity: 0.55 };
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
  const keySpec = layout.lights?.key || { color: 0xfff4e8, intensity: 1.35, position: [6.5, 11, 4.5] };
  const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
  key.position.set(...keySpec.position);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const ext = Math.max(layout.meta.room.width, layout.meta.room.depth) * 0.75;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 40;
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
        const prepared = prepareAsset(gltf.scene, spec.targetHeight);
        applyShading(prepared, shadingMode);
        prototypes[kind] = prepared;
      } catch (err) {
        console.error('GLB failed', kind, spec.glb, err);
        setStatus(`failed ${kind}`);
        throw err;
      }
    }),
  );

  const props = new THREE.Group();
  props.name = 'props';
  scene.add(props);
  for (const inst of layout.instances || []) {
    const proto = prototypes[inst.kind];
    if (!proto) {
      console.warn('missing prototype', inst.kind);
      continue;
    }
    const node = proto.clone(true);
    applyShading(node, shadingMode);
    node.position.set(inst.position[0], inst.position[1], inst.position[2]);
    if (inst.rotationY) node.rotation.y = inst.rotationY;
    if (Array.isArray(inst.scale)) {
      if (inst.scale.length === 3) node.scale.multiply(new THREE.Vector3(...inst.scale));
      else node.scale.multiplyScalar(inst.scale[0]);
    } else if (inst.scale) node.scale.multiplyScalar(inst.scale);
    node.name = inst.id;
    node.userData.role = inst.role || '';
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
  if (params.get('hud') === '0') {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
  }
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

  window.__scene = { renderer, scene, camera, controls, setMode, layout };
  window.__cafe = window.__scene;

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
