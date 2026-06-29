<script lang="ts">
  import { useThrelte } from "@threlte/core";
  import { useXR } from "@threlte/xr";
  import { RaycastEngine } from "$lib/ui/input/RaycastEngine.svelte";
  import ControllerInput from "$lib/ui/input/ControllerInput.svelte";
  import HandInput from "$lib/ui/input/HandInput.svelte";
  import HitMarker from "$lib/ui/input/HitMarker.svelte";
  import { toolStore } from "$lib/ui/input/stores/toolStore.svelte";
  import { TOOL_COLORS } from "$lib/ui/input/tools/colors";
  import { controllerActive, controllerBeamColor } from "$lib/ui/input/beamStyle";

  // Input hub: one shared raycaster feeds both input sources; only the active one
  // casts each frame, so the hit marker always reflects whichever is in use.
  const { scene } = useThrelte();
  const { isHandTracking } = useXR();
  const engine = new RaycastEngine(scene);

  let handIsPressed = $state(false);
</script>

<ControllerInput {engine} active={!$isHandTracking} />
<HandInput {engine} active={$isHandTracking} bind:handIsPressed />

{#if engine.hitPoint}
  {@const activated = $isHandTracking ? handIsPressed : controllerActive()}
  {@const idleColor = $isHandTracking ? toolStore.color : controllerBeamColor()}
  <HitMarker point={engine.hitPoint} color={activated ? TOOL_COLORS.activated : idleColor} />
{/if}
