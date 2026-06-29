<script lang="ts">
  import { T } from "@threlte/core";
  import * as THREE from "three";
  import { registerHitbox } from "$lib/ui/interactables/useRegister";

  let { children } = $props();

  let ref: THREE.Object3D | undefined = $state();

  registerHitbox(() => ref?.id);
</script>

<T.Object3D bind:ref={ref}>
  {@render children()}
</T.Object3D>
