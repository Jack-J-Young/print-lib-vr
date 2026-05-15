<script lang="ts">
  import { onMount } from "svelte";
  import { T } from "@threlte/core";
  import * as THREE from "three";
  import { interactStore } from "$lib/stores/interactStore";

  let { children } = $props();

  let ref: THREE.Object3D | undefined = $state();

  onMount(() => {
    if (!ref) return;
    $interactStore.hitboxIds?.push(ref.id);
  });
</script>

<T.Object3D bind:ref={ref}>
  {@render children()}
</T.Object3D>
