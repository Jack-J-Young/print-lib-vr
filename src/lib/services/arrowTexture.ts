import * as THREE from "three";
import { makeCanvasTexture } from "$lib/textures/makeCanvasTexture";

export function makeArrow(up: boolean): THREE.CanvasTexture {
  const { ctx, texture } = makeCanvasTexture(128, 128);
  ctx.fillStyle = "#0d0d1a";
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#5555cc";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 122, 122);
  ctx.strokeStyle = "#e0e0ff";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (up) { ctx.moveTo(30, 80); ctx.lineTo(64, 36); ctx.lineTo(98, 80); }
  else    { ctx.moveTo(30, 44); ctx.lineTo(64, 88); ctx.lineTo(98, 44); }
  ctx.stroke();
  return texture;
}
