import * as THREE from "three";
import { OrbitControls } from "./vendor/controls/OrbitControls.js";
import { GLTFLoader } from "./vendor/loaders/GLTFLoader.js";

export function makeToonGradient(steps = 4) {
  const data = new Uint8Array(steps * 4);
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const v = Math.round((0.4 + 0.6 * t) * 255);
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

function emissiveFrom(src) {
  if (src && src.emissive && src.emissive.isColor) return src.emissive.clone();
  return new THREE.Color(0x000000);
}

export function toToonMaterial(src) {
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
    gradientMap: toonGradient,
    map: src && src.map ? src.map : null,
    vertexColors: !!(src && src.vertexColors),
    emissive: emissiveFrom(src),
    emissiveIntensity: src && src.emissiveIntensity != null ? src.emissiveIntensity : 1,
    side: (src && src.side) || THREE.FrontSide,
  });
  if (src && src.transparent) {
    m.transparent = true;
    m.opacity = src.opacity ?? 1;
  }
  return m;
}

export function toUnlitMaterial(src) {
  const color = colorFromMaterial(src);
  if (src && src.emissive && src.emissiveIntensity > 0.2) {
    color.lerp(src.emissive, 0.65);
  }
  return new THREE.MeshBasicMaterial({
    color,
    map: src && src.map ? src.map : null,
    vertexColors: !!(src && src.vertexColors),
    side: (src && src.side) || THREE.FrontSide,
    transparent: !!(src && src.transparent),
    opacity: src && src.opacity != null ? src.opacity : 1,
  });
}

export function applyShading(root, mode) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.userData.lockMaterial) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!materialBackup.has(obj)) materialBackup.set(obj, mats.map((m) => m));
    const originals = materialBackup.get(obj);
    const next = originals.map((src) => (mode === "toon" ? toToonMaterial(src) : toUnlitMaterial(src)));
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
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    vertexColors: !!opts.vertexColors,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
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

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

export function tagShadow(mesh, cast = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  return mesh;
}

export function bootRenderer({ canvas, layout, shadingMode }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFHardShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const clear = layout.shell?.clearColor || "#e7b48c";
  renderer.setClearColor(clear, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(layout.shell?.fogColor || clear, layout.shell?.fogNear ?? 34, layout.shell?.fogFar ?? 78);

  const cam = layout.camera;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.08, 220);
  camera.position.set(...cam.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...cam.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 1.6;
  controls.maxDistance = 42;
  controls.update();

  const hemi = layout.lights.hemi;
  scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));

  const keySpec = layout.lights.key;
  const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
  key.position.set(...keySpec.position);
  key.target.position.set(...(keySpec.target || [0, 1, -2]));
  scene.add(key.target);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 70;
  key.shadow.camera.left = -26;
  key.shadow.camera.right = 26;
  key.shadow.camera.top = 26;
  key.shadow.camera.bottom = -26;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.045;
  scene.add(key);

  const fillSpec = layout.lights.fill;
  const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
  fill.position.set(...fillSpec.position);
  scene.add(fill);

  return { renderer, scene, camera, controls, key };
}

export async function loadPrototypes(layout, shadingMode) {
  const loader = new GLTFLoader();
  const prototypes = {};
  const kinds = Object.keys(layout.assets || {});
  await Promise.all(
    kinds.map(async (kind) => {
      const spec = layout.assets[kind];
      const gltf = await loader.loadAsync(spec.glb);
      const prepared = prepareAsset(gltf.scene, spec.targetHeight);
      applyShading(prepared, shadingMode);
      prototypes[kind] = prepared;
    }),
  );
  return prototypes;
}

export function placeInstances(layout, prototypes, shadingMode) {
  const props = new THREE.Group();
  props.name = "props";
  for (const inst of layout.instances || []) {
    const proto = prototypes[inst.kind];
    if (!proto) continue;
    const node = proto.clone(true);
    applyShading(node, shadingMode);
    node.position.set(inst.position[0], inst.position[1], inst.position[2]);
    if (inst.rotationY != null) node.rotation.y = inst.rotationY;
    node.name = inst.id;
    node.userData.kind = inst.kind;
    props.add(node);
  }
  return props;
}
