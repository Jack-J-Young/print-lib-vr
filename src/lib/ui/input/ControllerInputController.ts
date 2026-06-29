import * as THREE from "three";
import { InputController } from "./InputController";
import type { RaycastEngine } from "./RaycastEngine.svelte";
import { DOWN_NEG_Y } from "./constants";
import { interactTool } from "./tools/InteractTool.svelte";
import { grabTool } from "./tools/GrabTool.svelte";
import { readGamepad } from "./gamepad";
import { environment } from "$lib/stores/environment.svelte";

const RECENTER_BUTTON = 3;

export interface ControllerContext {
  grip:    () => THREE.Object3D | undefined;
  gamepad: () => Gamepad | undefined;
}

// Physical controller input source. The grip defines the ray; the trigger drives
// the interact tool, the grip button the grab tool, and button 3 recenters.
export class ControllerInputController extends InputController {
  private readonly ctx: ControllerContext;

  constructor(engine: RaycastEngine, scene: THREE.Scene, ctx: ControllerContext) {
    super(engine, scene);
    this.ctx = ctx;
  }

  update(delta: number): void {
    const grip = this.ctx.grip();
    const gamepad = this.ctx.gamepad();
    if (!grip || !gamepad) return;

    const hitId = this.castFrom(grip, DOWN_NEG_Y);
    const { aux, triggerPressed, gripPressed } = readGamepad(gamepad);

    interactTool.update(delta, hitId, triggerPressed, grip.matrixWorld, this.ray.dir, aux, this.scene);
    grabTool.update(delta, hitId, gripPressed, grip.matrixWorld, this.ray.dir, aux, this.scene);

    if (gamepad.buttons[RECENTER_BUTTON]?.pressed) environment.recenter();
  }
}
