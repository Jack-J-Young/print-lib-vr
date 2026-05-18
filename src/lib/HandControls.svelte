<script lang="ts">
  import Pointer from "$lib/Pointer.svelte";
  import { T } from "@threlte/core";
  import { Hand, useXR } from "@threlte/xr";
  import { type RaycastEngine, TRIGGER_BUTTON, GRIP_BUTTON } from "$lib/RaycastEngine.svelte";

  let {
    engine,
    handMode = $bindable<"interact" | "grab">(),
    handColor,
  }: {
    engine: RaycastEngine;
    handMode?: "interact" | "grab";
    handColor: number;
  } = $props();

  const { isHandTracking } = useXR();

  // Clear stale controller button state when switching to hand tracking.
  $effect(() => {
    if ($isHandTracking) engine.rButtons = [false, false];
  });
</script>

<!-- Left pinch cycles the interaction mode. -->
<Hand left onpinchstart={() => { handMode = handMode === "interact" ? "grab" : "interact"; }}>
  {#snippet wrist()}
    <T.Mesh>
      <T.SphereGeometry args={[0.015, 8, 8]} />
      <T.MeshBasicMaterial color={handColor} />
    </T.Mesh>
  {/snippet}
</Hand>

<!-- Right pinch maps to trigger or grip depending on the current mode. -->
<Hand right
  onpinchstart={() => {
    engine.rButtons = handMode === "interact" ? [true, false] : [false, true];
  }}
  onpinchend={() => {
    engine.rButtons = [false, false];
  }}
>
  {#snippet wrist()}
    <T.Mesh>
      <T.SphereGeometry args={[0.015, 8, 8]} />
      <T.MeshBasicMaterial color={handColor} />
    </T.Mesh>
  {/snippet}
  {#snippet targetRay()}
    <!-- targetRay space has -Z forward; rotate 90° around X so Pointer's -Y aligns with -Z. -->
    {@const pressed = engine.rButtons[TRIGGER_BUTTON - 1] || engine.rButtons[GRIP_BUTTON - 1]}
    <T.Group rotation={[Math.PI / 2, 0, 0]}>
      <Pointer
        color={pressed ? 0x6666ff : "blue"}
        radius={pressed ? 0.01 : 0.005}
        length={pressed ? 0.25 : 1}
      />
    </T.Group>
  {/snippet}
</Hand>
