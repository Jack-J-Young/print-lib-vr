import * as THREE from "three";

export interface RayFrame {
  rot:    THREE.Matrix4;
  origin: THREE.Vector3;
  dir:    THREE.Vector3;
}

export function createRayFrame(): RayFrame {
  return {
    rot:    new THREE.Matrix4(),
    origin: new THREE.Vector3(),
    dir:    new THREE.Vector3(),
  };
}

// Resolve an XR source (targetRay / grip) into a world-space ray: its origin
// plus a forward direction obtained by rotating `localForward` into world space.
// Writes into the caller-owned `out` so the per-frame path stays allocation-free.
export function decomposeRayFrame(
  object: THREE.Object3D,
  localForward: THREE.Vector3,
  out: RayFrame,
): void {
  object.updateWorldMatrix(true, false);
  out.rot.extractRotation(object.matrixWorld);
  out.origin.setFromMatrixPosition(object.matrixWorld);
  out.dir.copy(localForward).applyMatrix4(out.rot);
}
