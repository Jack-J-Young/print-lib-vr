<script lang="ts">
  import { onMount } from "svelte";
  import { T } from "@threlte/core";
  import * as THREE from "three";
  import { Callback, CallbackType, interactStore } from "$lib/stores/interactStore";
  import { thumbstick } from "$lib/stores/thumbstickStore";
  import type { HoldEvent } from "$lib/HoldEvent";

  let { children, scale = 1 }: { children: any, scale?: number | [x: number, y: number, z: number] } = $props();

  let ref: THREE.Group = $state(new THREE.Group());
  let event: HoldEvent | undefined = $state();

  const PUSH_SPEED = 3.0;   // metres per second at full stick deflection
  const ROT_SPEED  = 2.5;
  const DEADZONE   = 0.12;

  // Pre-allocated temporaries.
  const _ctrlPos  = new THREE.Vector3();
  const _objPos   = new THREE.Vector3();
  const _toObj    = new THREE.Vector3();
  const _rayDir   = new THREE.Vector3();   // controller ray in world space
  const _newLocal = new THREE.Vector3();
  const _ctrlInv  = new THREE.Matrix4();
  const _objMat   = new THREE.Matrix4();
  const _rotExt   = new THREE.Matrix4();   // scratch for extractRotation
  const _T        = new THREE.Matrix4();
  const _Tinv     = new THREE.Matrix4();
  const _R        = new THREE.Matrix4();
  const _rotAbout = new THREE.Matrix4();
  const _newWorld = new THREE.Matrix4();
  const _newOff   = new THREE.Matrix4();

  function tick(delta?: number, matrix?: THREE.Matrix4): void {
    if (!event) return;
    if (delta) event.delta += delta;

    const dt = delta ?? 0.016;
    const { x: sx, y: sy } = thumbstick;

    if ((Math.abs(sy) > DEADZONE || Math.abs(sx) > DEADZONE) && matrix) {

      // ── Shared world-space state ─────────────────────────────────────────────
      _ctrlPos.setFromMatrixPosition(matrix);
      _ctrlInv.copy(matrix).invert();
      _objMat.multiplyMatrices(matrix, event.offset);
      _objPos.setFromMatrixPosition(_objMat);
      _toObj.subVectors(_objPos, _ctrlPos);

      // Controller ray direction in world space — same axis used for both operations.
      _rayDir.set(0, -1, 0).applyMatrix4(_rotExt.extractRotation(matrix));

      // ── Push / pull along the ray ────────────────────────────────────────────
      // Push / pull at constant speed along the ray — no depth scaling.
      // sy > 0 (stick down) = pull toward controller, sy < 0 = push away.
      if (Math.abs(sy) > DEADZONE) {
        const moveDelta = -sy * PUSH_SPEED * dt;

        _newLocal.copy(_objPos).addScaledVector(_rayDir, moveDelta);
        _newLocal.applyMatrix4(_ctrlInv);          // world → controller-local
        event.offset.setPosition(_newLocal);

        // Recompute so the rotation pivot below is up-to-date.
        _objMat.multiplyMatrices(matrix, event.offset);
        _objPos.setFromMatrixPosition(_objMat);
      }

      // ── Rotate: spin around the ray axis, pivoting at the cursor point ─────────
      // The pivot is the point on the ray at the same depth as the object —
      // i.e. where the controller ray actually touches/points at the object.
      //   cursorPos = ctrlPos + dot(toObj, rayDir) * rayDir
      //   T(cursor) × R(rayDir, angle) × T(-cursor) × currentObjWorld
      if (Math.abs(sx) > DEADZONE) {
        const angle = sx * ROT_SPEED * dt;

        // Recompute toObj in case push/pull moved the object this frame.
        _toObj.subVectors(_objPos, _ctrlPos);
        const depth = _toObj.dot(_rayDir);
        // _newLocal reused as cursorPos (push/pull is finished by now).
        _newLocal.copy(_ctrlPos).addScaledVector(_rayDir, depth);

        _T   .makeTranslation( _newLocal.x,  _newLocal.y,  _newLocal.z);
        _Tinv.makeTranslation(-_newLocal.x, -_newLocal.y, -_newLocal.z);
        _R   .makeRotationAxis(_rayDir, angle);

        _rotAbout.copy(_T).multiply(_R).multiply(_Tinv);
        _newWorld.copy(_rotAbout).multiply(_objMat);
        _newOff  .copy(_ctrlInv).multiply(_newWorld);
        event.offset.copy(_newOff);
      }
    }

    if (!matrix) return;
    if (!ref.parent) return;

    _newWorld.multiplyMatrices(matrix, event.offset);
    _newOff.copy(ref.parent.matrixWorld).invert().multiply(_newWorld);

    ref.matrixAutoUpdate = false;
    ref.matrix.copy(_newOff);
    ref.matrixWorldNeedsUpdate = true;
  }

  function start(delta?: number, matrix?: THREE.Matrix4): void {
    if (!matrix) return;

    let callbacks = $interactStore.callbacks;
    let map = callbacks.get(ref.id);
    if (!map) return;

    map.set(Callback.packKey(CallbackType.Tick, 2), tick);
    callbacks.set(ref.id, map);
    $interactStore.callbacks = callbacks;

    ref.updateWorldMatrix(true, false);
    const transform = new THREE.Matrix4().copy(matrix).invert().multiply(ref.matrixWorld);
    event = { offset: transform, delta: 0 };
  }

  function end(delta?: number, matrix?: THREE.Matrix4): void {
    if (!event) return;
    if (delta) event.delta += delta;
    if (!matrix) return;
    if (!ref.parent) return;

    const newWorld = new THREE.Matrix4().multiplyMatrices(matrix, event.offset);
    const newLocal = new THREE.Matrix4().copy(ref.parent.matrixWorld).invert().multiply(newWorld);

    ref.matrixAutoUpdate = false;
    ref.matrix.copy(newLocal);
    ref.matrixWorldNeedsUpdate = true;
    event = undefined;
  }

  onMount(() => {
    if (!ref) return;
    $interactStore.hitboxIds?.push(ref.id);
    let callbacks = $interactStore.callbacks;
    let map: Map<bigint, (delta?: number, matrix?: THREE.Matrix4) => void> = new Map([
      [Callback.packKey(CallbackType.Start, 2), start],
      [Callback.packKey(CallbackType.End, 2), end],
    ]);
    callbacks.set(ref.id, map);
    $interactStore.callbacks = callbacks;
  });
</script>

<T.Group bind:ref scale={scale}>
  {@render children()}
</T.Group>
