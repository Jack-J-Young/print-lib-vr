<script lang="ts">
  import Pointer from "$lib/Pointer.svelte";
  import { T, useTask, useThrelte, type CurrentReadable } from "@threlte/core";
  import { Controller, useController, useHand, useXR } from "@threlte/xr";
  import type { XRController } from "@threlte/xr";
  import * as THREE from "three";
  import { RaycastEngine, TRIGGER_BUTTON, GRIP_BUTTON } from "$lib/RaycastEngine.svelte";
  import HandControls from "$lib/HandControls.svelte";
  import { thumbstick } from "$lib/stores/thumbstickStore";

  let {
    left = $bindable(useController("left")),
    right = $bindable(useController("right")),
  }: {
    left?: CurrentReadable<XRController | undefined>;
    right?: CurrentReadable<XRController | undefined>;
  } = $props();

  const { scene } = useThrelte();
  const { isHandTracking } = useXR();
  const rightHand = useHand("right");

  const engine = new RaycastEngine(scene);
  let handMode: "interact" | "grab" = $state("interact");

  const interactColor = 0x44ff44;
  const grabColor = 0xff8800;
  const handColor = $derived(handMode === "interact" ? interactColor : grabColor);

  useTask((delta) => {
    if ($isHandTracking) {
      const hand = $rightHand;
      if (!hand) return;
      hand.targetRay.matrixWorldNeedsUpdate = true;
      const m = hand.targetRay.matrixWorld;
      const rotation = new THREE.Matrix4().extractRotation(m);
      const origin = new THREE.Vector3().setFromMatrixPosition(m);
      const direction = new THREE.Vector3(0, 0, -1).applyMatrix4(rotation);
      engine.cast(delta, origin, direction, m);
    } else {
      if (!$right) return;
      const gamepad = $right.inputSource.gamepad;
      if (!gamepad) return;
      engine.updateFromGamepad(gamepad);
      const axes = gamepad.axes;
      thumbstick.x = axes.length > 3 ? axes[2] : (axes[0] ?? 0);
      thumbstick.y = axes.length > 3 ? axes[3] : (axes[1] ?? 0);
      const grip = $right.grip;
      if (!grip) return;
      grip.matrixWorldNeedsUpdate = true;
      const m = grip.matrixWorld;
      const rotation = new THREE.Matrix4().extractRotation(m);
      const origin = new THREE.Vector3().setFromMatrixPosition(m);
      const direction = new THREE.Vector3(0, -1, 0).applyMatrix4(rotation);
      engine.cast(delta, origin, direction, m);
    }
  });
</script>

<!-- Left controller: brand-matched model only (no interaction ray needed). -->
<Controller left />

<!-- Right controller: brand-matched model + aiming ray in the grip space. -->
<Controller right>
  {#snippet grip()}
    {@const pressed = engine.rButtons[TRIGGER_BUTTON - 1] || engine.rButtons[GRIP_BUTTON - 1]}
    <Pointer
      color={pressed ? 0x6666ff : "blue"}
      radius={pressed ? 0.01 : 0.005}
      length={pressed ? 0.25 : 1}
    />
  {/snippet}
</Controller>

<!-- Hand visuals and pinch input. -->
<HandControls {engine} bind:handMode {handColor} />

<!-- World-space intersection point indicator. -->
{#if engine.rPoint}
  {@const pressed = engine.rButtons[TRIGGER_BUTTON - 1] || engine.rButtons[GRIP_BUTTON - 1]}
  <T.Mesh position={engine.rPoint.toArray()}>
    <T.SphereGeometry args={pressed ? [0.01, 2, 2] : [0.01, 8, 8]} />
    <T.MeshStandardMaterial color={pressed ? 0x6666ff : "blue"} />
  </T.Mesh>
{/if}
