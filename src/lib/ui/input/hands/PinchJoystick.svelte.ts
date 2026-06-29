import * as THREE from "three";
import { MIN_VEC_LEN } from "$lib/ui/input/constants";
import type { AuxInput } from "$lib/ui/input/tools/Tool";

export type PinchReader = (out: THREE.Vector3) => boolean;

// Two-hand pinch joystick: the right hand's targetRay defines a frame; the left
// pinch's displacement within that frame becomes a push/pull delta (along the ray)
// and a twist delta (around it). Emits an AuxInput consumed by the grab tool.
export class PinchJoystick {
  // Frozen reference frame, exposed by reference to the overlay (mutated per frame).
  readonly rayOrigin    = new THREE.Vector3();
  readonly perpDir      = new THREE.Vector3();
  readonly axisX        = new THREE.Vector3();
  readonly frozenOrigin = new THREE.Vector3();

  showOrigin = $state(false);
  aux: AuxInput = { x: 0, y: 0 };

  private prevActive  = false;
  private axialPrev   = 0;
  private prevPerpXR  = 0;
  private prevPerpYR  = 0;

  private readonly _rightPos     = new THREE.Vector3();
  private readonly _toLeft       = new THREE.Vector3();
  private readonly _rotMat       = new THREE.Matrix4();
  private readonly _invRot       = new THREE.Matrix4();
  private readonly _perpDirLocal = new THREE.Vector3();
  private readonly _perpAxisY    = new THREE.Vector3();
  private readonly _pinchDisp    = new THREE.Vector3();
  private readonly _pinchPoint   = new THREE.Vector3();

  update(
    active: boolean,
    leftWristPos: THREE.Vector3,
    rightWrist: THREE.Object3D | null | undefined,
    rightTargetRay: THREE.Object3D | null | undefined,
    readPinch: PinchReader,
  ): void {
    if (!active || !rightWrist || !rightTargetRay) {
      this.aux = { x: 0, y: 0 };
      this.showOrigin = false;
      this.prevActive = active;
      return;
    }

    rightWrist.updateWorldMatrix(true, false);
    rightWrist.getWorldPosition(this._rightPos);
    this._toLeft.subVectors(leftWristPos, this._rightPos);

    if (this._toLeft.length() <= MIN_VEC_LEN) {
      this.aux = { x: 0, y: 0 };
      this.showOrigin = false;
      this.prevActive = active;
      return;
    }

    rightTargetRay.updateWorldMatrix(true, false);
    this._rotMat.extractRotation(rightTargetRay.matrixWorld);
    this.axisX.set(0, 0, -1).applyMatrix4(this._rotMat);
    this.rayOrigin.setFromMatrixPosition(rightTargetRay.matrixWorld);
    this.perpDir.copy(this._perpDirLocal).applyMatrix4(this._rotMat);

    if (!this.prevActive) this.freeze(leftWristPos, readPinch);

    if (readPinch(this._pinchPoint)) {
      this._pinchDisp.subVectors(this._pinchPoint, this.rayOrigin);
      const axialCurrent = this._pinchDisp.dot(this.axisX);
      this._pinchDisp.addScaledVector(this.axisX, -axialCurrent);
      this._perpAxisY.crossVectors(this.axisX, this.perpDir);
      const perpXR  = this._pinchDisp.dot(this.perpDir);
      const perpYR  = this._pinchDisp.dot(this._perpAxisY);
      const crossZ  = this.prevPerpXR * perpYR - this.prevPerpYR * perpXR;
      const dotValR = this.prevPerpXR * perpXR + this.prevPerpYR * perpYR;
      const rotDelta  = Math.atan2(crossZ, dotValR);
      const moveDelta = axialCurrent - this.axialPrev;
      this.prevPerpXR = perpXR;
      this.prevPerpYR = perpYR;
      this.axialPrev  = axialCurrent;
      this.aux = { x: 0, y: 0, rotDelta, moveDelta };
    } else {
      this.aux = { x: 0, y: 0 };
    }

    this.prevActive = active;
  }

  // Capture the frame on the leading edge of the gesture: perpendicular axis from
  // the ray to the initial pinch, plus the reference axial/angular coordinates.
  private freeze(leftWristPos: THREE.Vector3, readPinch: PinchReader): void {
    const pinchPos = readPinch(this._pinchPoint) ? this._pinchPoint : leftWristPos;
    this.frozenOrigin.copy(pinchPos);

    this.perpDir.subVectors(pinchPos, this.rayOrigin);
    this.perpDir.addScaledVector(this.axisX, -this.perpDir.dot(this.axisX));
    const perpLen = this.perpDir.length();
    if (perpLen > MIN_VEC_LEN) {
      this.perpDir.divideScalar(perpLen);
    } else {
      this.perpDir.set(Math.abs(this.axisX.x) < 0.9 ? 1 : 0, Math.abs(this.axisX.x) >= 0.9 ? 1 : 0, 0);
      this.perpDir.addScaledVector(this.axisX, -this.perpDir.dot(this.axisX)).normalize();
    }
    this._invRot.copy(this._rotMat).transpose();
    this._perpDirLocal.copy(this.perpDir).applyMatrix4(this._invRot);

    this._pinchDisp.subVectors(pinchPos, this.rayOrigin);
    this.axialPrev = this._pinchDisp.dot(this.axisX);
    this._pinchDisp.addScaledVector(this.axisX, -this.axialPrev);
    this._perpAxisY.crossVectors(this.axisX, this.perpDir);
    this.prevPerpXR = this._pinchDisp.dot(this.perpDir);
    this.prevPerpYR = this._pinchDisp.dot(this._perpAxisY);

    this.showOrigin = true;
  }
}
