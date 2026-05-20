<script lang="ts">
  import { T } from "@threlte/core";
  import * as THREE from "three";
  import Grabbable from "$lib/ui/interactables/Grabbable.svelte";
  import Button from "$lib/ui/interactables/Button.svelte";
  import { textStore } from "$lib/stores/textStore";

  let { onsearch }: { onsearch?: (text: string) => void } = $props();

  // ── Text field ────────────────────────────────────────────────────────────
  const BAR_W = 1.5;
  const BAR_H = 0.1875;

  const W = 1024, H = 128;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const texture = new THREE.CanvasTexture(canvas);

  function redraw(text: string) {
    const ctx = canvas.getContext("2d")!;

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

  $effect(() => { redraw($textStore); });

  // ── Search button icon ────────────────────────────────────────────────────
  const BTN_SIZE = BAR_H;
  const GAP = 0.01;
  const btnX = BAR_W / 2 + GAP + BTN_SIZE / 2;

  const btnCanvas = document.createElement("canvas");
  btnCanvas.width = 128;
  btnCanvas.height = 128;
  const btnTexture = new THREE.CanvasTexture(btnCanvas);

  (() => {
    const ctx = btnCanvas.getContext("2d")!;
    const S = 128;
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
    btnTexture.needsUpdate = true;
  })();
</script>

<Grabbable scale={1}>
  <!-- <T.Mesh>
    <T.SphereGeometry args={[0.05, 4, 4]}/>
    <T.MeshBasicMaterial color="blue"/>
  </T.Mesh> -->
  <!-- Text field -->
  <T.Mesh position={[0, 0.2, -0.8]}>
    <T.PlaneGeometry args={[BAR_W, BAR_H]} />
    <T.MeshBasicMaterial map={texture} side={THREE.DoubleSide} />
  </T.Mesh>

  <!-- Search button -->
  <T.Group position={[btnX, 0.2, -0.8]}>
    <Button onpress={() => onsearch?.($textStore)}>
      <T.Mesh>
        <T.PlaneGeometry args={[BTN_SIZE, BTN_SIZE]} />
        <T.MeshBasicMaterial map={btnTexture} side={THREE.DoubleSide} />
      </T.Mesh>
    </Button>
  </T.Group>
</Grabbable>
