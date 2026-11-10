/**
 * Local adapter for the ramen-bar scene.
 * Vendored three.js, OrbitControls, and GLTFLoader stay in workshop/vendor
 * and are referenced relatively — not copied.
 * Toon hard: MeshToonMaterial + 4-step gradient + hard shadows.
 */
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
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

export const toonGradient = makeToonGradient(4);
const materialBackup = new WeakMap();

function colorFromMaterial(mat) {
  if (!mat) return new THREE.Color(0xaaaaaa);
  if (mat.color && mat.color.isColor) return mat.color.clone();
  return new THREE.Color(0xaaaaaa);
}

export function toToonMaterial(src) {
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
  });
  if (src && src.emissive && src.emissive.isColor) {
    m.emissive.copy(src.emissive);
    m.emissiveIntensity = src.emissiveIntensity ?? 1;
  }
  if (src && src.transparent) {
    m.transparent = true;
    m.opacity = src.opacity ?? 1;
  }
  if (src && src.depthWrite === false) m.depthWrite = false;
  if (src && src.alphaTest) m.alphaTest = src.alphaTest;
  return m;
}

export function toUnlitMaterial(src) {
  return new THREE.MeshBasicMaterial({
    color: colorFromMaterial(src),
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: !(src && src.depthWrite === false),
  });
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.userData.fixedMaterial) {
      obj.castShadow = false;
      obj.receiveShadow = false;
      return;
    }
    obj.castShadow = !obj.userData.noShadow;
    obj.receiveShadow = !obj.userData.noShadow;
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
    map: opts.map || null,
    gradientMap: toonGradient,
    emissive: new THREE.Color(opts.emissive || 0x000000),
    emissiveIntensity: opts.emissive ? (opts.emissiveIntensity ?? 0.6) : 0,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
  });
  if (opts.alphaTest) m.alphaTest = opts.alphaTest;
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

let contactMap = null;
function getContactMap() {
  if (contactMap) return contactMap;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
  grd.addColorStop(0, 'rgba(28,16,10,0.62)');
  grd.addColorStop(0.45, 'rgba(28,16,10,0.28)');
  grd.addColorStop(1, 'rgba(28,16,10,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  contactMap = new THREE.CanvasTexture(c);
  contactMap.colorSpace = THREE.SRGBColorSpace;
  return contactMap;
}

/** Soft AO decal so feet stay grounded in unlit mode too. rx/rz are radii in metres. */
export function addContact(g, x, z, rx, rz, y = 0.018) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 24),
    new THREE.MeshBasicMaterial({
      map: getContactMap(),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.scale.set(rx, rz, 1);
  m.userData.fixedMaterial = true;
  m.renderOrder = 2;
  g.add(m);
  return m;
}

function paintCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const FONT = '"WenQuanYi Micro Hei", "Droid Sans Fallback", sans-serif';

export function norenTexture(variant) {
  return paintCanvas(160, 420, (ctx) => {
    ctx.fillStyle = variant === 'deep' ? '#9e2a22' : '#c4372c';
    ctx.fillRect(0, 0, 160, 420);
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(0, 0, 14, 420);
    ctx.fillRect(146, 0, 14, 420);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(18, 0, 10, 420);
    if (variant === 'mark') {
      ctx.fillStyle = '#f6f1e6';
      ctx.beginPath();
      ctx.arc(80, 250, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c4372c';
      ctx.beginPath();
      ctx.arc(80, 250, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f6f1e6';
      ctx.font = `700 64px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('麺', 80, 150);
    } else {
      ctx.fillStyle = '#f6f1e6';
      ctx.fillRect(68, 300, 24, 8);
      ctx.font = `600 28px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(variant === 'deep' ? '塩' : '味', 80, 160);
    }
  });
}

export function signTexture() {
  return paintCanvas(512, 160, (ctx, w, h) => {
    ctx.fillStyle = '#6a3a24';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f3e6c8';
    ctx.fillRect(10, 10, w - 20, h - 20);
    ctx.strokeStyle = '#c4372c';
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.fillStyle = '#6a3a24';
    ctx.font = `700 78px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('らーめん', w / 2, h / 2 + 4);
  });
}

export function menuTexture() {
  return paintCanvas(420, 720, (ctx, w, h) => {
    ctx.fillStyle = '#f7f0e2';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c4372c';
    ctx.fillRect(0, 0, w, 86);
    ctx.fillStyle = '#f7f0e2';
    ctx.font = `700 48px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('麺処', w / 2, 46);
    const rows = [
      ['醤油', '#8a4e28', '¥980'],
      ['味噌', '#c4924a', '¥1050'],
      ['塩', '#e6d7b0', '¥980'],
      ['辛味', '#a32020', '¥1100'],
      ['味玉', '#e39b2d', '¥200'],
      ['チャーシュー', '#c46a48', '¥300'],
    ];
    rows.forEach((row, i) => {
      const y = 120 + i * 92;
      ctx.fillStyle = row[1];
      ctx.fillRect(28, y, 54, 54);
      ctx.strokeStyle = '#2a211c';
      ctx.lineWidth = 2;
      ctx.strokeRect(28, y, 54, 54);
      ctx.fillStyle = '#2a211c';
      ctx.font = `600 32px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(row[0], 100, y + 28);
      ctx.font = `500 26px ${FONT}`;
      ctx.fillStyle = '#6a3a24';
      ctx.textAlign = 'right';
      ctx.fillText(row[2], w - 28, y + 30);
    });
  });
}

export function scrollTexture() {
  return paintCanvas(280, 460, (ctx, w, h) => {
    ctx.fillStyle = '#f4edd8';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c4b48a';
    ctx.lineWidth = 8;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.strokeStyle = '#2a211c';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w * 0.55, 80);
    ctx.quadraticCurveTo(w * 0.3, 160, w * 0.62, 230);
    ctx.quadraticCurveTo(w * 0.85, 290, w * 0.4, 360);
    ctx.stroke();
    ctx.fillStyle = '#c4372c';
    ctx.beginPath();
    ctx.arc(78, 360, 28, 0, Math.PI * 2);
    ctx.fill();
  });
}

function tintPrepared(prepared, spec) {
  if (!spec.tint) return;
  const tint = new THREE.Color(spec.tint);
  const amount = spec.tintAmount ?? 0.35;
  prepared.traverse((obj) => {
    if (!obj.isMesh) return;
    const originals = materialBackup.get(obj) || [];
    for (const m of originals) {
      if (m && m.color && m.color.isColor) m.color.lerp(tint, amount);
    }
  });
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  let shadingMode = 'toon';
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
    renderer.toneMapping = THREE.NoToneMapping;
    const clear = (layout.shell && layout.shell.clearColor) || '#d7c3a4';
    renderer.setClearColor(clear, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(
      (layout.shell && layout.shell.fogColor) || clear,
      layout.shell?.fogNear ?? 14,
      layout.shell?.fogFar ?? 32,
    );

    const cam = layout.camera;
    const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.08, 80);
    camera.position.set(...cam.position);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...cam.target);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 1.15;
    controls.maxDistance = 18;
    controls.update();

    const hemi = layout.lights?.hemi || { sky: '#ffe2c0', ground: '#6a4030', intensity: 0.46 };
    scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
    const keySpec = layout.lights?.key || { color: '#fff0d8', intensity: 1.28, position: [3.2, 7.2, 3.4] };
    const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
    key.position.set(...keySpec.position);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 24;
    const fr = layout.lights?.shadowFrustum ?? 5.2;
    key.shadow.camera.left = -fr;
    key.shadow.camera.right = fr;
    key.shadow.camera.top = fr;
    key.shadow.camera.bottom = -fr;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.045;
    const aim = layout.lights?.keyTarget || [-0.2, 0.9, -0.8];
    key.target.position.set(...aim);
    scene.add(key);
    scene.add(key.target);
    const fillSpec = layout.lights?.fill || { color: '#ffc8a0', intensity: 0.22, position: [-4.5, 3.2, 1.2] };
    const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
    fill.position.set(...fillSpec.position);
    scene.add(fill);
    if (layout.lights?.points) {
      for (const p of layout.lights.points) {
        const pl = new THREE.PointLight(p.color || '#ffb060', p.intensity ?? 4, p.distance ?? 3.4, p.decay ?? 2);
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
    await Promise.all(kinds.map(async (kind) => {
      const spec = layout.assets[kind];
      let gltf;
      try {
        gltf = await loader.loadAsync(spec.glb);
      } catch (err) {
        throw new Error(`${kind} (${spec.glb}): ${err.message}`);
      }
      const prepared = prepareAsset(gltf.scene, spec.targetHeight);
      applyShading(prepared, shadingMode);
      tintPrepared(prepared, spec);
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
      if (Array.isArray(inst.scale)) node.scale.multiply(new THREE.Vector3(...inst.scale));
      else if (inst.scale) node.scale.multiplyScalar(inst.scale);
      node.name = inst.id;
      props.add(node);
    }

    const params = new URLSearchParams(location.search);
    if (params.get('shot') === '1') {
      const hud = document.getElementById('hud');
      if (hud) hud.style.display = 'none';
    }

    function setMode(mode) {
      shadingMode = mode;
      applyShading(shell, mode);
      applyShading(procedural, mode);
      applyShading(props, mode);
      const modeEl = document.getElementById('mode');
      if (modeEl) modeEl.textContent = mode.toUpperCase();
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

    const clock = new THREE.Clock();
    window.__scene = { renderer, scene, camera, controls, setMode, layout };
    setStatus(opts.readyText || 'ready — ramen bar');
    window.__ready = true;

    function tick() {
      const t = clock.getElapsedTime();
      if (opts.onFrame) opts.onFrame(t, { scene, camera, shadingMode });
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();
  } catch (err) {
    console.error(err);
    setStatus(`error: ${err.message}`);
    window.__ready = false;
    window.__error = String(err && err.stack || err);
  }
}
