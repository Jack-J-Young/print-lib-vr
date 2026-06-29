<script lang="ts">
  import { T } from "@threlte/core";
  import * as THREE from "three";
  import Grabbable from "$lib/ui/interactables/Grabbable.svelte";
  import Button from "$lib/ui/interactables/Button.svelte";
  import { markdownToLines, type StyledLine } from "$lib/services/markdownLayout";
  import {
    createMarkdownCanvas,
    paginate,
    renderPage,
    MAX_W,
    USABLE_H,
  } from "$lib/services/markdownCanvas";
  import { makeArrow } from "$lib/services/arrowTexture";

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

  // ── Canvas + texture ─────────────────────────────────────────────────────
  const { ctx, texture } = createMarkdownCanvas();

  // ── State ─────────────────────────────────────────────────────────────────
  let allLines: StyledLine[] = $state([]);
  let page = $state(0);

  const pages = $derived(paginate(allLines, USABLE_H));
  const totalPages = $derived(pages.length || 1);

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
    allLines = markdownToLines(md, MAX_W);
    page = 0;
  }

  $effect(() => { void load(); });
  $effect(() => { renderPage(ctx, texture, pages[page] ?? [], totalPages, page); });

  // ── Scroll button icon textures ────────────────────────────────────────────
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
