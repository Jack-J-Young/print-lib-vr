import * as THREE from "three";
import { registry } from "$lib/stores/registryStore.svelte";

export class RaycastEngine {
  hitId: number | undefined = $state(undefined);
  hitPoint: THREE.Vector3 | undefined = $state(undefined);

  private readonly scene: THREE.Scene;
  private readonly rc = new THREE.Raycaster();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  cast(origin: THREE.Vector3, direction: THREE.Vector3): void {
    this.rc.ray.origin.copy(origin);
    this.rc.ray.direction.copy(direction).normalize();

    const objects = registry.hitboxIds
      .map(id => this.scene.getObjectById(id))
      .filter((obj): obj is THREE.Object3D => obj !== undefined);

    const intersects = this.rc.intersectObjects(objects, true);

    if (intersects.length === 0) {
      this.hitId = undefined;
      this.hitPoint = undefined;
      return;
    }

    this.hitPoint = intersects[0].point;

    // Walk up hierarchy to find the registered hitbox ancestor.
    let node: THREE.Object3D | null = intersects[0].object;
    while (node) {
      if (registry.hitboxIds.includes(node.id)) {
        this.hitId = node.id;
        return;
      }
      node = node.parent;
    }
    this.hitId = undefined;
  }
}
