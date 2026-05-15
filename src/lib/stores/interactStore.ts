import { writable } from 'svelte/store';
import * as THREE from "three";

export enum CallbackType {
  Start,
  Tick,
  End,
}

interface CallbackKey {
  type: CallbackType;
  button: number;
}

export class Callback {
  // Pack two int32s into a bigint
  static packKey(type: number, button: number): bigint {
    const hi = BigInt(type >>> 0);   // >>> 0 ensures unsigned 32-bit
    const lo = BigInt(button >>> 0);
    return (hi << 32n) | lo;
  }

  // Unpack bigint back into the two int32s
  static unpackKey(key: bigint): CallbackKey {
    const type = Number(key >> 32n) as CallbackType;
    const button = Number(key & 0xFFFFFFFFn);
    return { type, button };
  }
}

export interface interactStore {
  hitboxIds: number[],
  callbacks: Map<number, Map<bigint, (delta?: number, matrix?: THREE.Matrix4) => void>>,
};

export const interactStore = writable<interactStore>({
  hitboxIds: [],
  callbacks: new Map(),
})