import * as THREE from "three";
import { InputController } from "$lib/ui/input/InputController";
import type { RaycastEngine } from "$lib/ui/input/RaycastEngine.svelte";
import { FORWARD_NEG_Z, PINCH_MAX_DIST } from "$lib/ui/input/constants";
import { toolStore } from "$lib/ui/input/stores/toolStore.svelte";
import { environment } from "$lib/stores/environment.svelte";
import { isPalmFacing, jointWorldPos, pinchMetrics, type Joint } from "./handJoints";
import { ToolSwitch } from "./ToolSwitch.svelte";
import { PinchJoystick } from "./PinchJoystick.svelte";

const PALM_CAM_DOT   = 0.85;
const PALM_ORB_RADIUS = 0.025 * 2 / 6;
const RECENTER_PINCH  = 0.08; // pinky-pinch factor below which a recenter fires

export interface HandContext {
  camera:         () => THREE.Camera;
  leftWrist:      () => Joint;
  leftIndex:      () => Joint;
  leftThumb:      () => Joint;
  leftPinky:      () => Joint;
  rightWrist:     () => Joint;
  rightTargetRay: () => THREE.Object3D | null | undefined;
  switchBack:     () => THREE.Mesh | undefined;
  switchFront:    () => THREE.Mesh | undefined;
  palmOrb:        () => THREE.Mesh | undefined;
}

// Hand-tracking input source. The right hand drives the active tool via its
// targetRay; the left hand adds the "extra buttons" hands lack — a palm-facing
// pinch cycles tools, a pinky pinch recenters, and a two-hand pinch is a joystick.
export class HandInputController extends InputController {
  handIsPressed = $state(false);
  leftPinching  = $state(false);
  palmOrbVisible = $state(false);

  readonly toolSwitch = new ToolSwitch();
  readonly joystick   = new PinchJoystick();

  private palmOrbPinched = false;

  private readonly _leftWristPos = new THREE.Vector3();
  private readonly _thumbPos     = new THREE.Vector3();
  private readonly _pinkyPos     = new THREE.Vector3();
  private readonly readPinch = (out: THREE.Vector3): boolean =>
    pinchMetrics(this.ctx.leftIndex(), this.ctx.leftThumb(), out).ok;

  constructor(engine: RaycastEngine, scene: THREE.Scene, private readonly ctx: HandContext) {
    super(engine, scene);
  }

  get rayColor(): number {
    return this.toolSwitch.rayColor;
  }

  onRightPinchStart(): void { this.handIsPressed = true; }
  onRightPinchEnd():   void { this.handIsPressed = false; }

  onLeftPinchStart(): void {
    if (isPalmFacing(this.ctx.leftWrist(), this.ctx.camera(), PALM_CAM_DOT)) {
      this.toolSwitch.begin();
    } else {
      this.leftPinching = true;
    }
  }
  onLeftPinchEnd(): void { this.leftPinching = false; }

  update(delta: number): void {
    const leftWrist = this.ctx.leftWrist();
    if (leftWrist) {
      leftWrist.updateWorldMatrix(true, false);
      leftWrist.getWorldPosition(this._leftWristPos);
      const palmFacing = isPalmFacing(leftWrist, this.ctx.camera(), PALM_CAM_DOT);

      this.toolSwitch.update(
        delta, palmFacing,
        this.ctx.leftIndex(), this.ctx.leftThumb(),
        this.ctx.switchBack(), this.ctx.switchFront(),
      );
      this.updatePalmOrb();
      this.joystick.update(
        this.leftPinching, this._leftWristPos,
        this.ctx.rightWrist(), this.ctx.rightTargetRay(), this.readPinch,
      );
    } else {
      this.joystick.update(false, this._leftWristPos, null, null, this.readPinch);
    }

    const rightRay = this.ctx.rightTargetRay();
    if (rightRay) {
      const hitId = this.castFrom(rightRay, FORWARD_NEG_Z);
      toolStore.activeTool.update(
        delta, hitId, this.engine.hitPoint, this.handIsPressed,
        rightRay.matrixWorld, this.ray.dir, this.joystick.aux, this.scene,
      );
    }
  }

  // White feedback orb between thumb and pinky; closing them fully recenters the world.
  private updatePalmOrb(): void {
    const orb = this.ctx.palmOrb();
    const thumb = this.ctx.leftThumb();
    const pinky = this.ctx.leftPinky();
    const tip = this.toolSwitch.tipAmount;

    if (orb && jointWorldPos(thumb, this._thumbPos) && jointWorldPos(pinky, this._pinkyPos) && tip > 0.001) {
      orb.position.addVectors(this._thumbPos, this._pinkyPos).multiplyScalar(0.5);
      const factor = Math.min(this._thumbPos.distanceTo(this._pinkyPos) / PINCH_MAX_DIST, 1);
      orb.scale.setScalar(PALM_ORB_RADIUS * factor * tip);
      if (factor < RECENTER_PINCH && !this.palmOrbPinched) {
        this.palmOrbPinched = true;
        environment.recenter();
      } else if (factor > 0.5) {
        this.palmOrbPinched = false;
      }
      this.palmOrbVisible = true;
    } else {
      this.palmOrbVisible = false;
    }
  }
}
