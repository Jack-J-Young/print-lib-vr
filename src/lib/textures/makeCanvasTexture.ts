import * as THREE from "three";

export interface CanvasTexture {
  canvas:  HTMLCanvasElement;
  ctx:     CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
}

// Offscreen canvas + 2D context + THREE texture in one step. Call from component
// init (it needs `document`) — never at module top level, which breaks SSR.
export function makeCanvasTexture(width: number, height: number): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  return { canvas, ctx, texture };
}
