import * as THREE from "three";
import { PINCH_MAX_DIST } from "$lib/ui/input/constants";

export type Joint = THREE.Object3D | null | undefined;

const _a         = new THREE.Vector3();
const _b         = new THREE.Vector3();
const _palmRot   = new THREE.Matrix4();
const _palmNorm  = new THREE.Vector3();
const _wristPos  = new THREE.Vector3();
const _camPos    = new THREE.Vector3();
const _toCam     = new THREE.Vector3();

// World position of a joint into `out`; false when the joint isn't tracked.
export function jointWorldPos(joint: Joint, out: THREE.Vector3): boolean {
  if (!joint) return false;
  joint.updateWorldMatrix(true, false);
  joint.getWorldPosition(out);
  return true;
}

export interface PinchMetrics {
  ok:     boolean;
  factor: number; // 0 = fingers touching, 1 = open at PINCH_MAX_DIST
}

// Midpoint of two joints into `out`, plus the clamped open/closed factor.
export function pinchMetrics(
  a: Joint,
  b: Joint,
  out: THREE.Vector3,
  maxDist = PINCH_MAX_DIST,
): PinchMetrics {
  if (!jointWorldPos(a, _a) || !jointWorldPos(b, _b)) return { ok: false, factor: 0 };
  out.addVectors(_a, _b).multiplyScalar(0.5);
  return { ok: true, factor: Math.min(_a.distanceTo(_b) / maxDist, 1) };
}

// True when the palm normal points within `threshold` (dot) of the camera.
export function isPalmFacing(wrist: Joint, camera: THREE.Camera, threshold: number): boolean {
  if (!wrist) return false;
  wrist.updateWorldMatrix(true, false);
  _palmRot.extractRotation(wrist.matrixWorld);
  _palmNorm.set(0, -1, 0).applyMatrix4(_palmRot);
  wrist.getWorldPosition(_wristPos);
  camera.getWorldPosition(_camPos);
  _toCam.subVectors(_camPos, _wristPos).normalize();
  return _palmNorm.dot(_toCam) > threshold;
}
