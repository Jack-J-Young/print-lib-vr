<script lang="ts">                      
  import { onMount } from "svelte";
  import { T } from "@threlte/core";
  import * as THREE from "three";
  import { Callback, CallbackType, interactStore } from "$lib/stores/interactStore";
    // import type { HoldEvent } from "$lib/HoldEvent";

  let { children } = $props();

  let ref: THREE.Group = $state(new THREE.Group());

  let rootPos: THREE.Vector3 = new THREE.Vector3();
  let hoverPos: THREE.Vector3 = new THREE.Vector3();
  let clickPos: THREE.Vector3 = new THREE.Vector3();
  
  function hoverTick(delta?: number, matrix?: THREE.Matrix4): void {
    ref.position.copy(hoverPos);
  }

  function clickStart(delta?: number, matrix?: THREE.Matrix4): void {
    ref.position.copy(clickPos);
  }

  function clickEnd(delta?: number, matrix?: THREE.Matrix4): void {
    ref.position.copy(rootPos);
  }

  onMount(() => {
    if (!ref) return;
    rootPos.copy(ref.position);
    hoverPos.copy(ref.position);
    hoverPos.z += 0.025;
    clickPos.copy(ref.position);
    clickPos.z -= 0.05;
    // ref.matrixAutoUpdate = false;
    $interactStore.hitboxIds?.push(ref.id);
    let callbacks = $interactStore.callbacks;
    let map: Map<bigint, (delta?: number, matrix?: THREE.Matrix4) => void> = new Map([
      [Callback.packKey(CallbackType.Tick, 0), hoverTick],
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
