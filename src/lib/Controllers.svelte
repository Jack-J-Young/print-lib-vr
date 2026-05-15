<script lang="ts">
  import Pointer from "$lib/Pointer.svelte";
  import {
    Callback,
    CallbackType,
    interactStore,
  } from "$lib/stores/interactStore";
  import { T, useTask, useThrelte, type CurrentReadable } from "@threlte/core";
  import { Controller, Hand, useController, useXR } from "@threlte/xr";
  import type { XRController } from "@threlte/xr";
  import * as THREE from "three";

  let {
    left = $bindable(useController("left")),
    right = $bindable(useController("right")),
  }: {
    left?: CurrentReadable<XRController | undefined>;
    right?: CurrentReadable<XRController | undefined>;
  } = $props();

  let { scene } = useThrelte();
  const { isHandTracking } = useXR();

  const rc = new THREE.Raycaster();
  let rPoint: THREE.Vector3 | undefined = $state();
  let rButtons: boolean[] = $state([]);

  // Callback button numbers: 0 = hover (synthetic), 1 = trigger (gamepad[0]), 2 = grip (gamepad[1])
  const HOVER_BUTTON = 0;
  const TRIGGER_BUTTON = 1;
  const GRIP_BUTTON = 2;

  // Hand mode: 'interact' maps right pinch → trigger, 'grab' maps right pinch → grip
  let handMode: "interact" | "grab" = $state("interact");
  let leftPinchWasActive = false;

  let tickCallbacks: Map<
    bigint,
    null | ((delta?: number, matrix?: THREE.Matrix4) => void)
  > = new Map();
  let endCallbacks: Map<
    bigint,
    (delta?: number, matrix?: THREE.Matrix4) => void
  > = new Map();

  function isButtonActive(button: number): boolean {
    for (const key of endCallbacks.keys()) {
      if (Callback.unpackKey(key).button === button) return true;
    }
    return false;
  }

  function tickUpdate(delta?: number, matrix?: THREE.Matrix4) {
    tickCallbacks.forEach((callback, key) => {
      const button = Callback.unpackKey(key).button;
      if (rButtons[button - 1]) {
        if (callback) callback(delta, matrix);
      } else {
        const endCallback = endCallbacks.get(key);
        if (!endCallback) return;
        endCallback(delta, matrix);
        endCallbacks.delete(key);
        tickCallbacks.delete(key);
      }
    });
  }

  function press(
    button: number,
    id: number,
    delta?: number,
    matrix?: THREE.Matrix4,
  ) {
    const map = $interactStore.callbacks.get(id);
    if (!map) return;
    if (endCallbacks.has(Callback.packKey(id, button))) return;

    const startCallback = map.get(Callback.packKey(CallbackType.Start, button));
    if (startCallback) startCallback(delta, matrix);

    const tickCallback = map.get(Callback.packKey(CallbackType.Tick, button));
    if (tickCallback) {
      tickCallbacks.set(Callback.packKey(id, button), tickCallback);
    }

    const endCallback = map.get(Callback.packKey(CallbackType.End, button));
    if (endCallback) {
      endCallbacks.set(Callback.packKey(id, button), endCallback);
      if (!tickCallback) {
        tickCallbacks.set(Callback.packKey(id, button), null);
      }
    }
  }

  function updateHandMode() {
    if (!$isHandTracking || !$left) return;
    const pinchActive = $left.inputSource.gamepad?.buttons[0]?.pressed ?? false;
    if (pinchActive && !leftPinchWasActive) {
      handMode = handMode === "interact" ? "grab" : "interact";
    }
    leftPinchWasActive = pinchActive;
  }

  function updateButtons(gamepad: Gamepad) {
    rButtons = Array(gamepad.buttons.length).fill(false);
    if ($isHandTracking) {
      const rightPinch = gamepad.buttons[0]?.pressed ?? false;
      if (rightPinch) {
        // rButtons is 0-indexed; callback buttons are offset by 1
        rButtons[handMode === "interact" ? TRIGGER_BUTTON - 1 : GRIP_BUTTON - 1] = true;
      }
    } else {
      for (let i = 0; i < gamepad.buttons.length; i++) {
        rButtons[i] = gamepad.buttons[i].pressed ?? false;
      }
    }
  }

  function castRay(delta: number, gripMatrix: THREE.Matrix4) {
    tickUpdate(delta, gripMatrix);

    rc.ray.origin.setFromMatrixPosition(gripMatrix);
    const rotation = new THREE.Matrix4().extractRotation(gripMatrix);
    rc.ray.direction.set(0, -1, 0).applyMatrix4(rotation);

    const objects = $interactStore.hitboxIds
      .map((id) => scene.getObjectById(id))
      .filter<THREE.Object3D>((obj) => obj != undefined);

    const intersects = rc.intersectObjects(objects, true);

    if (intersects.length > 0) {
      rPoint = intersects[0].point;
      for (const intersect of intersects) {
        const ref = intersect.object;
        if (!ref.parent) continue;
        if (!isButtonActive(HOVER_BUTTON)) {
          press(HOVER_BUTTON, ref.parent.id, delta, gripMatrix);
        }
        for (let i = 0; i < rButtons.length; i++) {
          if (rButtons[i] && !isButtonActive(i + 1)) {
            press(i + 1, ref.parent.id, delta, gripMatrix);
          }
        }
      }
    } else {
      rPoint = undefined;
    }
  }

  const interactColor = 0x44ff44;
  const grabColor = 0xff8800;
  const handColor = $derived(handMode === "interact" ? interactColor : grabColor);

  useTask((delta) => {
    updateHandMode();

    if ($interactStore.hitboxIds.length === 0) return;
    if (!$right) return;

    const gamepad = $right.inputSource.gamepad;
    if (!gamepad) return;

    updateButtons(gamepad);

    const grip = $right.grip;
    if (!grip) return;

    grip.matrixWorldNeedsUpdate = true;
    castRay(delta, grip.matrixWorld);
  });
</script>

<!-- Controller models (with brand-matched glTF) -->
<Controller left>
  <Pointer color="red" />
</Controller>

<Controller right>
  <Pointer
    color={rButtons[TRIGGER_BUTTON - 1] ? 0x6666ff : "blue"}
    radius={rButtons[TRIGGER_BUTTON - 1] ? 0.01 : 0.005}
    length={rButtons[TRIGGER_BUTTON - 1] ? 0.25 : 1}
  />
</Controller>

<!-- Hand tracking meshes, coloured by mode -->
<Hand left>
  <T.Mesh>
    <T.SphereGeometry args={[0.01, 8, 8]} />
    <T.MeshBasicMaterial color={handColor} />
  </T.Mesh>
</Hand>

<Hand right>
  <T.Mesh>
    <T.SphereGeometry args={[0.01, 8, 8]} />
    <T.MeshBasicMaterial color={handColor} />
  </T.Mesh>
</Hand>

<!-- Intersection point indicator -->
{#if rPoint}
  <T.Mesh position={rPoint.toArray()}>
    <T.SphereGeometry args={rButtons[TRIGGER_BUTTON - 1] ? [0.01, 2, 2] : [0.01, 8, 8]} />
    <T.MeshStandardMaterial color={rButtons[TRIGGER_BUTTON - 1] ? 0x6666ff : "blue"} />
  </T.Mesh>
{/if}
