import type { Tool, AuxInput } from "./Tool";
import { registry } from "$lib/ui/interactables/stores/registryStore.svelte";
import * as THREE from "three";

const PUSH_SPEED = 1.0;
const ROT_SPEED = 2.5;
const DEADZONE = 0.12;

class GrabTool implements Tool {
  readonly name = "Grab";
  readonly color = 0x4488ff;

  isActive: boolean = $state(false);

  private grabbingId: number | undefined = undefined;
  private offset = new THREE.Matrix4();

  // Pre-allocated temporaries
  private _ctrlPos = new THREE.Vector3();
  private _ctrlInv = new THREE.Matrix4();
  private _objMat = new THREE.Matrix4();
  private _objPos = new THREE.Vector3();
  private _toObj = new THREE.Vector3();
  private _newLocal = new THREE.Vector3();
  private _T = new THREE.Matrix4();
  private _Tinv = new THREE.Matrix4();
  private _R = new THREE.Matrix4();
  private _rotAbout = new THREE.Matrix4();
  private _newWorld = new THREE.Matrix4();
  private _newOff = new THREE.Matrix4();

  update(
    delta: number,
    hitId: number | undefined,
    isPressed: boolean,
    matrix: THREE.Matrix4,
    rayDir: THREE.Vector3,
    aux: AuxInput,
    scene: THREE.Scene,
  ): void {
    if (this.grabbingId !== undefined) {
      const obj = scene.getObjectById(this.grabbingId);
      if (!obj?.parent) { this.grabbingId = undefined; this.isActive = false; return; }

      if (!isPressed) {
        this.place(matrix, obj);
        this.grabbingId = undefined;
        this.isActive = false;
        return;
      }

      this.adjustOffset(delta, matrix, rayDir, aux);
      this.place(matrix, obj);

    } else if (isPressed && hitId !== undefined && registry.grabbableSet.has(hitId)) {
      const obj = scene.getObjectById(hitId);
      if (!obj) return;
      obj.updateWorldMatrix(true, false);
      this.offset.copy(matrix).invert().multiply(obj.matrixWorld);
      this.grabbingId = hitId;
      this.isActive = true;
    }
  }

  private place(matrix: THREE.Matrix4, obj: THREE.Object3D): void {
    this._newWorld.multiplyMatrices(matrix, this.offset);
    this._newOff.copy(obj.parent!.matrixWorld).invert().multiply(this._newWorld);
    obj.matrixAutoUpdate = false;
    obj.matrix.copy(this._newOff);
    obj.matrixWorldNeedsUpdate = true;
  }

  private adjustOffset(delta: number, matrix: THREE.Matrix4, rayDir: THREE.Vector3, aux: AuxInput): void {
    const { x: sx, y: sy } = aux;
    const hasHandInput = (aux.moveDelta !== undefined && Math.abs(aux.moveDelta) > 0.0001)
                      || (aux.rotDelta  !== undefined && Math.abs(aux.rotDelta)  > 0.0001);
    if (!hasHandInput && Math.abs(sy) <= DEADZONE && Math.abs(sx) <= DEADZONE) return;

    this._ctrlPos.setFromMatrixPosition(matrix);
    this._ctrlInv.copy(matrix).invert();
    this._objMat.multiplyMatrices(matrix, this.offset);
    this._objPos.setFromMatrixPosition(this._objMat);

    const pushActive = aux.moveDelta !== undefined ? Math.abs(aux.moveDelta) > 0.0001 : Math.abs(sy) > DEADZONE;
    if (pushActive) {
      const moveDelta = aux.moveDelta !== undefined ? aux.moveDelta : -sy * PUSH_SPEED * delta;
      this._newLocal.copy(this._objPos).addScaledVector(rayDir, moveDelta);
      this._newLocal.applyMatrix4(this._ctrlInv);
      this.offset.setPosition(this._newLocal);
      this._objMat.multiplyMatrices(matrix, this.offset);
      this._objPos.setFromMatrixPosition(this._objMat);
    }

    if (aux.rotDelta !== undefined ? Math.abs(aux.rotDelta) > 0.0001 : Math.abs(sx) > DEADZONE) {
      const angle = aux.rotDelta !== undefined ? aux.rotDelta : sx * ROT_SPEED * delta;
      this._toObj.subVectors(this._objPos, this._ctrlPos);
      const depth = this._toObj.dot(rayDir);
      this._newLocal.copy(this._ctrlPos).addScaledVector(rayDir, depth);
      this._T.makeTranslation(this._newLocal.x, this._newLocal.y, this._newLocal.z);
      this._Tinv.makeTranslation(-this._newLocal.x, -this._newLocal.y, -this._newLocal.z);
      this._R.makeRotationAxis(rayDir, angle);
      this._rotAbout.copy(this._T).multiply(this._R).multiply(this._Tinv);
      this._newWorld.copy(this._rotAbout).multiply(this._objMat);
      this._newOff.copy(this._ctrlInv).multiply(this._newWorld);
      this.offset.copy(this._newOff);
    }
  }
}

export const grabTool = new GrabTool();
