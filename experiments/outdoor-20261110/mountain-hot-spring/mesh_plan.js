import * as THREE from './vendor/three.module.js';

function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

/** XZ polygon to shape-space points. positive=true keeps a CCW outer path. */
function toShapePts(xz, positive) {
  let pts = xz.map(([x, z]) => [x, -z]);
  const area = signedArea(pts);
  if ((positive && area < 0) || (!positive && area > 0)) pts = pts.slice().reverse();
  return pts;
}

export function planarGeometry(outerXZ, holesXZ = []) {
  const outer = toShapePts(outerXZ, true);
  const shape = new THREE.Shape();
  shape.moveTo(outer[0][0], outer[0][1]);
  for (let i = 1; i < outer.length; i++) shape.lineTo(outer[i][0], outer[i][1]);
  for (const hole of holesXZ) {
    if (!hole || hole.length < 3) continue;
    const hp = toShapePts(hole, false);
    const path = new THREE.Path();
    path.moveTo(hp[0][0], hp[0][1]);
    for (let i = 1; i < hp.length; i++) path.lineTo(hp[i][0], hp[i][1]);
    shape.holes.push(path);
  }
  return new THREE.ShapeGeometry(shape);
}

/** Bake the plan into the XZ plane with the surface facing +Y. */
export function layFlat(geo, y) {
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, y, 0);
  geo.computeVertexNormals();
  return geo;
}
