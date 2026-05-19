<script lang="ts">
  import { onMount } from "svelte";
  import { T } from "@threlte/core";
  import * as THREE from "three";
  import { Callback, CallbackType, interactStore } from "$lib/stores/interactStore";

  let { children, onpress }: { children: any; onpress?: () => void } = $props();

  let ref: THREE.Group = $state(new THREE.Group());

  let rootPos: THREE.Vector3 = new THREE.Vector3();
  let hoverPos: THREE.Vector3 = new THREE.Vector3();
  let clickPos: THREE.Vector3 = new THREE.Vector3();
  let hovering: boolean;

  function hoverStart(delta?: number, matrix?: THREE.Matrix4): void {
    hovering = true;
    ref.position.copy(hoverPos);
  }

  function hoverEnd(delta?: number, matrix?: THREE.Matrix4): void {
    hovering = false;
    ref.position.copy(rootPos);
  }

  function clickStart(delta?: number, matrix?: THREE.Matrix4): void {
    ref.position.copy(clickPos);
    onpress?.();
  }

  function clickEnd(delta?: number, matrix?: THREE.Matrix4): void {
    ref.position.copy(hovering ? hoverPos : rootPos);
  }

  onMount(() => {
    if (!ref) return;
    rootPos.copy(ref.position);
    hoverPos.copy(ref.position);
    hoverPos.z += 0.025;
    clickPos.copy(ref.position);
    clickPos.z -= 0.05;
    $interactStore.hitboxIds?.push(ref.id);
    let callbacks = $interactStore.callbacks;
    let map: Map<bigint, (delta?: number, matrix?: THREE.Matrix4) => void> = new Map([
      [Callback.packKey(CallbackType.Start, 0), hoverStart],
      [Callback.packKey(CallbackType.End, 0), hoverEnd],
      [Callback.packKey(CallbackType.Start, 1), clickStart],
      [Callback.packKey(CallbackType.End, 1), clickEnd],
    ]);
    callbacks.set(ref.id, map);
    $interactStore.callbacks = callbacks;
  });
</script>

<T.Group bind:ref>
  {@render children()}
</T.Group>
