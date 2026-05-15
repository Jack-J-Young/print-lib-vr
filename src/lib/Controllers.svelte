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
  const lc = new THREE.Raycaster();
  let rPoint: THREE.Vector3 | undefined = $state();

  let rButtons: Boolean[] = $state([]);

  // Hand mode: 'interact' = button 1, 'grab' = button 2
  let handMode: 'interact' | 'grab' = $state('interact');
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
      let button = Callback.unpackKey(key).button;
      if (rButtons[button - 1]) {
        if (callback) callback(delta, matrix);
      } else {
        let endCallback = endCallbacks.get(key);
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
    let map = $interactStore.callbacks.get(id);
    if (!map) return;
    if (!endCallbacks.has(Callback.packKey(id, button))) {
      if (!map) return;

      let startCallback = map.get(Callback.packKey(CallbackType.Start, button));
      if (startCallback) {
        startCallback(delta, matrix);
      }

      let tickCallback = map.get(Callback.packKey(CallbackType.Tick, button));
      if (tickCallback) {
        tickCallbacks.set(Callback.packKey(id, button), tickCallback);
      }

      let endCallback = map.get(Callback.packKey(CallbackType.End, button));
      if (endCallback) {
        endCallbacks.set(Callback.packKey(id, button), endCallback);
        if (!tickCallback) {
          tickCallbacks.set(Callback.packKey(id, button), null);
        }
      }
    }
  }

  // Colours
const interactColor = 0x44ff44;
const grabColor = 0xff8800;
const handColor = $derived(handMode === 'interact' ? interactColor : grabColor);

  useTask((delta) => {
    // --- Hand tracking: left pinch toggles mode ---
    if ($isHandTracking && $left) {
      const leftGamepad = $left.inputSource.gamepad;
      // pinch is typically button index 0 on hand tracking
      const pinchActive = leftGamepad?.buttons[0]?.pressed ?? false;
      if (pinchActive && !leftPinchWasActive) {
        handMode = handMode === 'interact' ? 'grab' : 'interact';
      }
      leftPinchWasActive = pinchActive;
    }

    if ($interactStore.hitboxIds.length == 0) return;
    if (!$right) return;

    let gamepad = $right.inputSource.gamepad;
    if (!gamepad) return;

    let buttons = gamepad.buttons;
    rButtons = Array(buttons.length).fill(false);

    if ($isHandTracking) {
      // In hand tracking mode, synthesise the active button based on handMode
      // right hand pinch = button 0 on gamepad
      const rightPinch = gamepad.buttons[0]?.pressed ?? false;
      if (rightPinch) {
        const activeButton = handMode === 'interact' ? 0 : 1; // 0-indexed gamepad
        rButtons[activeButton] = true;
      }
    } else {
      for (let i = 0; i < buttons.length; i++) {
        rButtons[i] = buttons[i].pressed ?? false;
      }
    }

    const rcon = $right?.grip;
    if (!rcon) return;

    rcon.matrixWorldNeedsUpdate = true;

    tickUpdate(delta, rcon.matrixWorld);

    if (rcon) {
      rc.ray.origin.setFromMatrixPosition(rcon.matrixWorld);
      const matrix = new THREE.Matrix4().extractRotation(rcon.matrixWorld);
      rc.ray.direction.set(0, -1, 0).applyMatrix4(matrix);

      let objects = $interactStore.hitboxIds
        .map((id) => scene.getObjectById(id))
        .filter<THREE.Object3D>((obj) => obj != undefined);

      const intersects = rc.intersectObjects(objects, true);

      if (intersects.length > 0) {
        rPoint = intersects[0].point;

        for (const intersect of intersects) {
          let ref = intersect.object;
          if (!ref.parent) continue;

          if (!isButtonActive(0)) {
            press(0, ref.parent.id, delta, rcon.matrixWorld);
          }

          for (let i = 0; i < rButtons.length; i++) {
            if (rButtons[i] && !isButtonActive(i + 1)) {
              press(i + 1, ref.parent.id, delta, rcon.matrixWorld);
            }
          }
        }
      } else {
        rPoint = undefined;
      }
    }
  });
</script>

<!-- Controller models (with brand-matched glTF) -->
<Controller left>
  <Pointer color="red" />
</Controller>

<Controller right>
  <Pointer
    color={rButtons[1] ? 0x6666ff : "blue"}
    radius={rButtons[1] ? 0.01 : 0.005}
    length={rButtons[1] ? 0.25 : 1}
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
    <T.SphereGeometry args={rButtons[1] ? [0.01, 2, 2] : [0.01, 8, 8]} />
    <T.MeshStandardMaterial color={rButtons[1] ? 0x6666ff : "blue"} />
  </T.Mesh>
{/if}
