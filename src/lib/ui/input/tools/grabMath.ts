import * as THREE from "three";

export interface GrabScratch {
  ctrlPos: THREE.Vector3;
  ctrlInv: THREE.Matrix4;
  objMat: THREE.Matrix4;
  objPos: THREE.Vector3;
  toObj: THREE.Vector3;
  newLocal: THREE.Vector3;
  T: THREE.Matrix4;
  Tinv: THREE.Matrix4;
  R: THREE.Matrix4;
  rotAbout: THREE.Matrix4;
  newWorld: THREE.Matrix4;
  newOff: THREE.Matrix4;
}

export function createGrabScratch(): GrabScratch {
  return {
    ctrlPos: new THREE.Vector3(),
    ctrlInv: new THREE.Matrix4(),
    objMat: new THREE.Matrix4(),
    objPos: new THREE.Vector3(),
    toObj: new THREE.Vector3(),
    newLocal: new THREE.Vector3(),
    T: new THREE.Matrix4(),
    Tinv: new THREE.Matrix4(),
    R: new THREE.Matrix4(),
    rotAbout: new THREE.Matrix4(),
    newWorld: new THREE.Matrix4(),
    newOff: new THREE.Matrix4(),
  };
}

export function composeOffset(
  matrix: THREE.Matrix4,
  objWorld: THREE.Matrix4,
  out: THREE.Matrix4,
): THREE.Matrix4 {
  return out.copy(matrix).invert().multiply(objWorld);
}

export function placeIntoParent(
  matrix: THREE.Matrix4,
  offset: THREE.Matrix4,
  obj: THREE.Object3D,
  s: GrabScratch,
): void {
  s.newWorld.multiplyMatrices(matrix, offset);
  s.newOff.copy(obj.parent!.matrixWorld).invert().multiply(s.newWorld);
  obj.matrixAutoUpdate = false;
  obj.matrix.copy(s.newOff);
  obj.matrixWorldNeedsUpdate = true;
}

export function pushAlongRay(
  offset: THREE.Matrix4,
  matrix: THREE.Matrix4,
  rayDir: THREE.Vector3,
  moveDelta: number,
  s: GrabScratch,
): void {
  s.ctrlInv.copy(matrix).invert();
  s.objMat.multiplyMatrices(matrix, offset);
  s.objPos.setFromMatrixPosition(s.objMat);
  s.newLocal.copy(s.objPos).addScaledVector(rayDir, moveDelta);
  s.newLocal.applyMatrix4(s.ctrlInv);
  offset.setPosition(s.newLocal);
}

export function rotateAboutRay(
  offset: THREE.Matrix4,
  matrix: THREE.Matrix4,
  rayDir: THREE.Vector3,
  angle: number,
  s: GrabScratch,
): void {
  s.ctrlPos.setFromMatrixPosition(matrix);
  s.ctrlInv.copy(matrix).invert();
  s.objMat.multiplyMatrices(matrix, offset);
  s.objPos.setFromMatrixPosition(s.objMat);
  s.toObj.subVectors(s.objPos, s.ctrlPos);
  const depth = s.toObj.dot(rayDir);
  s.newLocal.copy(s.ctrlPos).addScaledVector(rayDir, depth);
  s.T.makeTranslation(s.newLocal.x, s.newLocal.y, s.newLocal.z);
  s.Tinv.makeTranslation(-s.newLocal.x, -s.newLocal.y, -s.newLocal.z);
  s.R.makeRotationAxis(rayDir, angle);
  s.rotAbout.copy(s.T).multiply(s.R).multiply(s.Tinv);
  s.newWorld.copy(s.rotAbout).multiply(s.objMat);
  s.newOff.copy(s.ctrlInv).multiply(s.newWorld);
  offset.copy(s.newOff);
}
