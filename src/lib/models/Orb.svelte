<script lang="ts">
  import { T } from "@threlte/core";
  import type * as THREE from "three";

  // A unit-radius sphere whose transform is driven imperatively via `ref`
  // (position/scale written per frame). Used for the hand mode-switch orbs.
  let {
    ref = $bindable(),
    color,
    visible     = true,
    segments    = [16, 12] as [number, number],
    renderOrder = 0,
    lit         = false,
    transparent = false,
    depthTest   = true,
    depthWrite  = true,
  }: {
    ref?:         THREE.Mesh;
    color:        THREE.ColorRepresentation;
    visible?:     boolean;
    segments?:    [number, number];
    renderOrder?: number;
    lit?:         boolean;
    transparent?: boolean;
    depthTest?:   boolean;
    depthWrite?:  boolean;
  } = $props();
</script>

<T.Mesh bind:ref {visible} {renderOrder}>
  <T.SphereGeometry args={[1, segments[0], segments[1]]} />
  {#if lit}
    <T.MeshStandardMaterial {color} {transparent} {depthTest} {depthWrite} />
  {:else}
    <T.MeshBasicMaterial {color} {transparent} {depthTest} {depthWrite} />
  {/if}
</T.Mesh>
