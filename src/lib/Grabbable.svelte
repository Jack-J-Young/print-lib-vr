<script lang="ts">
  import { onMount } from "svelte";
  import { T } from "@threlte/core";
  import * as THREE from "three";
  import { registry } from "$lib/stores/registryStore.svelte";

  let { children, scale = 1 }: { children: any; scale?: number | [number, number, number] } = $props();

  let ref: THREE.Group = $state(new THREE.Group());

  onMount(() => {
    registry.registerGrabbable(ref.id);
    return () => registry.unregister(ref.id);
  });
</script>

<T.Group bind:ref {scale}>
  {@render children()}
</T.Group>
