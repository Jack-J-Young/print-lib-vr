import * as THREE from "three";
import { makeCanvasTexture } from "$lib/textures/makeCanvasTexture";

export function createTextFieldTexture(): {
  texture: THREE.CanvasTexture;
  redraw(text: string): void;
} {
  const W = 1024, H = 128;
  const { ctx, texture } = makeCanvasTexture(W, H);

  function redraw(text: string) {
    ctx.fillStyle = "#0d0d1a";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "#5555cc";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6);

    const display = text.length > 22 ? "…" + text.slice(-21) : text;
    ctx.fillStyle = "#e0e0ff";
    ctx.font = "bold 72px monospace";
    ctx.textBaseline = "middle";
    ctx.fillText(display + "▋", 16, H / 2);

    texture.needsUpdate = true;
  }

  return { texture, redraw };
}

export function createSearchIconTexture(): THREE.CanvasTexture {
  const S = 128;
  const { ctx, texture } = makeCanvasTexture(S, S);

  ctx.fillStyle = "#0d0d1a";
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = "#5555cc";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, S - 6, S - 6);
  ctx.strokeStyle = "#e0e0ff";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(50, 50, 28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(72, 72);
  ctx.lineTo(100, 100);
  ctx.stroke();
  texture.needsUpdate = true;

  return texture;
}
