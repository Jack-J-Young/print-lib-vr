import type { Tool, AuxInput } from "./Tool";
import { registry } from "$lib/ui/interactables/stores/registryStore.svelte";
import type * as THREE from "three";

class InteractTool implements Tool {
  readonly name = "Interact";
  readonly color = 0x44ff44;

  isHovering: boolean = $state(false);
  isActive: boolean = $state(false);

  private hoveredId: number | undefined = undefined;
  private pressedId: number | undefined = undefined;
  private wasPressed = false;

  update(
    delta: number,
    hitId: number | undefined,
    isPressed: boolean,
    matrix: THREE.Matrix4,
    rayDir: THREE.Vector3,
    aux: AuxInput,
    scene: THREE.Scene,
  ): void {
    // Hover tracking
    const interactableHit = hitId !== undefined && registry.interactableMap.has(hitId) ? hitId : undefined;

    if (interactableHit !== this.hoveredId) {
      if (this.hoveredId !== undefined) {
        registry.interactableMap.get(this.hoveredId)?.onHoverEnd?.();
      }
      this.hoveredId = interactableHit;
      if (interactableHit !== undefined) {
        registry.interactableMap.get(interactableHit)?.onHoverStart?.();
      }
      this.isHovering = interactableHit !== undefined;
    }

    // Press on leading edge
    if (isPressed && !this.wasPressed && interactableHit !== undefined) {
      registry.interactableMap.get(interactableHit)?.onPress?.();
      this.pressedId = interactableHit;
    }

    // Release on trailing edge
    if (!isPressed && this.wasPressed && this.pressedId !== undefined) {
      registry.interactableMap.get(this.pressedId)?.onRelease?.();
      this.pressedId = undefined;
    }

    this.isActive = isPressed && this.pressedId !== undefined;
    this.wasPressed = isPressed;
  }
}

export const interactTool = new InteractTool();
