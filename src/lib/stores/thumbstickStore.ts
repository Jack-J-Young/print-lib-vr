/**
 * Right-controller thumbstick axes, written every frame by Controllers.svelte.
 * Plain mutable object — no reactive store overhead.
 * x: -1 (left) … +1 (right)
 * y: -1 (forward/up) … +1 (back/down)
 */
export const thumbstick = { x: 0, y: 0 };
