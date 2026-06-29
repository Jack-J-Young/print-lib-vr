import type { DirEntry } from "$lib/services/githubService";

export const CW = 1024;
export const CH = 1024;
export const PAD = 32;
export const HEADER_H = 104;
export const ROW_H = 64;
export const ROWS_PER_PAGE = Math.floor((CH - HEADER_H - PAD) / ROW_H);

const BG          = "#0a0a14";
const HEADER_BG   = "#15152a";
const HEADER_TEXT = "#c8c8ff";
const ROW_HOVER   = "#1e1e3a";
const DIR_COLOR   = "#dfe4ff";
const UP_COLOR    = "#8a93b8";
const MODEL_COLOR = "#5fb8ff";
const MD_COLOR    = "#6ff0a0";
const OTHER_COLOR = "#6a6a86";

export interface ExplorerView {
  path: string;
  entries: DirEntry[]; // the full displayed list, including any leading ".." entry
  page: number;
  hoveredRow: number;  // global index into entries, or -1
}

export function pageCount(entries: DirEntry[]): number {
  return Math.max(1, Math.ceil(entries.length / ROWS_PER_PAGE));
}

// Global entry index for a canvas-pixel hit, or -1 when outside the row area.
export function rowIndexAt(y: number, page: number): number {
  if (y < HEADER_H) return -1;
  const local = Math.floor((y - HEADER_H) / ROW_H);
  if (local < 0 || local >= ROWS_PER_PAGE) return -1;
  return page * ROWS_PER_PAGE + local;
}

function entryColor(entry: DirEntry): string {
  if (entry.up) return UP_COLOR;
  if (entry.isDir) return DIR_COLOR;
  const lower = entry.name.toLowerCase();
  if (lower.endsWith(".3mf")) return MODEL_COLOR;
  if (lower.endsWith(".md")) return MD_COLOR;
  return OTHER_COLOR;
}

function entryLabel(entry: DirEntry): string {
  if (entry.up) return "..  (up)";
  return entry.isDir ? `${entry.name}/` : entry.name;
}

export function renderExplorer(ctx: CanvasRenderingContext2D, view: ExplorerView): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CW, CH);

  // Header: current path.
  ctx.fillStyle = HEADER_BG;
  ctx.fillRect(0, 0, CW, HEADER_H);
  ctx.fillStyle = HEADER_TEXT;
  ctx.font = "30px sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(`/${view.path}`, PAD, HEADER_H / 2);

  const start = view.page * ROWS_PER_PAGE;
  const end = Math.min(start + ROWS_PER_PAGE, view.entries.length);

  for (let i = start; i < end; i++) {
    const entry = view.entries[i];
    const y = HEADER_H + (i - start) * ROW_H;

    if (i === view.hoveredRow) {
      ctx.fillStyle = ROW_HOVER;
      ctx.fillRect(0, y, CW, ROW_H);
    }

    ctx.fillStyle = entryColor(entry);
    ctx.font = "32px sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(entryLabel(entry), PAD, y + ROW_H / 2);
  }

  const total = pageCount(view.entries);
  if (total > 1) {
    ctx.fillStyle = "#555577";
    ctx.font = "22px sans-serif";
    ctx.textBaseline = "bottom";
    ctx.fillText(`${view.page + 1} / ${total}`, CW - PAD - 70, CH - 8);
  }
}
