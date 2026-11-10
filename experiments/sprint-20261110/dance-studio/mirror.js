import * as THREE from 'three';

/**
 * One-bounce planar mirror. The reflector mesh lives on layer 1 so the
 * reflection camera (layer 0) cannot see it. Non-recursive by construction.
 */
export function attachPlanarMirror(mesh) {
  const rt = new THREE.WebGLRenderTarget(1280, 720, {
    type: THREE.HalfFloatType,
    depthBuffer: true,
    samples: 0,
  });
  rt.texture.generateMipmaps = false;
  rt.texture.minFilter = THREE.LinearFilter;
  rt.texture.magFilter = THREE.LinearFilter;

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: rt.texture },
      tint: { value: new THREE.Color('#e7eef2') },
      textureMatrix: { value: new THREE.Matrix4() },
    },
    vertexShader: `
      uniform mat4 textureMatrix;
      varying vec4 vUv;
      void main() {
        vUv = textureMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec3 tint;
      varying vec4 vUv;
      void main() {
        if (vUv.w <= 0.0) discard;
        vec4 base = texture2DProj(tDiffuse, vUv);
        float lum = dot(base.rgb, vec3(0.299, 0.587, 0.114));
        vec3 glass = vec3(0.58, 0.66, 0.70);
        vec3 col = mix(glass, base.rgb, smoothstep(0.012, 0.14, lum));
        col = mix(col, col * tint, 0.16);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  mat.toneMapped = false;

  mesh.material = mat;
  mesh.userData.keepMaterial = true;
  mesh.userData.shadowMode = 'none';
  mesh.layers.set(1);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.name = 'mirror-glass';

  const virtual = new THREE.PerspectiveCamera();
  const reflectorWorldPosition = new THREE.Vector3();
  const cameraWorldPosition = new THREE.Vector3();
  const rotationMatrix = new THREE.Matrix4();
  const normal = new THREE.Vector3();
  const view = new THREE.Vector3();
  const lookAtPosition = new THREE.Vector3();
  const target = new THREE.Vector3();
  const clipPlane = new THREE.Vector4();
  const q = new THREE.Vector4();
  const reflectorPlane = new THREE.Plane();
  const textureMatrix = mat.uniforms.textureMatrix.value;
  const drawSize = new THREE.Vector2();
  let rendering = false;

  mesh.onBeforeRender = (renderer, scene, camera) => {
    if (rendering) return;
    reflectorWorldPosition.setFromMatrixPosition(mesh.matrixWorld);
    cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);
    rotationMatrix.extractRotation(mesh.matrixWorld);
    normal.set(0, 0, 1).applyMatrix4(rotationMatrix);

    view.subVectors(reflectorWorldPosition, cameraWorldPosition);
    if (view.dot(normal) > 0) return;

    view.reflect(normal).negate();
    view.add(reflectorWorldPosition);

    rotationMatrix.extractRotation(camera.matrixWorld);
    lookAtPosition.set(0, 0, -1).applyMatrix4(rotationMatrix).add(cameraWorldPosition);
    target.subVectors(reflectorWorldPosition, lookAtPosition);
    target.reflect(normal).negate();
    target.add(reflectorWorldPosition);

    virtual.position.copy(view);
    virtual.up.set(0, 1, 0).applyMatrix4(rotationMatrix).reflect(normal);
    virtual.lookAt(target);
    virtual.near = camera.near;
    virtual.far = camera.far;
    virtual.fov = camera.fov;
    virtual.aspect = camera.aspect;
    virtual.updateProjectionMatrix();
    virtual.updateMatrixWorld(true);

    textureMatrix.set(
      0.5, 0, 0, 0.5,
      0, 0.5, 0, 0.5,
      0, 0, 0.5, 0.5,
      0, 0, 0, 1,
    );
    textureMatrix.multiply(virtual.projectionMatrix);
    textureMatrix.multiply(virtual.matrixWorldInverse);
    textureMatrix.multiply(mesh.matrixWorld);

    reflectorPlane.setFromNormalAndCoplanarPoint(normal, reflectorWorldPosition);
    reflectorPlane.applyMatrix4(virtual.matrixWorldInverse);
    clipPlane.set(reflectorPlane.normal.x, reflectorPlane.normal.y, reflectorPlane.normal.z, reflectorPlane.constant);
    const proj = virtual.projectionMatrix;
    q.x = (Math.sign(clipPlane.x) + proj.elements[8]) / proj.elements[0];
    q.y = (Math.sign(clipPlane.y) + proj.elements[9]) / proj.elements[5];
    q.z = -1;
    q.w = (1 + proj.elements[10]) / proj.elements[14];
    const denom = clipPlane.dot(q);
    if (Math.abs(denom) > 1e-6) {
      clipPlane.multiplyScalar(2 / denom);
      proj.elements[2] = clipPlane.x;
      proj.elements[6] = clipPlane.y;
      proj.elements[10] = clipPlane.z + 1;
      proj.elements[14] = clipPlane.w;
    }

    const prevTarget = renderer.getRenderTarget();
    const prevXr = renderer.xr.enabled;
    const prevShadow = renderer.shadowMap.autoUpdate;
    const prevAuto = renderer.autoClear;
    rendering = true;
    renderer.xr.enabled = false;
    renderer.shadowMap.autoUpdate = false;
    renderer.autoClear = true;
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, virtual);
    renderer.xr.enabled = prevXr;
    renderer.shadowMap.autoUpdate = prevShadow;
    renderer.autoClear = prevAuto;
    renderer.setRenderTarget(prevTarget);
    if (prevTarget === null) {
      renderer.getDrawingBufferSize(drawSize);
      renderer.setViewport(0, 0, drawSize.x, drawSize.y);
    }
    rendering = false;
  };

  return mesh;
}
