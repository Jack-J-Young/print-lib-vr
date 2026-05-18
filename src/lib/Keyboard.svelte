<script lang="ts">
  import { T } from "@threlte/core";
  import * as THREE from "three";
  import Grabbable from "$lib/Grabbable.svelte";
  import Button from "$lib/Button.svelte";
  import { textStore } from "$lib/stores/textStore";

  const IGNORE = new Set(['Shift', 'Caps', 'Ctrl', 'Win', 'Alt', 'AltGr', 'Fn', 'Menu', 'Tab']);
  let shiftActive = $state(false);

  function handleKey(letter: string) {
    if (letter === '⌫') { textStore.update(t => t.slice(0, -1)); return; }
    if (letter === 'Space') { textStore.update(t => t + ' '); return; }
    if (letter === 'Enter') { textStore.update(t => t + '\n'); return; }
    if (letter === 'Shift') { shiftActive = !shiftActive; return; }
    if (IGNORE.has(letter)) return;
    const char = shiftActive ? letter.toUpperCase() : letter;
    textStore.update(t => t + char);
    shiftActive = false; // auto-release shift after one key
  }

  function makeLetterTexture(letter: string, size: number
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = 256 * size;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;

    // Background
    ctx.fillStyle = "#111111+";
    ctx.rect(0, 0, 256 * size, 256);
    ctx.fill();

    // Letter
    ctx.fillStyle = "white";
    ctx.font = "bold 160px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, (256 * size) / 2, 128); // centred in wider canvas

    return new THREE.CanvasTexture(canvas);
  }

  const rows = [
    {
      letters: "`1234567890-=⌫".split(""),
      sizes: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    },
    {
      letters: [
        "Tab",
        "q",
        "w",
        "e",
        "r",
        "t",
        "y",
        "u",
        "i",
        "o",
        "p",
        "[",
        "]",
        "#",
      ],
      sizes: [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    },
    {
      letters: [
        "Caps",
        "a",
        "s",
        "d",
        "f",
        "g",
        "h",
        "j",
        "k",
        "l",
        ";",
        "'",
        "Enter",
      ],
      sizes: [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
    },
    {
      letters: [
        "Shift",
        "\\",
        "z",
        "x",
        "c",
        "v",
        "b",
        "n",
        "m",
        ",",
        ".",
        "/",
        "Shift",
      ],
      sizes: [1.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75],
    },
    {
      letters: ["Ctrl", "Win", "Alt", "Space", "AltGr", "Fn", "Menu", "Ctrl"],
      sizes: [1.25, 1.25, 1.25, 6.25, 1.25, 1, 1, 1.25],
    },
  ];

  const rowSpacing = 0.35;

  const totalWidth = Math.max(
    ...rows.map((r) => r.sizes.reduce((a, b) => a + b, 0)),
  ) * 0.5;
  const totalHeight = rows.length * rowSpacing;

  const rowData = rows.map((row, rowIndex) => {
    const positions = row.sizes.reduce<number[]>((acc, size, i) => {
      acc.push(
        i === 0 ? size / 2 : acc[i - 1] + row.sizes[i - 1] / 2 + size / 2,
      );
      return acc;
    }, []);
    const textures = row.letters.map((l, i) =>
      makeLetterTexture(l, row.sizes[i]),
    );
    const y = -rowIndex * rowSpacing;
    return { ...row, positions, textures, y };
  });
</script>

<Grabbable scale={0.1}>
    <T.Mesh
      position={[totalWidth * 0.3, -totalHeight * 0.5 + rowSpacing * 0.5, -1]}
    >
      <T.PlaneGeometry args={[totalWidth * 0.6, totalHeight]} />
      <T.MeshBasicMaterial color="gray" transparent side={THREE.DoubleSide} />
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
