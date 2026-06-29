import * as THREE from "three";
import type { RaycastEngine } from "./RaycastEngine.svelte";
import { createRayFrame, decomposeRayFrame, type RayFrame } from "./rayFrame";

// Base for the two input sources (hand tracking and physical controllers). Each
// frame an implementation builds a world ray from its source object, casts it,
// and drives tools. The component that owns the Threlte hooks feeds the source
// objects in (a class can't call useHand/useController itself), then calls update.
export abstract class InputController {
  protected readonly engine: RaycastEngine;
  protected readonly scene: THREE.Scene;
  protected readonly ray: RayFrame = createRayFrame();

  constructor(engine: RaycastEngine, scene: THREE.Scene) {
    this.engine = engine;
    this.scene = scene;
  }

  // Resolve `source` + its local forward into a world ray, cast it, return the
  // hit id. Leaves the resolved ray in `this.ray` and `source.matrixWorld` fresh.
  protected castFrom(source: THREE.Object3D, localForward: THREE.Vector3): number | undefined {
    decomposeRayFrame(source, localForward, this.ray);
    this.engine.cast(this.ray.origin, this.ray.dir);
    return this.engine.hitId;
  }

  abstract update(delta: number): void;
}
