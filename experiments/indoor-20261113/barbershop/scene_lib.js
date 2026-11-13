import * as THREE from 'three';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

export function makeToonGradient(steps = 4) {
  // Hold a dark band so leather, chrome, and wall panels separate under one key light.
  const stops = steps === 4 ? [16, 68, 158, 255] : null;
  const data = new Uint8Array(steps * 4);
  for (let i = 0; i < steps; i++) {
    const v = stops ? stops[i] : Math.round((i / (steps - 1)) * 255);
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

export function toToonMaterial(src) {
  const color = colorFromMaterial(src);
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: !(src && src.depthWrite === false),
    emissive: src && src.emissive && src.emissive.isColor ? src.emissive.clone() : new THREE.Color(0x000000),
    emissiveIntensity: src && src.emissiveIntensity != null ? src.emissiveIntensity : 1,
  });
  if (src && src.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = src.polygonOffsetFactor;
    m.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  return m;
}

export function toUnlitMaterial(src) {
  const color = colorFromMaterial(src);
  const glow = src && src.emissive && src.emissive.isColor ? src.emissive : null;
  if (glow && (src.emissiveIntensity || 0) > 0.15 && glow.r + glow.g + glow.b > 0.04) {
    color.lerp(glow, Math.min(1, src.emissiveIntensity));
  }
  const m = new THREE.MeshBasicMaterial({
    color,
    map: src && src.map ? src.map : null,
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
    depthWrite: !(src && src.depthWrite === false),
  });
  if (src && src.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = src.polygonOffsetFactor;
    m.polygonOffsetUnits = src.polygonOffsetUnits;
  }
  return m;
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
    if (obj.userData && obj.userData.noShadow) {
      obj.castShadow = false;
      obj.receiveShadow = !!obj.userData.receiveShadow;
    }
    if (obj.userData && obj.userData.mirror) bindStationMirror(obj.material, obj);
  });
}

function bindStationMirror(material, mesh) {
  const mirrorMatrix = mesh.userData.mirrorMatrix;
  const mirrorMap = mesh.userData.mirrorMap;
  if (!mirrorMatrix || !mirrorMap) return;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.mirrorMap = { value: mirrorMap };
    shader.uniforms.mirrorMatrix = { value: mirrorMatrix };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 mirrorMatrix;\nvarying vec4 vMirrorCoord;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n\tvMirrorCoord = mirrorMatrix * vec4(position, 1.0);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D mirrorMap;\nvarying vec4 vMirrorCoord;\nvec3 mirrorReflect;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        mirrorReflect = vec3(0.62, 0.70, 0.74);
        {
          vec2 muv = vMirrorCoord.xy / vMirrorCoord.w;
          if (muv.x > 0.0 && muv.x < 1.0 && muv.y > 0.0 && muv.y < 1.0) {
            mirrorReflect = texture2D(mirrorMap, muv).rgb;
          }
        }
        diffuseColor.rgb = mix(diffuseColor.rgb, mirrorReflect, 0.45);
      `)
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>
        gl_FragColor.rgb = mix(gl_FragColor.rgb, mirrorReflect, 0.8);
      `);
  };
  material.customProgramCacheKey = () => `station-mirror-${material.type}`;
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
    emissive: new THREE.Color(opts.emissive || 0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? (opts.emissive ? 1 : 0),
  });
  if (opts.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = opts.polygonOffsetFactor ?? -1;
    m.polygonOffsetUnits = opts.polygonOffsetUnits ?? -1;
  }
  return m;
}

/** Banker bulbs and pendant shades stay visibly lit in toon mode. */
export function markLamps(root) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const name = (obj.name || '').toLowerCase();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m || !m.color) continue;
      if (name.includes('light_tube') || name === 'bulb' || name.includes('bulb')) {
        m.color.set('#fff4d8');
        m.emissive = new THREE.Color('#fff1c4');
        m.emissiveIntensity = 1;
      } else if (name.includes('green_roof') || name.includes('end_cap') || name === 'shade') {
        m.emissive = new THREE.Color('#ffc56a');
        m.emissiveIntensity = 0.62;
      }
    }
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
  back.name = 'back-wall';
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

  if (glass) {
    const frame = toon(s.woodColor || '#6a4e36');
    for (let x = -W / 2 + 1.15; x < W / 2 - 0.3; x += 1.15) {
      addBox(g, 0.06, H, 0.08, frame, x, H / 2, -D / 2);
    }
    for (let z = -D / 2 + 1.15; z < D / 2 - 0.3; z += 1.15) {
      addBox(g, 0.08, H, 0.06, frame, -W / 2, H / 2, z);
    }
    addBox(g, W, 0.07, 0.08, frame, 0, H - 0.04, -D / 2);
    addBox(g, 0.08, 0.07, D, frame, -W / 2, H - 0.04, 0);
  }
  return g;
}

const BOOK_COLORS = ['#6b3a2a', '#2f4a3c', '#3a3a6a', '#7a5a28', '#5a2a3a', '#2a4a6a', '#4a3a28', '#8a4a2a', '#35503a'];

/** Book slabs so empty display cases read as stacks. Local +Z is the case front. */
export function fillBooks(g, x, z, rotY = 0, opts = {}) {
  const grp = new THREE.Group();
  const shelves = opts.shelves ?? 4;
  const per = opts.perShelf ?? 9;
  const caseW = opts.width ?? 0.78;
  for (let s = 0; s < shelves; s++) {
    const y0 = 0.26 + s * 0.48;
    for (let i = 0; i < per; i++) {
      const bw = 0.042 + (i % 3) * 0.01;
      const bh = 0.2 + ((i + s) % 4) * 0.035;
      const bx = -caseW / 2 + 0.07 + i * (caseW - 0.12) / Math.max(per - 1, 1);
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.15), toon(BOOK_COLORS[(i + s * 3) % BOOK_COLORS.length]));
      m.position.set(bx, y0 + bh / 2, 0.04);
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

export function addFoliage(g, x, z, h = 1.35, color = '#3d6a42') {
  addCyl(g, 0.12, 0.15, 0.18, toon('#7a5340'), x, 0.09, z, 10);
  addCyl(g, 0.025, 0.032, h * 0.42, toon('#4a5a32'), x, 0.2 + h * 0.2, z, 8);
  addBox(g, h * 0.52, h * 0.38, h * 0.44, toon(color), x, 0.38 + h * 0.52, z);
  addBox(g, h * 0.36, h * 0.26, h * 0.32, toon(color), x + 0.1, 0.55 + h * 0.38, z - 0.06);
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  let shadingMode = 'toon';

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
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 40;
  key.shadow.camera.left = -14;
  key.shadow.camera.right = 14;
  key.shadow.camera.top = 14;
  key.shadow.camera.bottom = -14;
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.05;
  key.shadow.camera.left = -16;
  key.shadow.camera.right = 16;
  key.shadow.camera.top = 16;
  key.shadow.camera.bottom = -16;
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
  window.__errors = window.__errors || [];
  await Promise.all(
    kinds.map(async (kind) => {
      const spec = layout.assets[kind];
      try {
        const gltf = await loader.loadAsync(spec.glb);
        const prepared = prepareAsset(gltf.scene, spec.targetHeight);
        if (spec.tint) {
          prepared.traverse((obj) => {
            if (!obj.isMesh || !obj.material) return;
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (const m of mats) if (m && m.color) m.color.set(spec.tint);
          });
        }
        markLamps(prepared);
        applyShading(prepared, shadingMode);
        prototypes[kind] = prepared;
      } catch (err) {
        const msg = `${kind} failed (${spec.glb}): ${err && err.message ? err.message : err}`;
        window.__errors.push(msg);
        setStatus(msg);
        throw err;
      }
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
    if (inst.rotationY) node.rotation.y = inst.rotationY;
    if (Array.isArray(inst.scale)) {
      if (inst.scale.length === 3) node.scale.multiply(new THREE.Vector3(...inst.scale));
      else node.scale.multiplyScalar(inst.scale[0]);
    } else if (inst.scale) node.scale.multiplyScalar(inst.scale);
    node.name = inst.id;
    if (inst.castShadow === false) {
      node.traverse((obj) => {
        if (!obj.isMesh) return;
        obj.userData.noShadow = true;
        obj.castShadow = false;
      });
    }
    if (inst.hide) node.visible = false;
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
    window.__shadingMode = mode;
  }

  const params = new URLSearchParams(location.search);
  if (params.get('mode') === 'unlit') setMode('unlit');
  if (params.get('shot') === '1') {
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
  window.__shadingMode = shadingMode;
  window.__bounds = (name) => {
    let found = null;
    scene.traverse((obj) => {
      if (!found && obj.name === name) found = obj;
    });
    if (!found) return null;
    const box = new THREE.Box3().setFromObject(found);
    if (box.isEmpty()) return null;
    return {
      min: [box.min.x, box.min.y, box.min.z],
      max: [box.max.x, box.max.y, box.max.z],
    };
  };
  window.__ready = true;
  if (window.__errors && window.__errors.length) setStatus(window.__errors.join(' | '));

  function tick() {
    controls.update();
    if (opts.beforeRender) opts.beforeRender(renderer, scene, camera);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
