import { makeCanvasTexture } from "$lib/textures/makeCanvasTexture";

export function makeLetterTexture(letter: string, size: number) {
  const { ctx, texture } = makeCanvasTexture(256 * size, 256);

  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, 256 * size, 256);

  ctx.fillStyle = "white";
  ctx.font = "bold 160px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, (256 * size) / 2, 128);

  return texture;
}
