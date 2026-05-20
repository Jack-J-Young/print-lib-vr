<script lang="ts">
  import Pointer from "$lib/models/Pointer.svelte";
  import { T, useTask, useThrelte, type CurrentReadable } from "@threlte/core";
  import { Controller, useController, useHand, useXR } from "@threlte/xr";
  import type { XRController } from "@threlte/xr";
  import * as THREE from "three";
  import { RaycastEngine } from "$lib/ui/input/RaycastEngine.svelte";
  import Hands from "$lib/ui/input/Hands.svelte";
  import { grabTool } from "$lib/ui/input/tools/GrabTool.svelte";
  import { interactTool } from "$lib/ui/input/tools/InteractTool.svelte";
  import { toolStore } from "$lib/ui/input/stores/toolStore.svelte";
  import type { AuxInput } from "$lib/ui/input/tools/Tool";

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

  // Written by HandControls each frame, read here.
  let handIsPressed: boolean = $state(false);
  let handAux: AuxInput = $state({ x: 0, y: 0 });

  const _rot = new THREE.Matrix4();
  const _origin = new THREE.Vector3();
  const _dir = new THREE.Vector3();

  useTask((delta) => {
    if ($isHandTracking) {
      const hand = $rightHand;
      if (!hand) return;
      hand.targetRay.matrixWorldNeedsUpdate = true;
      const m = hand.targetRay.matrixWorld;
      _rot.extractRotation(m);
      _origin.setFromMatrixPosition(m);
      _dir.set(0, 0, -1).applyMatrix4(_rot);
      engine.cast(_origin, _dir);

      toolStore.activeTool.update(delta, engine.hitId, handIsPressed, m, _dir, handAux, scene);
    } else {
      if (!$right) return;
      const gamepad = $right.inputSource.gamepad;
      if (!gamepad) return;

      const grip = $right.grip;
      if (!grip) return;
      grip.matrixWorldNeedsUpdate = true;
      const m = grip.matrixWorld;
      _rot.extractRotation(m);
      _origin.setFromMatrixPosition(m);
      _dir.set(0, -1, 0).applyMatrix4(_rot);
      engine.cast(_origin, _dir);

      const axes = gamepad.axes;
      const aux: AuxInput = {
        x: axes.length > 3 ? axes[2] : (axes[0] ?? 0),
        y: axes.length > 3 ? axes[3] : (axes[1] ?? 0),
      };

      const triggerPressed = gamepad.buttons[0]?.pressed ?? false;
      const gripPressed    = gamepad.buttons[1]?.pressed ?? false;

      interactTool.update(delta, engine.hitId, triggerPressed, m, _dir, aux, scene);
      grabTool.update(delta, engine.hitId, gripPressed, m, _dir, aux, scene);
    }
  });
</script>

<Controller left />

<Controller right>
  {#snippet grip()}
    {@const activated = grabTool.isActive || interactTool.isActive}
    {@const beamColor = grabTool.isActive ? grabTool.color : interactTool.isHovering ? interactTool.color : 0x4444aa}
    <Pointer
      color={beamColor}
      radius={activated ? 0.01 : 0.005}
      length={activated ? 0.25 : 1}
    />
  {/snippet}
</Controller>

<Hands bind:handIsPressed bind:handAux {engine} />

{#if engine.hitPoint}
  {@const activated = $isHandTracking ? handIsPressed : grabTool.isActive || interactTool.isActive}
  {@const idleColor = $isHandTracking ? toolStore.color : grabTool.isActive ? grabTool.color : interactTool.isHovering ? interactTool.color : 0x4444aa}
  <T.Mesh position={engine.hitPoint.toArray()}>
    <T.SphereGeometry args={[0.01, 8, 8]} />
    <T.MeshStandardMaterial color={activated ? 0xffffff : idleColor} />
  </T.Mesh>
{/if}
