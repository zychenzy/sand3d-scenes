import * as THREE from "three";
import { OrbitControls } from "../../../cafe/vendor/controls/OrbitControls.js";
import { GLTFLoader } from "../../../cafe/vendor/loaders/GLTFLoader.js";

/** Four hard steps. The shadow stop stays at 0.42 so timber does not crush to black. */
export function makeToonGradient(steps = 4) {
  const data = new Uint8Array(steps * 4);
  for (let i = 0; i < steps; i += 1) {
    const t = i / (steps - 1);
    const v = Math.round((0.42 + 0.58 * t) * 255);
    data[i * 4] = v;
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
  if (mat && mat.color && mat.color.isColor) return mat.color.clone();
  return new THREE.Color(0xc8c0b4);
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
  const m = new THREE.MeshToonMaterial({
    color: colorFromMaterial(src),
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
  const m = new THREE.MeshBasicMaterial({
    color,
    map,
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
    obj.castShadow = obj.userData.noCast ? false : true;
    obj.receiveShadow = obj.userData.noReceive ? false : true;
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
  if (opts.map) m.map.colorSpace = THREE.SRGBColorSpace;
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

export function addCyl(g, rTop, rBot, h, mat, x, y, z, seg = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function liftNearBlack(root) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const mat of mats) {
      if (!mat.color) continue;
      if (mat.color.r < 0.045 && mat.color.g < 0.045 && mat.color.b < 0.045) {
        mat.color.set("#3e3a36");
      }
    }
  });
}

function markEmitters(root) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    if (!/bulb|light_tube/i.test(o.name || "")) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const mat of mats) {
      mat.color = new THREE.Color("#fff4dc");
      mat.emissive = new THREE.Color("#fff1d0");
      mat.emissiveIntensity = 0.95;
    }
  });
}

export async function boot(opts) {
  const statusEl = document.getElementById("status");
  const setStatus = (t) => {
    if (statusEl) statusEl.textContent = t;
  };
  window.__errors = [];
  window.addEventListener("error", (ev) => {
    window.__errors.push(String(ev.message || ev.error || "error"));
  });
  window.addEventListener("unhandledrejection", (ev) => {
    window.__errors.push(String(ev.reason || "rejection"));
  });
  let shadingMode = "toon";

  try {
    setStatus("loading layout…");
    const layout = await fetch("./layout.json").then((r) => {
      if (!r.ok) throw new Error("layout.json " + r.status);
      return r.json();
    });

    const canvas = document.getElementById("c");
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFHardShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    const clear = (layout.shell && layout.shell.clearColor) || "#d7d1c6";
    renderer.setClearColor(clear, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(layout.shell?.fogColor || clear, layout.shell?.fogNear ?? 18, layout.shell?.fogFar ?? 40);

    const cam = layout.camera;
    const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.05, 80);
    camera.position.set(...cam.position);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...cam.target);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 0.55;
    controls.maxDistance = 24;
    controls.update();

    const hemi = layout.lights?.hemi || { sky: "#fff4e6", ground: "#8a7560", intensity: 0.58 };
    scene.add(new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));
    const keySpec = layout.lights?.key || { color: "#fff3e4", intensity: 1.05, position: [5.2, 7.4, 4.4] };
    const key = new THREE.DirectionalLight(keySpec.color, keySpec.intensity);
    key.position.set(...keySpec.position);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 28;
    const ext = keySpec.shadowExtent ?? 9;
    key.shadow.camera.left = -ext;
    key.shadow.camera.right = ext;
    key.shadow.camera.top = ext;
    key.shadow.camera.bottom = -ext;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.08;
    scene.add(key);
    const fillSpec = layout.lights?.fill || { color: "#d5dde8", intensity: 0.28, position: [-4.5, 4.2, 2.2] };
    const fill = new THREE.DirectionalLight(fillSpec.color, fillSpec.intensity);
    fill.position.set(...fillSpec.position);
    scene.add(fill);

    if (layout.lights?.spots) {
      for (const s of layout.lights.spots) {
        const spot = new THREE.SpotLight(
          s.color ?? 0xfff1d4,
          s.intensity ?? 8,
          s.distance ?? 3.4,
          s.angle ?? 0.4,
          s.penumbra ?? 0.4,
          s.decay ?? 1.6,
        );
        spot.position.set(...s.position);
        spot.target.position.set(...(s.target || [0, 1.73, 0]));
        scene.add(spot.target);
        scene.add(spot);
      }
    }

    const built = opts.makeRoom(layout);
    scene.add(built);
    applyShading(built, shadingMode);

    const loader = new GLTFLoader();
    const prototypes = {};
    const kinds = Object.keys(layout.assets || {});
    setStatus(`loading ${kinds.length} GLBs…`);
    await Promise.all(
      kinds.map(async (kind) => {
        const spec = layout.assets[kind];
        const gltf = await loader.loadAsync(spec.glb);
        const prepared = prepareAsset(gltf.scene, spec.targetHeight);
        liftNearBlack(prepared);
        markEmitters(prepared);
        applyShading(prepared, shadingMode);
        prototypes[kind] = prepared;
      }),
    );

    const props = new THREE.Group();
    props.name = "props";
    scene.add(props);
    for (const inst of layout.instances || []) {
      const proto = prototypes[inst.kind];
      if (!proto) throw new Error("missing kind " + inst.kind);
      const node = proto.clone(true);
      applyShading(node, shadingMode);
      node.position.set(inst.position[0], inst.position[1], inst.position[2]);
      if (inst.rotationY != null) node.rotation.y = inst.rotationY;
      node.name = inst.id;
      node.userData.kind = inst.kind;
      props.add(node);
    }

    const report = opts.checkBuilt ? opts.checkBuilt(built, props) : [];
    for (const err of report) window.__errors.push(err);

    setStatus(report.length ? "layout check failed" : opts.readyText || "ready — drag orbit · U unlit · T toon");

    function setMode(mode) {
      shadingMode = mode;
      applyShading(built, mode);
      applyShading(props, mode);
      const modeEl = document.getElementById("mode");
      if (modeEl) modeEl.textContent = mode.toUpperCase();
    }

    const params = new URLSearchParams(location.search);
    if (params.get("hud") === "0") {
      const hud = document.getElementById("hud");
      if (hud) hud.style.display = "none";
    }
    if (params.get("shot") === "1") controls.enableDamping = false;
    if (params.get("mode") === "unlit") setMode("unlit");
    const presets = layout.cameraPresets || {};
    const camKey = params.get("cam");
    if (camKey && presets[camKey]) {
      const p = presets[camKey];
      camera.position.set(...p.position);
      controls.target.set(...p.target);
      controls.update();
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "u" || e.key === "U") setMode("unlit");
      if (e.key === "t" || e.key === "T") setMode("toon");
    });
    document.getElementById("btn-toon")?.addEventListener("click", () => setMode("toon"));
    document.getElementById("btn-unlit")?.addEventListener("click", () => setMode("unlit"));

    window.addEventListener("resize", () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    window.__scene = { renderer, scene, camera, controls, setMode, layout, ready: report.length === 0 };
    if (report.length) window.__scene.error = report.join("; ");

    const shot = params.get("shot") === "1";
    let frames = 0;
    function tick() {
      controls.update();
      renderer.render(scene, camera);
      frames += 1;
      if (shot && frames >= 8) {
        document.title = "SHOT_READY";
        return;
      }
      requestAnimationFrame(tick);
    }
    tick();
  } catch (err) {
    console.error(err);
    window.__errors.push(String((err && err.stack) || err));
    setStatus("error — " + err);
    window.__scene = { ready: false, error: String(err) };
  }
}
