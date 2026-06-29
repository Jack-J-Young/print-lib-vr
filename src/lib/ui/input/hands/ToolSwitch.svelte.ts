import * as THREE from "three";
import { toolStore } from "$lib/ui/input/stores/toolStore.svelte";
import { PINCH_MAX_DIST } from "$lib/ui/input/constants";
import { jointWorldPos, type Joint } from "./handJoints";

const MAX_SWITCH_RADIUS = 0.025;
const SWITCH_PHASE_DUR  = 0.09; // seconds per shrink/grow phase
const RAY_FADE_DUR      = 0.15;
const GRAD_SPEED        = 6.0;

// Two concentric orbs at the left pinch point that visualise a tool switch:
// the front orb (current colour) shrinks to nothing on a full pinch, revealing
// the back orb (next colour); after the switch the ray colour fades across.
export class ToolSwitch {
  rayColor     = $state(toolStore.color);
  backVisible  = $state(false);
  frontVisible = $state(false);
  backColor    = $state(toolStore.nextColor);
  frontColor   = $state(toolStore.color);

  private phase       = 0; // 0 = idle, 1 = shrinking, 2 = growing
  private progress    = 0; // 0..1 within the current phase
  private shrinkStart = 1; // pinch factor captured when the gesture began
  private lastPinch   = 1; // last idle-frame pinch factor (read at gesture start)
  private waitUnpinch = false;
  private _tipAmount  = 0;

  private rayFadeActive   = false;
  private rayFadeProgress = 0;
  private readonly fadeFrom = new THREE.Color();
  private readonly fadeTo   = new THREE.Color();
  private readonly fadeLerp = new THREE.Color();

  private readonly _indexPos = new THREE.Vector3();
  private readonly _thumbPos = new THREE.Vector3();
  private readonly _midpoint = new THREE.Vector3();

  get tipAmount(): number {
    return this._tipAmount;
  }

  // Begin a switch: the front orb shrinks from its current size to zero.
  begin(): void {
    this.shrinkStart = this.lastPinch;
    this.phase       = 1;
    this.progress    = 0;
    this.waitUnpinch = false;
  }

  update(
    delta: number,
    palmFacing: boolean,
    index: Joint,
    thumb: Joint,
    backRef: THREE.Mesh | undefined,
    frontRef: THREE.Mesh | undefined,
  ): void {
    // Hold _tipAmount at 1 during the switch animation so the orbs don't fade.
    if (this.phase !== 0) {
      this._tipAmount = 1;
    } else {
      this._tipAmount += ((palmFacing ? 1 : 0) - this._tipAmount) * Math.min(1, GRAD_SPEED * delta);
    }

    // Ray colour fade.
    if (this.rayFadeActive) {
      this.rayFadeProgress = Math.min(1, this.rayFadeProgress + delta / RAY_FADE_DUR);
      this.fadeLerp.lerpColors(this.fadeFrom, this.fadeTo, this.rayFadeProgress);
      this.rayColor = this.fadeLerp.getHex();
      if (this.rayFadeProgress >= 1) {
        this.rayFadeActive = false;
        this.rayColor = this.fadeTo.getHex();
      }
    } else {
      this.rayColor = toolStore.color;
    }

    if (jointWorldPos(index, this._indexPos) && jointWorldPos(thumb, this._thumbPos) && this._tipAmount > 0.001) {
      this._midpoint.addVectors(this._indexPos, this._thumbPos).multiplyScalar(0.5);
      if (backRef)  backRef.position.copy(this._midpoint);
      if (frontRef) frontRef.position.copy(this._midpoint);
      backRef?.scale.setScalar(MAX_SWITCH_RADIUS * this._tipAmount);

      const pinchFactor = Math.min(this._indexPos.distanceTo(this._thumbPos) / PINCH_MAX_DIST, 1);

      if (this.phase === 0) {
        if (this.waitUnpinch) {
          if (pinchFactor > 0.9) this.waitUnpinch = false;
          frontRef?.scale.setScalar(MAX_SWITCH_RADIUS * this._tipAmount);
        } else {
          this.lastPinch = pinchFactor;
          frontRef?.scale.setScalar(MAX_SWITCH_RADIUS * this._tipAmount * pinchFactor);
        }
        this.backColor    = toolStore.nextColor;
        this.frontColor   = toolStore.color;
        this.backVisible  = true;
        this.frontVisible = true;
      } else if (this.phase === 1) {
        this.progress = Math.min(1, this.progress + delta / SWITCH_PHASE_DUR);
        frontRef?.scale.setScalar(MAX_SWITCH_RADIUS * this._tipAmount * this.shrinkStart * (1 - this.progress));
        this.backVisible  = true;
        this.frontVisible = true;
        if (this.progress >= 1) {
          this.fadeFrom.set(toolStore.color);
          toolStore.cycleNext();
          this.fadeTo.set(toolStore.color);
          this.rayFadeActive   = true;
          this.rayFadeProgress = 0;
          this.frontColor   = toolStore.color;
          this.frontVisible = false;
          this.phase    = 2;
          this.progress = 0;
        }
      } else {
        this.progress = Math.min(1, this.progress + delta / SWITCH_PHASE_DUR);
        frontRef?.scale.setScalar(MAX_SWITCH_RADIUS * this._tipAmount * this.progress);
        this.backVisible  = true;
        this.frontVisible = false;
        if (this.progress >= 1) {
          this.frontVisible = true;
          this.backColor    = toolStore.nextColor;
          this.phase    = 0;
          this.progress = 0;
          this.waitUnpinch = true;
        }
      }
    } else {
      this.backVisible  = false;
      this.frontVisible = false;
    }
  }
}
