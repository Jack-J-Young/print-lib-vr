<script lang="ts">
  import { T } from "@threlte/core";
  import * as THREE from "three";
  import { registerGrabbable } from "$lib/ui/interactables/useRegister";

  let { children, scale = 1 }: { children: any; scale?: number | [number, number, number] } = $props();

  let ref: THREE.Group = $state(new THREE.Group());

  registerGrabbable(() => ref.id);
</script>

<T.Group bind:ref {scale}>
  {@render children()}
</T.Group>
