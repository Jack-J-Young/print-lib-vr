<script lang="ts">
  import { T } from "@threlte/core";
  import * as THREE from "three";
  import Button from "$lib/ui/interactables/Button.svelte";
  import { registerGrabbable, registerInteractable } from "$lib/ui/interactables/useRegister";
  import { makeCanvasTexture } from "$lib/textures/makeCanvasTexture";
  import { makeArrow } from "$lib/services/arrowTexture";

  // Reusable scrollable canvas plane. Draws via the `render` callback, pages with
  // side buttons, and turns a 3D hit on its face into a canvas-pixel coordinate so
  // callers can treat regions of the canvas as buttons. Grabbable + interactable:
  // only one tool drives at a time, so moving and clicking never collide.
  let {
    position = [0, 0.5, -1.5] as [number, number, number],
    worldWidth = 1,
    worldHeight = 1,
    pxWidth = 1024,
    pxHeight = 1024,
    pageCount = 1,
    grabbable = true,
    page = $bindable(0),
    render,
    onSelect,
    onHover,
    onHoverEnd,
  }: {
    position?: [number, number, number];
    worldWidth?: number;
    worldHeight?: number;
    pxWidth?: number;
    pxHeight?: number;
    pageCount?: number;
    grabbable?: boolean;
    page?: number;
    render: (ctx: CanvasRenderingContext2D, page: number) => void;
    onSelect?: (x: number, y: number, page: number) => void;
    onHover?: (x: number, y: number, page: number) => void;
    onHoverEnd?: () => void;
  } = $props();

  const { ctx, texture } = makeCanvasTexture(pxWidth, pxHeight);

  let groupRef: THREE.Group | undefined = $state();
  let planeRef: THREE.Mesh | undefined = $state();

  const _local = new THREE.Vector3();
  function toPixel(point: THREE.Vector3): { x: number; y: number } | null {
    if (!planeRef) return null;
    _local.copy(point);
    planeRef.worldToLocal(_local);
    return {
      x: (_local.x / worldWidth + 0.5) * pxWidth,
      y: (0.5 - _local.y / worldHeight) * pxHeight,
    };
  }

  if (grabbable) registerGrabbable(() => groupRef?.id);
  registerInteractable(() => groupRef?.id, () => ({
    onHover(point) {
      const p = toPixel(point);
      if (p) onHover?.(p.x, p.y, page);
    },
    onHoverEnd() { onHoverEnd?.(); },
    onPress(point) {
      if (!point) return;
      const p = toPixel(point);
      if (p) onSelect?.(p.x, p.y, page);
    },
  }));

  // Clamp the page if the content shrinks under it.
  $effect(() => {
    if (page > pageCount - 1) page = Math.max(0, pageCount - 1);
  });

  $effect(() => {
    render(ctx, page);
    texture.needsUpdate = true;
  });

  const upTex = makeArrow(true);
  const downTex = makeArrow(false);

  const BTN = worldWidth * 0.09;
  const BTN_X = worldWidth / 2 + 0.01 + BTN / 2;
</script>

<T.Group bind:ref={groupRef} {position}>
  <T.Mesh bind:ref={planeRef}>
    <T.PlaneGeometry args={[worldWidth, worldHeight]} />
    <T.MeshBasicMaterial map={texture} side={THREE.DoubleSide} />
  </T.Mesh>

  {#if pageCount > 1}
    <T.Group position={[BTN_X, BTN * 0.6, 0]}>
      <Button onpress={() => { page = Math.max(0, page - 1); }}>
        <T.Mesh>
          <T.PlaneGeometry args={[BTN, BTN]} />
          <T.MeshBasicMaterial map={upTex} side={THREE.DoubleSide} />
        </T.Mesh>
      </Button>
    </T.Group>

    <T.Group position={[BTN_X, -BTN * 0.6, 0]}>
      <Button onpress={() => { page = Math.min(pageCount - 1, page + 1); }}>
        <T.Mesh>
          <T.PlaneGeometry args={[BTN, BTN]} />
          <T.MeshBasicMaterial map={downTex} side={THREE.DoubleSide} />
        </T.Mesh>
      </Button>
    </T.Group>
  {/if}
</T.Group>
