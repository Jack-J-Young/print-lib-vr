import { Lexer, type Token } from "marked";

export interface StyledLine {
  text: string;
  font: string;
  color: string;
  indent: number;
  lineH: number;
  marginTop?: number;
  bg?: string;
  isHR?: boolean;
}

// Private offscreen canvas used only for text measurement. Created lazily so the
// module can be imported during SSR, where `document` is unavailable.
let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureCtx(): CanvasRenderingContext2D {
  if (!measureCtx) {
    measureCtx = document.createElement("canvas").getContext("2d")!;
  }
  return measureCtx;
}

// ── Inline stripping (bold/italic/links → plain text) ─────────────────────
function strip(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/gs, "$1")
    .replace(/__(.*?)__/gs, "$1")
    .replace(/\*(.*?)\*/gs, "$1")
    .replace(/_(.*?)_/gs, "$1")
    .replace(/~~(.*?)~~/gs, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\n/g, " ")
    .trim();
}

// ── Word wrap ─────────────────────────────────────────────────────────────
function wrap(text: string, font: string, maxW: number): string[] {
  if (!text.trim()) return [""];
  const ctx = getMeasureCtx();
  ctx.font = font;
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

// ── Token → StyledLines ────────────────────────────────────────────────────
const H_SIZES = [0, 52, 42, 34, 28, 26, 24];
const H_HEIGHTS = [0, 68, 56, 46, 38, 36, 34];

function tokenToLines(token: Token, maxW: number): StyledLine[] {
  const lines: StyledLine[] = [];

  switch (token.type) {
    case "heading": {
      const d = Math.min(token.depth, 6);
      const font = `bold ${H_SIZES[d]}px sans-serif`;
      const lineH = H_HEIGHTS[d];
      const color = d === 1 ? "#ffffff" : d === 2 ? "#eeeeee" : "#cccccc";
      for (const [i, t] of wrap(strip(token.text), font, maxW).entries()) {
        lines.push({ text: t, font, color, indent: 0, lineH, marginTop: i === 0 ? 24 : 0 });
      }
      lines.push({ text: "", font, color, indent: 0, lineH: 12 });
      break;
    }

    case "paragraph": {
      const font = "26px sans-serif";
      for (const t of wrap(strip(token.text), font, maxW)) {
        lines.push({ text: t, font, color: "#aaaaaa", indent: 0, lineH: 38 });
      }
      lines.push({ text: "", font, color: "#aaaaaa", indent: 0, lineH: 10 });
      break;
    }

    case "list": {
      const font = "26px sans-serif";
      token.items.forEach((item: { tokens?: Token[]; text?: string }, idx: number) => {
        const prefix = token.ordered ? `${idx + 1}. ` : "• ";
        const raw = item.tokens
          ?.filter((t: Token): t is Token & { type: "text"; text: string } => t.type === "text")
          .map((t: Token & { text: string }) => strip(t.text))
          .join(" ") ?? strip(item.text ?? "");
        const wrapped = wrap(prefix + raw, font, maxW - 40);
        for (const [i, t] of wrapped.entries()) {
          lines.push({ text: i === 0 ? t : "  " + t, font, color: "#aaaaaa", indent: 40, lineH: 38 });
        }
      });
      lines.push({ text: "", font: "26px sans-serif", color: "#aaaaaa", indent: 0, lineH: 10 });
      break;
    }

    case "code": {
      const font = "22px monospace";
      lines.push({ text: "", font, color: "#7aff9f", indent: 0, lineH: 8 });
      for (const raw of token.text.split("\n")) {
        for (const t of wrap(raw || " ", font, maxW - 40)) {
          lines.push({ text: t, font, color: "#7aff9f", indent: 20, lineH: 32, bg: "#0a1a0a" });
        }
      }
      lines.push({ text: "", font, color: "#7aff9f", indent: 0, lineH: 8 });
      break;
    }

    case "blockquote": {
      const font = "italic 26px sans-serif";
      for (const inner of (token.tokens ?? [])) {
        if (inner.type === "paragraph") {
          for (const t of wrap(strip(inner.text), font, maxW - 50)) {
            lines.push({ text: t, font, color: "#888888", indent: 50, lineH: 38 });
          }
        }
      }
      lines.push({ text: "", font, color: "#888888", indent: 0, lineH: 10 });
      break;
    }

    case "hr":
      lines.push({ text: "", font: "20px sans-serif", color: "#444466", indent: 0, lineH: 30, isHR: true });
      break;

    case "space":
      lines.push({ text: "", font: "26px sans-serif", color: "#aaaaaa", indent: 0, lineH: 20 });
      break;
  }

  return lines;
}

export function markdownToLines(md: string, maxW: number): StyledLine[] {
  return Lexer.lex(md).flatMap((token) => tokenToLines(token, maxW));
}
