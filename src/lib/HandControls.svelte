<script lang="ts">
  import Pointer from "$lib/Pointer.svelte";
  import { T, useTask, useThrelte } from "@threlte/core";
  import { Hand, useXR } from "@threlte/xr";
  import { toolStore } from "$lib/stores/toolStore.svelte";
  import type { RaycastEngine } from "$lib/RaycastEngine.svelte";
  import type { AuxInput } from "$lib/tools/Tool";
  import * as THREE from "three";

  let {
    engine,
    handIsPressed = $bindable(false),
    handAux = $bindable<AuxInput>({ x: 0, y: 0 }),
  }: {
    engine: RaycastEngine;
    handIsPressed?: boolean;
    handAux?: AuxInput;
  } = $props();

  const { isHandTracking } = useXR();
  const { camera } = useThrelte();

  // Left wrist joint — bound via snippet so we get its world matrix.
  let leftWristRef: THREE.Object3D | undefined = $state(undefined);

  // Aux origin: left wrist position recorded when right-hand grab starts.
  let auxOrigin: THREE.Vector3 | undefined;
  let wasPinching = false;

  // Palm-facing-camera gesture state.
  let palmTimer = 0;
  let toolCooldown = 0;
  const PALM_HOLD      = 0.4;   // seconds to hold palm toward camera
  const TOOL_COOLDOWN  = 1.0;   // seconds before another switch
  const PALM_THRESH    = 0.65;  // dot product threshold
  const AUX_RANGE      = 0.25;  // metres of left-hand movement = full deflection

  const _palmNormal = new THREE.Vector3();
  const _toCam      = new THREE.Vector3();
  const _camPos     = new THREE.Vector3();
  const _wristPos   = new THREE.Vector3();
  const _leftCur    = new THREE.Vector3();
  const _rotMat     = new THREE.Matrix4();

  useTask((delta) => {
    if (!$isHandTracking) return;

    toolCooldown = Math.max(0, toolCooldown - delta);

    // ── Palm-facing-camera detection (left wrist) ─────────────────────────
    if (leftWristRef) {
      leftWristRef.updateWorldMatrix(true, false);
      _rotMat.extractRotation(leftWristRef.matrixWorld);
      // +Y of the wrist joint approximates the palm outward normal.
      _palmNormal.set(0, 1, 0).applyMatrix4(_rotMat);
      _wristPos.setFromMatrixPosition(leftWristRef.matrixWorld);
      camera.current.getWorldPosition(_camPos);
      _toCam.subVectors(_camPos, _wristPos).normalize();

      if (_palmNormal.dot(_toCam) > PALM_THRESH) {
        palmTimer += delta;
        if (palmTimer >= PALM_HOLD && toolCooldown === 0) {
          toolStore.cycleNext();
          toolCooldown = TOOL_COOLDOWN;
          palmTimer = 0;
        }
      } else {
        palmTimer = 0;
      }
    }

    // ── Left-hand aux input while right hand is pinching ─────────────────
    if (handIsPressed && leftWristRef) {
      if (!wasPinching) {
        // Grab just started — record left wrist as origin.
        leftWristRef.getWorldPosition(_wristPos);
        auxOrigin = _wristPos.clone();
      }
      if (auxOrigin) {
        leftWristRef.getWorldPosition(_leftCur);
        handAux = {
          x: Math.max(-1, Math.min(1, (_leftCur.x - auxOrigin.x) / AUX_RANGE)),
          y: Math.max(-1, Math.min(1, -(_leftCur.z - auxOrigin.z) / AUX_RANGE)),
        };
      }
    } else {
      auxOrigin = undefined;
      handAux = { x: 0, y: 0 };
    }

    wasPinching = handIsPressed;
  });
</script>

{#if $isHandTracking}

<!-- Left hand: wrist indicator + palm-facing detection anchor. -->
<Hand left>
  {#snippet wrist()}
    <T.Object3D bind:ref={leftWristRef} />
    <T.Mesh>
      <T.SphereGeometry args={[0.015, 8, 8]} />
      <T.MeshBasicMaterial color={toolStore.color} />
    </T.Mesh>
  {/snippet}
</Hand>

<!-- Right hand: pinch = activate current tool, targetRay = aiming ray. -->
<Hand right
  onpinchstart={() => { handIsPressed = true; }}
  onpinchend={()  => { handIsPressed = false; }}
>
  {#snippet wrist()}
    <T.Mesh>
      <T.SphereGeometry args={[0.015, 8, 8]} />
      <T.MeshBasicMaterial color={toolStore.color} />
    </T.Mesh>
  {/snippet}
  {#snippet targetRay()}
    <T.Group rotation={[Math.PI / 2, 0, 0]}>
      <Pointer
        color={toolStore.color}
        radius={handIsPressed ? 0.01 : 0.005}
        length={handIsPressed ? 0.25 : 1}
      />
    </T.Group>
  {/snippet}
</Hand>

{/if}
