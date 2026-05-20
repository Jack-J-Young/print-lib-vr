<script lang="ts">
  import { onMount } from "svelte";
  import { T } from "@threlte/core";
  import * as THREE from "three";
  import { registry } from "$lib/ui/interactables/stores/registryStore.svelte";

  let { children } = $props();

  let ref: THREE.Object3D | undefined = $state();

  onMount(() => {
    if (!ref) return;
    registry.registerHitbox(ref.id);
    const id = ref.id;
    return () => registry.unregister(id);
  });
</script>

<T.Object3D bind:ref={ref}>
  {@render children()}
</T.Object3D>
