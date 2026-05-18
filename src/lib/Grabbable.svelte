<script lang="ts">                      
  import { onMount } from "svelte";
  import { T } from "@threlte/core";
  import * as THREE from "three";
  import { Callback, CallbackType, interactStore } from "$lib/stores/interactStore";
  import type { HoldEvent } from "$lib/HoldEvent";

  let { children, scale = 1 }: { children: any; scale?: number | [x: number, y: number, z: number] } = $props();
  

  let ref: THREE.Group = $state(new THREE.Group());

  let event: HoldEvent | undefined = $state();

  function tick(delta?: number, matrix?: THREE.Matrix4): void {
    
    if (!event) return;
    if (delta) event.delta += delta;
    if (!matrix) return;
    
    if (!ref.parent) return;
    
    let newWorld = new THREE.Matrix4().copy(matrix).multiply(event.offset);
    let newLocal = new THREE.Matrix4().copy(ref.parent.matrixWorld).invert().multiply(newWorld);
    
    ref.matrixAutoUpdate = false;
    ref.matrix.copy(newLocal);
    ref.matrixWorldNeedsUpdate = true  
  }
  
  function start(delta?: number, matrix?: THREE.Matrix4): void {
    if (!matrix) return;
    
    let callbacks = $interactStore.callbacks;
    let map = callbacks.get(ref.id);
    if (!map) return;
    
    map.set(Callback.packKey(CallbackType.Tick, 2), tick);
    
    callbacks.set(ref.id, map);
    $interactStore.callbacks = callbacks;
    ref.updateWorldMatrix(true, false);
    let transform = new THREE.Matrix4()
    .copy(matrix)
    .invert()
    .multiply(ref.matrixWorld);
    
    event = {
      offset: transform,
      delta: 0,
    };
  }

  function end(delta?: number, matrix?: THREE.Matrix4): void {
    if (!event) return;
    if (delta) event.delta += delta;
    if (!matrix) return;

    if (!ref.parent) return;

    let newWorld = new THREE.Matrix4().copy(matrix).multiply(event.offset);
    let newLocal = new THREE.Matrix4().copy(ref.parent.matrixWorld).invert().multiply(newWorld);
    
    ref.matrixAutoUpdate = false;
    ref.matrix.copy(newLocal);
    ref.matrixWorldNeedsUpdate = true;

    event = undefined;
  }

  onMount(() => {
    if (!ref) return;
    // ref.matrixAutoUpdate = false;
    $interactStore.hitboxIds?.push(ref.id);
    let callbacks = $interactStore.callbacks;
    let map: Map<bigint, (delta?: number, matrix?: THREE.Matrix4) => void> = new Map([
      [Callback.packKey(CallbackType.Start, 2), start],
      [Callback.packKey(CallbackType.End, 2), end],
    ]);
    callbacks.set(ref.id, map);
    $interactStore.callbacks = callbacks;
  });

  
</script>

<T.Group bind:ref scale={scale}>
  {@render children()}
</T.Group>
