<script lang="ts">
  import { T } from "@threlte/core";
  import * as THREE from "three";
  import Grabbable from "$lib/ui/interactables/Grabbable.svelte";
  import Button from "$lib/ui/interactables/Button.svelte";
  import {
    buildRows,
    rows,
    rowSpacing,
    totalWidth,
    totalHeight,
  } from "./keyboard/layout";
  import { makeLetterTexture } from "./keyboard/letterTexture";
  import { pressKey } from "./keyboard/keyInput";

  let shiftActive = $state(false);

  function handleKey(letter: string) {
    shiftActive = pressKey(letter, shiftActive);
  }

  const rowData = buildRows(rows, rowSpacing).map((row) => ({
    ...row,
    textures: row.letters.map((l, i) => makeLetterTexture(l, row.sizes[i])),
  }));
</script>

<Grabbable scale={0.1}>
    <T.Mesh
      position={[totalWidth * 0.3, -totalHeight * 0.5 + rowSpacing * 0.5, -1]}
    >
      <T.PlaneGeometry args={[totalWidth * 0.6, totalHeight]} />
      <T.MeshBasicMaterial color="gray" side={THREE.DoubleSide} />
    </T.Mesh>
    {#each rowData as row}
      {#each row.letters as letter, i}
        <Button onpress={() => handleKey(letter)}>
          <T.Mesh
            position={[row.positions[i] * 0.3, row.y, -0.9]}
            scale={[row.sizes[i] * 0.5, 0.5, 0.5]}
          >
            <T.PlaneGeometry args={[0.5, 0.5]} />
            <T.MeshBasicMaterial
              map={row.textures[i]}
              side={THREE.FrontSide}
            />
          </T.Mesh>
        </Button>
      {/each}
    {/each}
</Grabbable>
