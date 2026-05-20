<script lang="ts">
  import { T } from "@threlte/core";
  import * as THREE from "three";
  import { Lexer, type Token } from "marked";
  import Grabbable from "$lib/ui/interactables/Grabbable.svelte";
  import Button from "$lib/ui/interactables/Button.svelte";

  // ── Props ──────────────────────────────────────────────────────────────────
  let {
    src,
    markdown,
    position = [0, 0.5, -1.5] as [number, number, number],
  }: {
    src?: string;
    markdown?: string;
    position?: [number, number, number];
  } = $props();

  // ── Canvas setup ───────────────────────────────────────────────────────────
  const CW = 1024, CH = 1024;
  const PAD = 40;
  const MAX_W = CW - PAD * 2;

  const canvas = document.createElement("canvas");
  canvas.width = CW;
  canvas.height = CH;
  const texture = new THREE.CanvasTexture(canvas);
  const ctx = canvas.getContext("2d")!;

  // ── Layout types ───────────────────────────────────────────────────────────
  type StyledLine = {
    text: string;
    font: string;
    color: string;
    indent: number;
    lineH: number;
    marginTop?: number;
    bg?: string;
    isHR?: boolean;
  };

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

  function tokenToLines(token: Token): StyledLine[] {
    const lines: StyledLine[] = [];

    switch (token.type) {
      case "heading": {
        const d = Math.min(token.depth, 6);
        const font = `bold ${H_SIZES[d]}px sans-serif`;
        const lineH = H_HEIGHTS[d];
        const color = d === 1 ? "#ffffff" : d === 2 ? "#eeeeee" : "#cccccc";
        for (const [i, t] of wrap(strip(token.text), font, MAX_W).entries()) {
          lines.push({ text: t, font, color, indent: 0, lineH, marginTop: i === 0 ? 24 : 0 });
        }
        lines.push({ text: "", font, color, indent: 0, lineH: 12 });
        break;
      }

      case "paragraph": {
        const font = "26px sans-serif";
        for (const t of wrap(strip(token.text), font, MAX_W)) {
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
          const wrapped = wrap(prefix + raw, font, MAX_W - 40);
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
          for (const t of wrap(raw || " ", font, MAX_W - 40)) {
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
            for (const t of wrap(strip(inner.text), font, MAX_W - 50)) {
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

  // ── State ─────────────────────────────────────────────────────────────────
  let allLines: StyledLine[] = $state([]);
  let page = $state(0);

  const USABLE_H = CH - PAD * 2;
  const pages = $derived(paginate(allLines));
  const totalPages = $derived(pages.length || 1);

  function paginate(lines: StyledLine[]): StyledLine[][] {
    const result: StyledLine[][] = [];
    let current: StyledLine[] = [];
    let usedH = 0;

    for (const line of lines) {
      if (usedH + line.lineH > USABLE_H && current.length > 0) {
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

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, CW, CH);

    const pageLines = pages[page] ?? [];
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
      ctx.fillText(`${page + 1} / ${totalPages}`, CW - PAD - 60, CH - 10);
    }

    texture.needsUpdate = true;
  }

  // ── Load content ──────────────────────────────────────────────────────────
  async function load() {
    let md = markdown ?? "";
    if (src) {
      try {
        const r = await fetch(src, { headers: { Accept: "application/vnd.github.raw" } });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        md = await r.text();
      } catch (e) {
        md = `# Error\n\nCould not load \`${src}\`\n\n${e}`;
      }
    }
    const tokens = Lexer.lex(md);
    allLines = tokens.flatMap(tokenToLines);
    page = 0;
  }

  $effect(() => { void load(); });
  $effect(() => { render(); });

  // ── Scroll button icon textures ────────────────────────────────────────────
  function makeArrow(up: boolean): THREE.CanvasTexture {
    const c = document.createElement("canvas");
    c.width = 128; c.height = 128;
    const x = c.getContext("2d")!;
    x.fillStyle = "#0d0d1a";
    x.fillRect(0, 0, 128, 128);
    x.strokeStyle = "#5555cc";
    x.lineWidth = 6;
    x.strokeRect(3, 3, 122, 122);
    x.strokeStyle = "#e0e0ff";
    x.lineWidth = 10;
    x.lineCap = "round";
    x.lineJoin = "round";
    x.beginPath();
    if (up) { x.moveTo(30, 80); x.lineTo(64, 36); x.lineTo(98, 80); }
    else    { x.moveTo(30, 44); x.lineTo(64, 88); x.lineTo(98, 44); }
    x.stroke();
    return new THREE.CanvasTexture(c);
  }

  const upTex = makeArrow(true);
  const downTex = makeArrow(false);

  const PANEL_W = 1.0;
  const PANEL_H = 1.0;
  const BTN = 0.09;
  const BTN_X = PANEL_W / 2 + 0.01 + BTN / 2;
</script>

<Grabbable>
  <!-- Markdown panel -->
  <T.Mesh {position}>
    <T.PlaneGeometry args={[PANEL_W, PANEL_H]} />
    <T.MeshBasicMaterial map={texture} side={THREE.DoubleSide} />
  </T.Mesh>

  <!-- Scroll up -->
  <T.Group position={[position[0] + BTN_X, position[1] + BTN * 0.6, position[2]]}>
    <Button onpress={() => { page = Math.max(0, page - 1); }}>
      <T.Mesh>
        <T.PlaneGeometry args={[BTN, BTN]} />
        <T.MeshBasicMaterial map={upTex} side={THREE.DoubleSide} />
      </T.Mesh>
    </Button>
  </T.Group>

  <!-- Scroll down -->
  <T.Group position={[position[0] + BTN_X, position[1] - BTN * 0.6, position[2]]}>
    <Button onpress={() => { page = Math.min(totalPages - 1, page + 1); }}>
      <T.Mesh>
        <T.PlaneGeometry args={[BTN, BTN]} />
        <T.MeshBasicMaterial map={downTex} side={THREE.DoubleSide} />
      </T.Mesh>
    </Button>
  </T.Group>
</Grabbable>
