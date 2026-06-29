<script lang="ts">
  import Pointer from "$lib/models/Pointer.svelte";
  import { useTask, useThrelte } from "@threlte/core";
  import { Controller, useController } from "@threlte/xr";
  import type { RaycastEngine } from "$lib/ui/input/RaycastEngine.svelte";
  import { ControllerInputController } from "$lib/ui/input/ControllerInputController";
  import { controllerActive, controllerBeamColor } from "$lib/ui/input/beamStyle";

  let { engine, active }: { engine: RaycastEngine; active: boolean } = $props();

  const { scene } = useThrelte();
  const right = useController("right");

  const controller = new ControllerInputController(engine, scene, {
    grip:    () => $right?.grip,
    gamepad: () => $right?.inputSource?.gamepad ?? undefined,
  });

  useTask((delta) => {
    if (active) controller.update(delta);
  });
</script>

<Controller left />

<Controller right>
  {#snippet grip()}
    {@const activated = controllerActive()}
    <Pointer
      color={controllerBeamColor()}
      radius={activated ? 0.01 : 0.005}
      length={activated ? 0.25 : 1}
    />
  {/snippet}
</Controller>
