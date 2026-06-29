import type { AuxInput } from "./Tool";
import { DEADZONE, INPUT_EPSILON } from "$lib/ui/input/constants";

const PUSH_SPEED = 1.0;
const ROT_SPEED = 2.5;

export function resolveMove(aux: AuxInput, delta: number): number | null {
  if (aux.moveDelta !== undefined) {
    return Math.abs(aux.moveDelta) > INPUT_EPSILON ? aux.moveDelta : null;
  }
  return Math.abs(aux.y) > DEADZONE ? -aux.y * PUSH_SPEED * delta : null;
}

export function resolveRotate(aux: AuxInput, delta: number): number | null {
  if (aux.rotDelta !== undefined) {
    return Math.abs(aux.rotDelta) > INPUT_EPSILON ? aux.rotDelta : null;
  }
  return Math.abs(aux.x) > DEADZONE ? aux.x * ROT_SPEED * delta : null;
}
