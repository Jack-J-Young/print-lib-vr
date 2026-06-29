import type { Tool, AuxInput } from "./Tool";
import { TOOL_COLORS } from "./colors";
import { registry } from "$lib/ui/interactables/stores/registryStore.svelte";
import {
  createGrabScratch,
  composeOffset,
  placeIntoParent,
  pushAlongRay,
  rotateAboutRay,
} from "./grabMath";
import { resolveMove, resolveRotate } from "./grabInput";
import * as THREE from "three";

class GrabTool implements Tool {
  readonly name = "Grab";
  readonly color = TOOL_COLORS.grab;

  isActive: boolean = $state(false);

  private grabbingId: number | undefined = undefined;
  private offset = new THREE.Matrix4();
  private scratch = createGrabScratch();

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
        placeIntoParent(matrix, this.offset, obj, this.scratch);
        this.grabbingId = undefined;
        this.isActive = false;
        return;
      }

      this.adjustOffset(delta, matrix, rayDir, aux);
      placeIntoParent(matrix, this.offset, obj, this.scratch);

    } else if (isPressed && hitId !== undefined && registry.grabbableSet.has(hitId)) {
      const obj = scene.getObjectById(hitId);
      if (!obj) return;
      obj.updateWorldMatrix(true, false);
      composeOffset(matrix, obj.matrixWorld, this.offset);
      this.grabbingId = hitId;
      this.isActive = true;
    }
  }

  private adjustOffset(delta: number, matrix: THREE.Matrix4, rayDir: THREE.Vector3, aux: AuxInput): void {
    const move = resolveMove(aux, delta);
    if (move !== null) pushAlongRay(this.offset, matrix, rayDir, move, this.scratch);

    const angle = resolveRotate(aux, delta);
    if (angle !== null) rotateAboutRay(this.offset, matrix, rayDir, angle, this.scratch);
  }
}

export const grabTool = new GrabTool();
