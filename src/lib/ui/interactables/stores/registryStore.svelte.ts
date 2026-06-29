import type * as THREE from "three";

export interface Interactable {
  onPress?: (point?: THREE.Vector3) => void;
  onRelease?: () => void;
  onHoverStart?: () => void;
  onHover?: (point: THREE.Vector3) => void; // continuous, each frame while hovered
  onHoverEnd?: () => void;
}

class Registry {
  hitboxIds: number[] = $state([]);
  readonly grabbableSet = new Set<number>();
  readonly interactableMap = new Map<number, Interactable>();

  registerHitbox(id: number): void {
    if (!this.hitboxIds.includes(id)) this.hitboxIds = [...this.hitboxIds, id];
  }

  registerGrabbable(id: number): void {
    if (!this.hitboxIds.includes(id)) this.hitboxIds = [...this.hitboxIds, id];
    this.grabbableSet.add(id);
  }

  registerInteractable(id: number, cb: Interactable): void {
    if (!this.hitboxIds.includes(id)) this.hitboxIds = [...this.hitboxIds, id];
    this.interactableMap.set(id, cb);
  }

  unregister(id: number): void {
    this.hitboxIds = this.hitboxIds.filter(x => x !== id);
    this.grabbableSet.delete(id);
    this.interactableMap.delete(id);
  }
}

export const registry = new Registry();
