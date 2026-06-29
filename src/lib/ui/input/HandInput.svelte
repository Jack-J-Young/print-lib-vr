<script lang="ts">
  import Pointer from "$lib/models/Pointer.svelte";
  import Orb from "$lib/models/Orb.svelte";
  import PinchJoystickOverlay from "$lib/ui/input/PinchJoystickOverlay.svelte";
  import { T, useTask, useThrelte } from "@threlte/core";
  import { Hand, useHand, useHandJoint } from "@threlte/xr";
  import type { RaycastEngine } from "$lib/ui/input/RaycastEngine.svelte";
  import { HandInputController } from "$lib/ui/input/hands/HandInputController.svelte";
  import type * as THREE from "three";

  let {
    engine,
    active,
    handIsPressed = $bindable(false),
  }: {
    engine: RaycastEngine;
    active: boolean;
    handIsPressed?: boolean;
  } = $props();

  const { camera, scene } = useThrelte();
  const rightHand = useHand("right");

  const leftWristJoint  = useHandJoint("left",  "wrist");
  const leftIndexJoint  = useHandJoint("left",  "index-finger-tip");
  const leftThumbJoint  = useHandJoint("left",  "thumb-tip");
  const leftPinkyJoint  = useHandJoint("left",  "pinky-finger-tip");
  const rightWristJoint = useHandJoint("right", "wrist");

  let switchBackRef:  THREE.Mesh | undefined = $state();
  let switchFrontRef: THREE.Mesh | undefined = $state();
  let palmOrbRef:     THREE.Mesh | undefined = $state();

  const controller = new HandInputController(engine, scene, {
    camera:         () => camera.current,
    leftWrist:      () => leftWristJoint.current,
    leftIndex:      () => leftIndexJoint.current,
    leftThumb:      () => leftThumbJoint.current,
    leftPinky:      () => leftPinkyJoint.current,
    rightWrist:     () => rightWristJoint.current,
    rightTargetRay: () => $rightHand?.targetRay,
    switchBack:     () => switchBackRef,
    switchFront:    () => switchFrontRef,
    palmOrb:        () => palmOrbRef,
  });

  useTask((delta) => {
    if (active) controller.update(delta);
  });

  $effect(() => { handIsPressed = controller.handIsPressed; });
</script>

{#if active}
  <Orb bind:ref={palmOrbRef}
    color={0xffffff}
    visible={controller.palmOrbVisible}
    segments={[12, 8]}
  />
  <Orb bind:ref={switchBackRef}
    color={controller.toolSwitch.backColor}
    visible={controller.toolSwitch.backVisible}
    renderOrder={-2}
  />
  <Orb bind:ref={switchFrontRef}
    color={controller.toolSwitch.frontColor}
    visible={controller.toolSwitch.frontVisible}
  />

  <Hand left
    onpinchstart={() => controller.onLeftPinchStart()}
    onpinchend={() => controller.onLeftPinchEnd()}
  >
    {#snippet targetRay()}
      <T.Group rotation={[Math.PI / 2, 0, 0]}>
        <Pointer
          color={controller.rayColor}
          radius={controller.leftPinching ? 0.01 : 0.005}
          length={controller.leftPinching ? 0.25 : 1}
        />
      </T.Group>
    {/snippet}
  </Hand>

  <Hand right
    onpinchstart={() => controller.onRightPinchStart()}
    onpinchend={() => controller.onRightPinchEnd()}
  >
    {#snippet targetRay()}
      <T.Group rotation={[Math.PI / 2, 0, 0]}>
        <Pointer
          color={controller.rayColor}
          radius={controller.handIsPressed ? 0.01 : 0.005}
          length={controller.handIsPressed ? 0.25 : 1}
        />
      </T.Group>
    {/snippet}
  </Hand>

  {#if controller.handIsPressed && controller.leftPinching}
    <PinchJoystickOverlay
      active={controller.joystick.showOrigin}
      rayOrigin={controller.joystick.rayOrigin}
      perpDir={controller.joystick.perpDir}
      axisX={controller.joystick.axisX}
    />
  {/if}
{/if}
