/**
 * Local Toon / Unlit adapter for the cold stained-glass workshop.
 * Three.js r170 stays in workshop/vendor (import map). This file is not a
 * second copy of the shared renderer. Gradient steps stay hard (nearest).
 * Transparent streak maps, emissive, depthWrite, and polygonOffset survive
 * both shading modes so coloured glass does not collapse to flat paint.
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
  tex.generateMipmaps = false;
  return tex;
}

export const toonGradient = makeToonGradient(4);
const materialBackup = new WeakMap();

function colorFromMaterial(mat) {
  if (!mat) return new THREE.Color(0xaaaaaa);
  if (mat.color && mat.color.isColor) return mat.color.clone();
  return new THREE.Color(0xaaaaaa);
}

function copyOffset(dst, src) {
  if (src && src.polygonOffset) {
    dst.polygonOffset = true;
    dst.polygonOffsetFactor = src.polygonOffsetFactor;
    dst.polygonOffsetUnits = src.polygonOffsetUnits;
  }
}

export function toToonMaterial(src) {
  const color = colorFromMaterial(src);
  const m = new THREE.MeshToonMaterial({
    color,
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
    m.depthWrite = src.depthWrite !== undefined ? src.depthWrite : false;
  } else if (src && src.depthWrite === false) {
    m.depthWrite = false;
  }
  copyOffset(m, src);
  return m;
}

export function toUnlitMaterial(src) {
  const color = colorFromMaterial(src);
  const e = src && src.emissive;
  const ei = src && src.emissiveIntensity != null ? src.emissiveIntensity : 1;
  if (e && e.isColor && (e.r + e.g + e.b) > 0.08 && ei > 0.2) {
    color.lerp(e, Math.min(0.62, 0.28 + ei * 0.25));
  }
  const m = new THREE.MeshBasicMaterial({
    color,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
  });
  if (src && src.depthWrite === false) m.depthWrite = false;
  else if (src && src.transparent && src.depthWrite === false) m.depthWrite = false;
  copyOffset(m, src);
  return m;
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const data = obj.userData || {};
    const skipShadow = !!data.noShadow;
    obj.castShadow = !(skipShadow || data.noCast);
    obj.receiveShadow = !skipShadow;
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
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    side: opts.side || THREE.FrontSide,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    depthWrite: opts.depthWrite !== undefined ? opts.depthWrite : !opts.transparent,
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

export function tagShadow(mesh, cast = true) {
  mesh.userData.noShadow = !cast;
  mesh.castShadow = cast;
  mesh.receiveShadow = cast;
  return mesh;
}

/** Cutaway room. Back wall is -Z, left wall is -X. Front and right stay open. */
export function makeCutawayShell(layout, extra = {}) {
  const g = new THREE.Group();
  g.name = 'shell';
  const { width: W, depth: D, height: H } = layout.meta.room;
  const s = layout.shell || {};
  const floorMat = toon(s.floorColor || '#c4b49a');
  const wallMat = toon(s.wallColor || '#efe6d4');
  const ceilMat = toon(s.ceilingColor || '#f3eee4');

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, D), floorMat);
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  floor.castShadow = false;
  floor.userData.noCast = true;
  g.add(floor);

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.14), wallMat);
  back.position.set(0, H / 2, -D / 2);
  back.receiveShadow = true;
  back.castShadow = false;
  back.userData.noCast = true;
  g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.14, H, D), wallMat);
  left.position.set(-W / 2, H / 2, 0);
  left.receiveShadow = true;
  left.castShadow = false;
  left.userData.noCast = true;
  g.add(left);

  if (extra.ceiling !== false) {
    const cw = extra.ceilingW ?? W * 0.92;
    const cd = extra.ceilingD ?? D * 0.55;
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.08, cd), ceilMat);
    ceil.position.set(extra.ceilingX ?? -0.15, H - 0.04, extra.ceilingZ ?? -D * 0.18);
    ceil.receiveShadow = true;
    ceil.castShadow = false;
    ceil.userData.noCast = true;
    g.add(ceil);
  }
  return g;
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  let shadingMode = 'toon';
  const errors = [];
  window.addEventListener('error', (ev) => {
    errors.push(String(ev.message || ev.error || 'error'));
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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    const clear = (layout.shell && layout.shell.clearColor) || '#d4dce2';
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
    controls.minDistance = 0.9;
    controls.maxDistance = 26;
    controls.update();

    const hemi = layout.lights?.hemi || { sky: 0xfff0dd, ground: 0x8a6844, intensity: 0.58 };
    scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
    const keySpec = layout.lights?.key || { color: 0xfff4e8, intensity: 1.15, position: [6.2, 9.2, 5.2] };
    const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
    key.position.set(...keySpec.position);
    key.castShadow = true;
    const ext = keySpec.shadowExtent ?? 14;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.4;
    key.shadow.camera.far = 46;
    key.shadow.camera.left = -ext;
    key.shadow.camera.right = ext;
    key.shadow.camera.top = ext;
    key.shadow.camera.bottom = -ext;
    key.shadow.bias = keySpec.bias ?? -0.0004;
    key.shadow.normalBias = keySpec.normalBias ?? 0.045;
    scene.add(key);
    const fillSpec = layout.lights?.fill || { color: 0xd5e2f4, intensity: 0.36, position: [-6, 4.5, 2.4] };
    const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
    fill.position.set(...fillSpec.position);
    scene.add(fill);
    if (layout.lights?.points) {
      for (const p of layout.lights.points) {
        const pl = new THREE.PointLight(p.color || 0xffd8a8, p.intensity ?? 1, p.distance ?? 8, p.decay ?? 2);
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
        let gltf;
        try {
          gltf = await loader.loadAsync(spec.glb);
        } catch (err) {
          throw new Error(`${kind} (${spec.glb}): ${err.message || err}`);
        }
        const prepared = prepareAsset(gltf.scene, spec.targetHeight);
        if (opts.decorateAsset) opts.decorateAsset(kind, prepared);
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
    if (params.get('hud') === '0') {
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

    let meshCount = 0;
    scene.traverse((o) => { if (o.isMesh) meshCount += 1; });
    window.__scene = { renderer, scene, camera, controls, setMode, layout, meshCount, errors };
    window.__cafe = window.__scene;

    function tick() {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();
  } catch (err) {
    console.error(err);
    setStatus(`error: ${err.message || err}`);
    window.__scene = { errors: errors.concat(String(err.message || err)), meshCount: 0 };
  }
}
