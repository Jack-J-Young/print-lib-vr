import type * as THREE from "three";

export interface AuxInput {
  x: number; // -1..1  rotate axis (grab) / horizontal
  y: number; // -1..1  push/pull axis (grab) / vertical
}

export interface Tool {
  readonly name: string;
  readonly color: number;
  update(
    delta: number,
    hitId: number | undefined,
    isPressed: boolean,
    matrix: THREE.Matrix4,
    rayDir: THREE.Vector3,
    aux: AuxInput,
    scene: THREE.Scene,
  ): void;
}
