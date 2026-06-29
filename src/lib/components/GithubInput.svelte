<script lang="ts">
  import { T } from "@threlte/core";
  import * as THREE from "three";
  import Grabbable from "$lib/ui/interactables/Grabbable.svelte";
  import Button from "$lib/ui/interactables/Button.svelte";
  import { textStore } from "$lib/stores/textStore.svelte";
  import {
    createTextFieldTexture,
    createSearchIconTexture,
  } from "./textures/githubInputTextures";

  let { onsearch }: { onsearch?: (text: string) => void } = $props();

  const BAR_W = 1.5;
  const BAR_H = 0.1875;

  const BTN_SIZE = BAR_H;
  const GAP = 0.01;
  const btnX = BAR_W / 2 + GAP + BTN_SIZE / 2;

  const textField = createTextFieldTexture();
  $effect(() => { textField.redraw(textStore.value); });

  const searchIcon = createSearchIconTexture();
</script>

<Grabbable scale={1}>
  <!-- Text field -->
  <T.Mesh position={[0, 0.2, -0.8]}>
    <T.PlaneGeometry args={[BAR_W, BAR_H]} />
    <T.MeshBasicMaterial map={textField.texture} side={THREE.DoubleSide} />
  </T.Mesh>

  <!-- Search button -->
  <T.Group position={[btnX, 0.2, -0.8]}>
    <Button onpress={() => onsearch?.(textStore.value)}>
      <T.Mesh>
        <T.PlaneGeometry args={[BTN_SIZE, BTN_SIZE]} />
        <T.MeshBasicMaterial map={searchIcon} side={THREE.DoubleSide} />
      </T.Mesh>
    </Button>
  </T.Group>
</Grabbable>
