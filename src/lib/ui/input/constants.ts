import * as THREE from "three";

// Reusable readonly direction vectors — never mutate these in place.
export const FORWARD_NEG_Z = new THREE.Vector3(0, 0, -1); // pointer / targetRay forward
export const DOWN_NEG_Y    = new THREE.Vector3(0, -1, 0); // controller grip forward

// Input tuning.
export const PINCH_MAX_DIST = 0.07;   // metres; finger gap mapped to "fully open"
export const DEADZONE       = 0.12;   // thumbstick deadzone
export const INPUT_EPSILON  = 0.0001; // hand-delta activity threshold
export const MIN_VEC_LEN    = 0.001;  // degenerate-vector guard
