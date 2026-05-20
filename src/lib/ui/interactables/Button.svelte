<script lang="ts">
  import { onMount } from "svelte";
  import { T } from "@threlte/core";
  import * as THREE from "three";
  import { registry } from "$lib/ui/interactables/stores/registryStore.svelte";

  let { children, onpress }: { children: any; onpress?: () => void } = $props();

  let ref: THREE.Group = $state(new THREE.Group());

  let rootPos = new THREE.Vector3();
  let hoverPos = new THREE.Vector3();
  let clickPos = new THREE.Vector3();
  let hovering = false;

  onMount(() => {
    rootPos.copy(ref.position);
    hoverPos.copy(ref.position);
    hoverPos.z += 0.025;
    clickPos.copy(ref.position);
    clickPos.z -= 0.05;

    registry.registerInteractable(ref.id, {
      onHoverStart() { hovering = true; ref.position.copy(hoverPos); },
      onHoverEnd()   { hovering = false; ref.position.copy(rootPos); },
      onPress()      { ref.position.copy(clickPos); onpress?.(); },
      onRelease()    { ref.position.copy(hovering ? hoverPos : rootPos); },
    });

    return () => registry.unregister(ref.id);
  });
</script>

<T.Group bind:ref>
  {@render children()}
</T.Group>
