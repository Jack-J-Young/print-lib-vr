import * as THREE from "three";
import { get } from "svelte/store";
import { Callback, CallbackType, interactStore } from "$lib/stores/interactStore";

// Button numbers used across the interaction system.
// 0 = hover (synthetic — fires on intersection, no physical button)
// 1 = trigger (gamepad button 0 / hand interact-pinch)
// 2 = grip   (gamepad button 1 / hand grab-pinch)
export const HOVER_BUTTON = 0;
export const TRIGGER_BUTTON = 1;
export const GRIP_BUTTON = 2;

export class RaycastEngine {
  rButtons: boolean[] = $state([]);
  rPoint: THREE.Vector3 | undefined = $state();

  private readonly scene: THREE.Scene;
  private readonly rc = new THREE.Raycaster();
  private hoveredIds = new Set<number>();
  private tickCallbacks = new Map<
    bigint,
    null | ((delta?: number, matrix?: THREE.Matrix4) => void)
  >();
  private endCallbacks = new Map<
    bigint,
    (delta?: number, matrix?: THREE.Matrix4) => void
  >();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  updateFromGamepad(gamepad: Gamepad) {
    this.rButtons = Array(gamepad.buttons.length).fill(false);
    for (let i = 0; i < gamepad.buttons.length; i++) {
      this.rButtons[i] = gamepad.buttons[i].pressed ?? false;
    }
  }

  private isButtonActive(button: number): boolean {
    for (const key of this.endCallbacks.keys()) {
      if (Callback.unpackKey(key).button === button) return true;
    }
    return false;
  }

  private tickUpdate(delta?: number, matrix?: THREE.Matrix4) {
    this.tickCallbacks.forEach((callback, key) => {
      const button = Callback.unpackKey(key).button;
      if (this.rButtons[button - 1]) {
        if (callback) callback(delta, matrix);
      } else {
        const endCallback = this.endCallbacks.get(key);
        if (!endCallback) return;
        endCallback(delta, matrix);
        this.endCallbacks.delete(key);
        this.tickCallbacks.delete(key);
      }
    });
  }

  private press(button: number, id: number, delta?: number, matrix?: THREE.Matrix4) {
    const map = get(interactStore).callbacks.get(id);
    if (!map) return;
    if (this.endCallbacks.has(Callback.packKey(id, button))) return;

    const startCallback = map.get(Callback.packKey(CallbackType.Start, button));
    if (startCallback) startCallback(delta, matrix);

    const tickCallback = map.get(Callback.packKey(CallbackType.Tick, button));
    if (tickCallback) {
      this.tickCallbacks.set(Callback.packKey(id, button), tickCallback);
    }

    const endCallback = map.get(Callback.packKey(CallbackType.End, button));
    if (endCallback) {
      this.endCallbacks.set(Callback.packKey(id, button), endCallback);
      if (!tickCallback) {
        this.tickCallbacks.set(Callback.packKey(id, button), null);
      }
    }
  }

  private processHover(id: number, delta: number, matrix: THREE.Matrix4) {
    const map = get(interactStore).callbacks.get(id);
    if (!map) return;
    if (!this.hoveredIds.has(id)) {
      const start = map.get(Callback.packKey(CallbackType.Start, HOVER_BUTTON));
      if (start) start(delta, matrix);
    }
    const tick = map.get(Callback.packKey(CallbackType.Tick, HOVER_BUTTON));
    if (tick) tick(delta, matrix);
  }

  private endHover(id: number, delta: number, matrix: THREE.Matrix4) {
    const map = get(interactStore).callbacks.get(id);
    const end = map?.get(Callback.packKey(CallbackType.End, HOVER_BUTTON));
    if (end) end(delta, matrix);
  }

  cast(
    delta: number,
    rayOrigin: THREE.Vector3,
    rayDirection: THREE.Vector3,
    controllerMatrix: THREE.Matrix4,
  ) {
    const store = get(interactStore);
    if (store.hitboxIds.length === 0) return;

    this.tickUpdate(delta, controllerMatrix);

    this.rc.ray.origin.copy(rayOrigin);
    this.rc.ray.direction.copy(rayDirection).normalize();

    const objects = store.hitboxIds
      .map((id) => this.scene.getObjectById(id))
      .filter((obj): obj is THREE.Object3D => obj !== undefined);

    const intersects = this.rc.intersectObjects(objects, true);
    const currentHovered = new Set<number>();

    if (intersects.length > 0) {
      this.rPoint = intersects[0].point;
      for (const intersect of intersects) {
        let node: THREE.Object3D | null = intersect.object;
        let id: number | undefined;
        while (node) {
          if (store.hitboxIds.includes(node.id)) { id = node.id; break; }
          node = node.parent;
        }
        if (id === undefined) continue;
        this.processHover(id, delta, controllerMatrix);
        currentHovered.add(id);
        for (let i = 0; i < this.rButtons.length; i++) {
          if (this.rButtons[i] && !this.isButtonActive(i + 1)) {
            this.press(i + 1, id, delta, controllerMatrix);
          }
        }
      }
    } else {
      this.rPoint = undefined;
    }

    for (const id of this.hoveredIds) {
      if (!currentHovered.has(id)) this.endHover(id, delta, controllerMatrix);
    }
    this.hoveredIds = currentHovered;
  }
}
