import * as THREE from "three";

export interface HoldEvent {
  offset: THREE.Matrix4,
  delta: number,
}