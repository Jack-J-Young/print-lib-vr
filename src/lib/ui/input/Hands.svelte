<script lang="ts">
  import Pointer from "$lib/models/Pointer.svelte";
  import PinchJoystickOverlay from "$lib/ui/input/PinchJoystickOverlay.svelte";
  import { T, useTask, useThrelte } from "@threlte/core";
  import { Hand, useHand, useHandJoint, useXR } from "@threlte/xr";
  import { toolStore } from "$lib/ui/input/stores/toolStore.svelte";
  import type { RaycastEngine } from "$lib/ui/input/RaycastEngine.svelte";
  import type { AuxInput } from "$lib/ui/input/tools/Tool";
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

  // Hand models for recoloring.
  const leftHandStore  = useHand('left');
  const rightHandStore = useHand('right');

  // XRJointSpace objects updated by Three.js WebXR manager each frame.
  const leftWristJoint       = useHandJoint('left',  'wrist');
  const leftIndexTipJoint    = useHandJoint('left',  'index-finger-tip');
  const leftThumbTipJoint    = useHandJoint('left',  'thumb-tip');
  const rightWristJoint      = useHandJoint('right', 'wrist');
  const rightIndexTipJoint   = useHandJoint('right', 'index-finger-tip');

  function recolorModel(model: THREE.Object3D | null | undefined, color: THREE.Color) {
    if (!model) return;
    model.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (!obj.userData.handTinted) {
        obj.material = Array.isArray(obj.material)
          ? obj.material.map((m: THREE.Material) => m.clone())
          : (obj.material as THREE.Material).clone();
        obj.userData.handTinted = true;
      }
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(m => { if ('color' in m) (m as THREE.MeshStandardMaterial).color.set(color); });
    });
  }

  $effect(() => {
    const color = new THREE.Color(toolStore.color);
    recolorModel(leftHandStore.current?.model, color);
    recolorModel(rightHandStore.current?.model, color);
  });

  let leftPinching     = $state(false);
  let prevBothPinching = false;

  // Origin marker — position + orientation frozen at pinch start
  let showOrigin = $state(false);
  let originX = $state(0), originY = $state(0), originZ = $state(0);
  let originQx = $state(0), originQy = $state(0), originQz = $state(0), originQw = $state(1);
  const _originQuat = new THREE.Quaternion();

  const PALM_CAM_DOT = 0.15;

  // Kept for origin marker Z axis and no-targetRay fallback
  const _auxAxisDir   = new THREE.Vector3();
  const _auxPerpCross = new THREE.Vector3();

  // Right-hand ray frame joystick state
  const _pinchDisp  = new THREE.Vector3(); // reusable temp
  const _perpAxisY  = new THREE.Vector3(); // axisX × perpDir each frame
  let   _axialPrev  = 0;    // previous frame axial projection for moveDelta
  let   _prevPerpXR = 0;    // previous frame perp coords for rotDelta
  let   _prevPerpYR = 0;

  const _wristPos   = new THREE.Vector3();
  const _rightPos   = new THREE.Vector3();
  const _toLeft     = new THREE.Vector3();

  // Origin marker axis computation
  const _axisX         = new THREE.Vector3();
  const _axisY         = new THREE.Vector3();
  const _axisZ         = new THREE.Vector3();
  const _rotMat        = new THREE.Matrix4();

  // Frozen reference frame passed to PinchJoystickOverlay
  const _frozenOrigin  = new THREE.Vector3();
  // Live right-hand targetRay origin — updated every frame, passed by reference
  const _rayOrigin     = new THREE.Vector3();
  // perpDir in right hand's local frame (frozen at pinch start, re-rotated each frame)
  const _perpDirLocal  = new THREE.Vector3();
  const _perpDir       = new THREE.Vector3(); // world-space, updated each frame
  const _invRot        = new THREE.Matrix4(); // scratch for inverse rotation
  const _pinchPoint    = new THREE.Vector3();
  const _thumbTipPos   = new THREE.Vector3();

  // Palm-facing check
  const _palmNormal = new THREE.Vector3();
  const _palmRotMat = new THREE.Matrix4();
  const _camPos     = new THREE.Vector3();
  const _toCam      = new THREE.Vector3();

  function getLeftPinchPoint(out: THREE.Vector3): boolean {
    const indexTip = leftIndexTipJoint.current;
    const thumbTip = leftThumbTipJoint.current;
    if (!indexTip || !thumbTip) return false;
    indexTip.updateWorldMatrix(true, false);
    thumbTip.updateWorldMatrix(true, false);
    indexTip.getWorldPosition(out);
    thumbTip.getWorldPosition(_thumbTipPos);
    out.addVectors(out, _thumbTipPos).multiplyScalar(0.5);
    return true;
  }

  function isLeftPalmFacingCamera(): boolean {
    const lw = leftWristJoint.current;
    if (!lw) return false;
    lw.updateWorldMatrix(true, false);
    _palmRotMat.extractRotation(lw.matrixWorld);
    _palmNormal.set(0, -1, 0).applyMatrix4(_palmRotMat);
    lw.getWorldPosition(_wristPos);
    camera.current.getWorldPosition(_camPos);
    _toCam.subVectors(_camPos, _wristPos).normalize();
    return _palmNormal.dot(_toCam) > PALM_CAM_DOT;
  }

  useTask(() => {
    if (!$isHandTracking) return;

    const wrist = leftWristJoint.current;
    if (!wrist) return;
    wrist.updateWorldMatrix(true, false);
    wrist.getWorldPosition(_wristPos);

    const rightWrist  = rightWristJoint.current;
    const bothPinching = leftPinching;

    if (bothPinching && rightWrist) {
      rightWrist.updateWorldMatrix(true, false);
      rightWrist.getWorldPosition(_rightPos);

      _toLeft.subVectors(_wristPos, _rightPos);
      const len = _toLeft.length();

      if (len > 0.001) {
        const arrowDir = _toLeft.clone().divideScalar(len);

        // Get right hand targetRay every frame (needed for both init and live axis).
        const rightHand = rightHandStore.current;
        const rightRay  = rightHand?.targetRay;
        if (rightRay) {
          rightRay.updateWorldMatrix(true, false);
          _rotMat.extractRotation(rightRay.matrixWorld);
          _axisX.set(0, 0, -1).applyMatrix4(_rotMat);                // pointer direction
          _rayOrigin.setFromMatrixPosition(rightRay.matrixWorld);     // pointer origin
          _perpDir.copy(_perpDirLocal).applyMatrix4(_rotMat);         // rotate frozen offset with hand
        } else {
          _axisX.copy(_auxPerpCross);
          rightWrist.getWorldPosition(_rayOrigin);
          // _perpDir unchanged when no targetRay
        }

        if (!prevBothPinching) {
          // 1. Freeze Z axis (right→left wrist) for origin marker orientation.
          _auxAxisDir.copy(arrowDir);
          _axisZ.copy(_auxAxisDir);

          // 2. Freeze the perpendicular direction from the right ray to the initial pinch.
          const pinchKnown = getLeftPinchPoint(_pinchPoint);
          const pinchPos   = pinchKnown ? _pinchPoint : _wristPos;
          _frozenOrigin.copy(pinchPos);
          // perpDir = normalize( (pinchPos - rayOrigin) projected perp to axisX )
          _perpDir.subVectors(pinchPos, _rayOrigin);
          _perpDir.addScaledVector(_axisX, -_perpDir.dot(_axisX));
          const perpLen = _perpDir.length();
          if (perpLen > 0.001) {
            _perpDir.divideScalar(perpLen);
          } else {
            // Pinch is on the ray — pick an arbitrary perpendicular
            _perpDir.set(Math.abs(_axisX.x) < 0.9 ? 1 : 0, Math.abs(_axisX.x) >= 0.9 ? 1 : 0, 0);
            _perpDir.addScaledVector(_axisX, -_perpDir.dot(_axisX)).normalize();
          }
          // Store perpDir in the right hand's local frame so it rotates with the hand.
          _invRot.copy(_rotMat).transpose();
          _perpDirLocal.copy(_perpDir).applyMatrix4(_invRot);

          // 3. Initialize ray-frame joystick reference values.
          _pinchDisp.subVectors(pinchPos, _rayOrigin);
          _axialPrev = _pinchDisp.dot(_axisX);
          _pinchDisp.addScaledVector(_axisX, -_axialPrev);
          _perpAxisY.crossVectors(_axisX, _perpDir);
          _prevPerpXR = _pinchDisp.dot(_perpDir);
          _prevPerpYR = _pinchDisp.dot(_perpAxisY);

          showOrigin = true;
        }

        _axisY.crossVectors(_axisZ, _axisX).normalize();

        // Update OriginMarker orientation each frame (180° around X: negate Y and Z)
        _originQuat.setFromRotationMatrix(
          new THREE.Matrix4().makeBasis(_axisX, _axisY.negate(), _axisZ.negate())
        );
        originX = _frozenOrigin.x; originY = _frozenOrigin.y; originZ = _frozenOrigin.z;
        originQx = _originQuat.x; originQy = _originQuat.y;
        originQz = _originQuat.z; originQw = _originQuat.w;

        // Joystick: decompose current left pinch into ray-frame cylindrical coords.
        const pinchKnownLive = getLeftPinchPoint(_pinchPoint);
        if (pinchKnownLive) {
          _pinchDisp.subVectors(_pinchPoint, _rayOrigin);
          const axialCurrent = _pinchDisp.dot(_axisX);
          _pinchDisp.addScaledVector(_axisX, -axialCurrent); // pure perp component
          _perpAxisY.crossVectors(_axisX, _perpDir);
          const perpXR  = _pinchDisp.dot(_perpDir);
          const perpYR  = _pinchDisp.dot(_perpAxisY);
          const crossZ  = _prevPerpXR * perpYR - _prevPerpYR * perpXR;
          const dotValR = _prevPerpXR * perpXR + _prevPerpYR * perpYR;
          const rotDelta  = Math.atan2(crossZ, dotValR);
          const moveDelta = axialCurrent - _axialPrev;
          _prevPerpXR = perpXR;
          _prevPerpYR = perpYR;
          _axialPrev  = axialCurrent;
          handAux = { x: 0, y: 0, rotDelta, moveDelta };
        } else {
          handAux = { x: 0, y: 0 };
        }
      }
    } else {
      handAux = { x: 0, y: 0 };
      showOrigin = false;
    }

    prevBothPinching = bothPinching;
  });
</script>

{#if $isHandTracking}

<Hand left
  onpinchstart={() => {
    if (isLeftPalmFacingCamera()) {
      toolStore.cycleNext();
    } else {
      leftPinching = true;
    }
  }}
  onpinchend={() => { leftPinching = false; }}
>
  {#snippet targetRay()}
    <T.Group rotation={[Math.PI / 2, 0, 0]}>
      <Pointer
        color={toolStore.color}
        radius={leftPinching ? 0.01 : 0.005}
        length={leftPinching ? 0.25 : 1}
      />
    </T.Group>
  {/snippet}
</Hand>

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


{#if handIsPressed && leftPinching}
  <PinchJoystickOverlay
    active={showOrigin}
    frozenOrigin={_frozenOrigin}
    rayOrigin={_rayOrigin}
    perpDir={_perpDir}
    axisX={_axisX}
    {originX} {originY} {originZ}
    {originQx} {originQy} {originQz} {originQw}
  />
{/if}
{/if}