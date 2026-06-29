import { makeCanvasTexture, type CanvasTexture } from "$lib/textures/makeCanvasTexture";
import type { StyledLine } from "$lib/services/markdownLayout";

export const CW = 1024;
export const CH = 1024;
export const PAD = 40;
export const MAX_W = CW - PAD * 2;
export const USABLE_H = CH - PAD * 2;

export function createMarkdownCanvas(): CanvasTexture {
  return makeCanvasTexture(CW, CH);
}

export function paginate(lines: StyledLine[], usableH: number): StyledLine[][] {
  const result: StyledLine[][] = [];
  let current: StyledLine[] = [];
  let usedH = 0;

  for (const line of lines) {
    if (usedH + line.lineH > usableH && current.length > 0) {
      result.push(current);
      current = [];
      usedH = 0;
    }
    current.push(line);
    usedH += line.lineH + (line.marginTop ?? 0);
  }
  if (current.length) result.push(current);
  return result;
}

export function renderPage(
  ctx: CanvasRenderingContext2D,
  texture: { needsUpdate: boolean },
  pageLines: StyledLine[],
  totalPages: number,
  pageIndex: number,
): void {
  ctx.fillStyle = "#0a0a14";
  ctx.fillRect(0, 0, CW, CH);

  let y = PAD;

  for (const line of pageLines) {
    y += line.marginTop ?? 0;

    if (line.isHR) {
      ctx.strokeStyle = "#333355";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(PAD, y + line.lineH / 2);
      ctx.lineTo(CW - PAD, y + line.lineH / 2);
      ctx.stroke();
      y += line.lineH;
      continue;
    }

    if (line.bg) {
      ctx.fillStyle = line.bg;
      ctx.fillRect(PAD + line.indent - 8, y - 2, CW - PAD * 2 - line.indent + 16, line.lineH + 4);
    }

    if (line.text) {
      ctx.font = line.font;
      ctx.fillStyle = line.color;
      ctx.textBaseline = "top";
      ctx.fillText(line.text, PAD + line.indent, y);
    }

    y += line.lineH;
  }

  if (totalPages > 1) {
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#555577";
    ctx.textBaseline = "bottom";
    ctx.fillText(`${pageIndex + 1} / ${totalPages}`, CW - PAD - 60, CH - 10);
  }

  texture.needsUpdate = true;
}
