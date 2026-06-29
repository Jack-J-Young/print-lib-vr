<script lang="ts">
  import { T } from "@threlte/core";
  import * as THREE from "three";
  import { registerInteractable } from "$lib/ui/interactables/useRegister";

  let { children, onpress }: { children: any; onpress?: () => void } = $props();

  let ref: THREE.Group = $state(new THREE.Group());

  const rootPos = new THREE.Vector3();
  const hoverPos = new THREE.Vector3();
  const clickPos = new THREE.Vector3();
  let hovering = false;

  registerInteractable(() => ref.id, () => {
    rootPos.copy(ref.position);
    hoverPos.copy(ref.position);
    hoverPos.z += 0.025;
    clickPos.copy(ref.position);
    clickPos.z -= 0.05;

    return {
      onHoverStart() { hovering = true; ref.position.copy(hoverPos); },
      onHoverEnd()   { hovering = false; ref.position.copy(rootPos); },
      onPress()      { ref.position.copy(clickPos); onpress?.(); },
      onRelease()    { ref.position.copy(hovering ? hoverPos : rootPos); },
    };
  });
</script>

<T.Group bind:ref>
  {@render children()}
</T.Group>
