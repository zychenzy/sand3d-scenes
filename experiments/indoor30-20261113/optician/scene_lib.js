import * as THREE from 'three';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

/** Four hard steps. The floor stays high enough that oak and felt do not crush to black. */
export const TOON_STOPS = [0.42, 0.64, 0.82, 1];

export function makeToonGradient(stops = TOON_STOPS) {
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

/** True unlit: MeshBasicMaterial, no toon ramp and no lights. */
export function toUnlitMaterial(src) {
  const color = colorFromMaterial(src);
  const glow = src && src.emissive && src.emissive.isColor ? src.emissive : null;
  if (glow && (src.emissiveIntensity || 0) > 0.12 && glow.r + glow.g + glow.b > 0.04) {
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
    if (obj.userData.keepBasic || obj.userData.isMirror) {
      obj.castShadow = false;
      obj.receiveShadow = false;
      return;
    }
    if (obj.userData.noShadow) {
      obj.castShadow = false;
      obj.receiveShadow = obj.userData.receiveShadow !== false;
    } else {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
    const originals = materialBackup.get(obj);
    const next = originals.map((src) => (mode === 'toon' ? toToonMaterial(src) : toUnlitMaterial(src)));
    obj.material = Array.isArray(obj.material) ? next : next[0];
  });
}

export function markLamps(root) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const name = (obj.name || '').toLowerCase();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (name.includes('light_tube') || name === 'bulb' || name.includes('bulb')) {
      obj.userData.keepBasic = true;
      obj.material = new THREE.MeshBasicMaterial({ color: 0xfff6d8 });
      return;
    }
    for (const m of mats) {
      if (!m || !m.color) continue;
      if (name === 'shade' || name.includes('green_roof') || name.includes('end_cap')) {
        m.emissive = new THREE.Color('#ffc56a');
        m.emissiveIntensity = 0.48;
      }
    }
  });
}

export function liftCrushed(root) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m || !m.color || !m.color.isColor) continue;
      const sum = m.color.r + m.color.g + m.color.b;
      if (sum < 0.09) m.color.set('#3a3632');
    }
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

export function addBox(g, w, h, d, mat, x, y, z) {
  if (![w, h, d, x, y, z].every(Number.isFinite) || w === 0 || h === 0 || d === 0) return null;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(w), Math.abs(h), Math.abs(d)), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

function asColor(c) {
  if (c && c.isColor) return c;
  return new THREE.Color(c);
}

const _mirrorScratch = {
  plane: new THREE.Plane(),
  normal: new THREE.Vector3(),
  reflectorWorld: new THREE.Vector3(),
  cameraWorld: new THREE.Vector3(),
  rotation: new THREE.Matrix4(),
  look: new THREE.Vector3(),
  target: new THREE.Vector3(),
  view: new THREE.Vector3(),
  clip: new THREE.Vector4(),
  q: new THREE.Vector4(),
};

export function createPlanarMirror(w, h) {
  const target = new THREE.WebGLRenderTarget(384, 576, {
    depthBuffer: true,
    stencilBuffer: false,
  });
  target.texture.colorSpace = THREE.SRGBColorSpace;
  target.texture.minFilter = THREE.LinearFilter;
  target.texture.magFilter = THREE.LinearFilter;
  target.texture.generateMipmaps = false;
  const textureMatrix = new THREE.Matrix4();
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: target.texture },
      textureMatrix: { value: textureMatrix },
      silver: { value: new THREE.Color('#d5e0e8') },
    },
    vertexShader: `
      uniform mat4 textureMatrix;
      varying vec4 vMirrorUv;
      void main() {
        vMirrorUv = textureMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec3 silver;
      varying vec4 vMirrorUv;
      void main() {
        vec4 p = vMirrorUv;
        vec3 base = texture2DProj(tDiffuse, p).rgb;
        float l = max(base.r, max(base.g, base.b));
        float cover = smoothstep(0.025, 0.14, l);
        vec3 col = mix(silver, base * 0.92 + silver * 0.08, cover);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.name = 'mirror-glass';
  mesh.userData.isMirror = true;
  mesh.userData.keepBasic = true;
  const virt = new THREE.PerspectiveCamera(40, 1, 0.08, 40);
  return { mesh, target, textureMatrix, virt };
}

export function updatePlanarMirror(renderer, scene, camera, mirror) {
  const s = _mirrorScratch;
  const mesh = mirror.mesh;
  const virt = mirror.virt;
  s.reflectorWorld.setFromMatrixPosition(mesh.matrixWorld);
  s.cameraWorld.setFromMatrixPosition(camera.matrixWorld);
  s.rotation.extractRotation(mesh.matrixWorld);
  s.normal.set(0, 0, 1).applyMatrix4(s.rotation);
  s.view.subVectors(s.reflectorWorld, s.cameraWorld);
  if (s.view.dot(s.normal) > 0) return false;
  s.view.reflect(s.normal).negate();
  s.view.add(s.reflectorWorld);
  s.rotation.extractRotation(camera.matrixWorld);
  s.look.set(0, 0, -1).applyMatrix4(s.rotation).add(s.cameraWorld);
  s.target.subVectors(s.reflectorWorld, s.look);
  s.target.reflect(s.normal).negate();
  s.target.add(s.reflectorWorld);
  virt.position.copy(s.view);
  virt.up.set(0, 1, 0);
  virt.lookAt(s.target);
  virt.near = camera.near;
  virt.far = camera.far;
  virt.fov = camera.fov;
  virt.aspect = camera.aspect;
  virt.updateProjectionMatrix();
  virt.updateMatrixWorld(true);
  virt.matrixWorldInverse.copy(virt.matrixWorld).invert();

  mirror.textureMatrix.set(
    0.5, 0, 0, 0.5,
    0, 0.5, 0, 0.5,
    0, 0, 0.5, 0.5,
    0, 0, 0, 1,
  );
  mirror.textureMatrix.multiply(virt.projectionMatrix);
  mirror.textureMatrix.multiply(virt.matrixWorldInverse);
  mirror.textureMatrix.multiply(mesh.matrixWorld);

  s.plane.setFromNormalAndCoplanarPoint(s.normal, s.reflectorWorld);
  s.plane.applyMatrix4(virt.matrixWorldInverse);
  s.clip.set(s.plane.normal.x, s.plane.normal.y, s.plane.normal.z, s.plane.constant);
  const projectionMatrix = virt.projectionMatrix;
  s.q.x = (Math.sign(s.clip.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
  s.q.y = (Math.sign(s.clip.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
  s.q.z = -1;
  s.q.w = (1 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];
  const scale = 2 / s.clip.dot(s.q);
  s.clip.multiplyScalar(scale);
  projectionMatrix.elements[2] = s.clip.x;
  projectionMatrix.elements[6] = s.clip.y;
  projectionMatrix.elements[10] = s.clip.z + 1 - 0.003;
  projectionMatrix.elements[14] = s.clip.w;

  const hidden = [];
  scene.traverse((obj) => {
    if (obj.userData && obj.userData.hideInMirror && obj.visible) {
      hidden.push(obj);
      obj.visible = false;
    }
  });
  mesh.visible = false;
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(mirror.target);
  renderer.render(scene, virt);
  renderer.setRenderTarget(prev);
  mesh.visible = true;
  for (const obj of hidden) obj.visible = true;
  return true;
}

export async function boot(opts) {
  const statusEl = document.getElementById('status');
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  let shadingMode = 'toon';
  window.__errors = window.__errors || [];

  setStatus('loading layout…');
  const layout = await fetch('./layout.json').then((r) => r.json());
  const params = new URLSearchParams(location.search);
  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  const dprCap = params.get('dpr') ? Number(params.get('dpr')) : 1.25;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const clear = (layout.shell && layout.shell.clearColor) || '#e6dfd4';
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(layout.shell?.fogColor || clear, layout.shell?.fogNear ?? 16, layout.shell?.fogFar ?? 36);
  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.08, 80);
  camera.position.set(...cam.position);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 1.1;
  controls.maxDistance = 26;
  controls.update();

  const hemi = layout.lights?.hemi || { sky: '#fff4e6', ground: '#8d7c68', intensity: 0.5 };
  scene.add(new THREE.HemisphereLight(asColor(hemi.sky), asColor(hemi.ground), hemi.intensity));
  const keySpec = layout.lights.key;
  const key = new THREE.DirectionalLight(asColor(keySpec.color), keySpec.intensity);
  key.position.set(...keySpec.position);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 32;
  key.shadow.camera.left = -9;
  key.shadow.camera.right = 9;
  key.shadow.camera.top = 9;
  key.shadow.camera.bottom = -9;
  key.shadow.bias = -0.0016;
  key.shadow.normalBias = 0.08;
  scene.add(key);
  const fillSpec = layout.lights.fill;
  const fill = new THREE.DirectionalLight(asColor(fillSpec.color), fillSpec.intensity);
  fill.position.set(...fillSpec.position);
  scene.add(fill);
  for (const p of layout.lights.points || []) {
    const pl = new THREE.PointLight(asColor(p.color), p.intensity ?? 0.4, p.distance ?? 6, 2);
    pl.position.set(...p.position);
    scene.add(pl);
  }

  const shell = opts.makeShell(layout);
  scene.add(shell);
  const procedural = opts.makeProcedural ? opts.makeProcedural(layout) : new THREE.Group();
  scene.add(procedural);
  applyShading(shell, shadingMode);
  applyShading(procedural, shadingMode);

  const loader = new GLTFLoader();
  const prototypes = {};
  const kinds = Object.keys(layout.assets || {});
  setStatus(`loading ${kinds.length} GLBs…`);
  await Promise.all(kinds.map(async (kind) => {
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
      liftCrushed(prepared);
      if (opts.prepareKind) opts.prepareKind(kind, prepared);
      markLamps(prepared);
      applyShading(prepared, shadingMode);
      prototypes[kind] = prepared;
    } catch (err) {
      const msg = `${kind} failed (${spec.glb}): ${err && err.message ? err.message : err}`;
      window.__errors.push(msg);
      throw err;
    }
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
    node.userData.zone = inst.zone || '';
    props.add(node);
  }
  if (opts.dress) opts.dress(layout, props);

  function setMode(mode) {
    shadingMode = mode;
    applyShading(shell, mode);
    applyShading(procedural, mode);
    applyShading(props, mode);
    const modeEl = document.getElementById('mode');
    if (modeEl) modeEl.textContent = mode.toUpperCase();
  }

  if (params.get('mode') === 'unlit') setMode('unlit');
  if (params.get('shot') === '1' || params.get('hud') === '0') {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
  }
  const camKey = params.get('cam');
  if (camKey && layout.cameraPresets && layout.cameraPresets[camKey]) {
    const p = layout.cameraPresets[camKey];
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

  function boundsOf(name) {
    const obj = scene.getObjectByName(name);
    if (!obj) return null;
    const box = new THREE.Box3().setFromObject(obj);
    return {
      min: [box.min.x, box.min.y, box.min.z],
      max: [box.max.x, box.max.y, box.max.z],
    };
  }

  function audit() {
    let nan = 0;
    let meshes = 0;
    let toon = 0;
    let basic = 0;
    let frames = 0;
    scene.traverse((obj) => {
      if (obj.userData && obj.userData.frame) frames += 1;
      if (!obj.isMesh) return;
      meshes += 1;
      const p = obj.getWorldPosition(new THREE.Vector3());
      if (![p.x, p.y, p.z].every(Number.isFinite)) nan += 1;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (!m) continue;
        if (m.isMeshToonMaterial) toon += 1;
        if (m.isMeshBasicMaterial) basic += 1;
      }
    });
    const mirror = scene.getObjectByName('mirror-glass');
    const mirrorOK = !!(mirror && mirror.material && mirror.material.uniforms && mirror.material.uniforms.tDiffuse.value);
    return {
      nan,
      meshes,
      toon,
      basic,
      frames,
      mode: shadingMode,
      mirrorOK,
      errors: window.__errors.slice(),
    };
  }

  window.__bounds = boundsOf;
  window.__audit = audit;
  window.__scene = { renderer, scene, camera, controls, setMode, layout };
  window.__ready = true;
  setStatus(window.__errors.length ? window.__errors.join(' | ') : (opts.readyText || 'ready — drag orbit · T toon · U unlit'));

  let frames = 0;
  function tick() {
    controls.update();
    if (opts.onFrame) opts.onFrame(renderer, scene, camera);
    renderer.render(scene, camera);
    frames += 1;
    if (frames >= 3) window.__shotReady = true;
    requestAnimationFrame(tick);
  }
  tick();
}
