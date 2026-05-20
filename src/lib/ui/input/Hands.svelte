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

  let leftPinching     = false;
  let prevBothPinching = false;

  // Origin marker — position + orientation frozen at pinch start
  let showOrigin = $state(false);
  let originX = $state(0), originY = $state(0), originZ = $state(0);
  let originQx = $state(0), originQy = $state(0), originQz = $state(0), originQw = $state(1);
  const _originQuat = new THREE.Quaternion();

  const PALM_CAM_DOT = 0.15;
  const AUX_RANGE    = 0.15;

  // Aux reference frame, established when left pinch starts
  const _auxAxisDir   = new THREE.Vector3();
  const _auxPerpCross = new THREE.Vector3();
  const _auxPerpUp    = new THREE.Vector3();
  const _arrowUp      = new THREE.Vector3(0, 1, 0);
  let   _auxInitDist  = 0;
  let   _prevPerpX    = 0;
  let   _prevPerpY    = 0;

  const _wristPos   = new THREE.Vector3();
  const _rightPos   = new THREE.Vector3();
  const _toLeft     = new THREE.Vector3();

  // Origin marker axis computation
  const _rightTipPos   = new THREE.Vector3();
  const _axisX         = new THREE.Vector3();
  const _axisY         = new THREE.Vector3();
  const _axisZ         = new THREE.Vector3();

  // Frozen reference frame passed to PinchJoystickOverlay
  const _frozenOrigin  = new THREE.Vector3();
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

        if (!prevBothPinching) {
          // 1. Establish the joystick reference frame from right→left wrist axis.
          _auxAxisDir.copy(arrowDir);
          _auxInitDist = len;
          _auxPerpCross.crossVectors(_auxAxisDir, _arrowUp);
          if (_auxPerpCross.length() < 0.01) {
            _auxPerpCross.crossVectors(_auxAxisDir, new THREE.Vector3(0, 0, -1));
          }
          _auxPerpCross.normalize();
          _auxPerpUp.crossVectors(_auxPerpCross, _auxAxisDir).normalize();
          _prevPerpX = _toLeft.dot(_auxPerpCross);
          _prevPerpY = _toLeft.dot(_auxPerpUp);

          // 2. Build OriginMarker orientation:
          //    Z (blue)  → _auxAxisDir  (right wrist → left wrist)
          //    X (red)   → right hand pointer direction, made perpendicular to Z
          //    Y (green) → cross(Z, X)  (perpendicular to the wrist line)
          _axisZ.copy(_auxAxisDir);

          const rightTip = rightIndexTipJoint.current;
          if (rightTip) {
            rightTip.updateWorldMatrix(true, false);
            rightTip.getWorldPosition(_rightTipPos);
            _axisX.subVectors(_rightTipPos, _rightPos).normalize();
          } else {
            // Fallback: use the joystick horizontal perp axis
            _axisX.copy(_auxPerpCross);
          }
          // Project X perpendicular to Z so the basis is orthogonal
          _axisX.addScaledVector(_axisZ, -_axisX.dot(_axisZ));
          if (_axisX.length() < 0.001) {
            _axisX.copy(_auxPerpCross); // degenerate: ray || wrist axis
          } else {
            _axisX.normalize();
          }
          _axisY.crossVectors(_axisZ, _axisX).normalize();

          // 180° around X: negate Y and Z
          _originQuat.setFromRotationMatrix(
            new THREE.Matrix4().makeBasis(_axisX, _axisY.negate(), _axisZ.negate())
          );
          // Place origin marker at the pinch point (index-thumb midpoint), fallback to wrist
          const pinchKnown = getLeftPinchPoint(_pinchPoint);
          const originPos  = pinchKnown ? _pinchPoint : _wristPos;
          originX = originPos.x; originY = originPos.y; originZ = originPos.z;
          originQx = _originQuat.x; originQy = _originQuat.y;
          originQz = _originQuat.z; originQw = _originQuat.w;
          _frozenOrigin.copy(originPos);
          showOrigin = true;
        }

        const axial  = _toLeft.dot(_auxAxisDir) - _auxInitDist; // push/pull: movement along right→left arrow axis
        const perpX  = _toLeft.dot(_auxPerpCross);
        const perpY  = _toLeft.dot(_auxPerpUp);

        const crossZ     = _prevPerpX * perpY - _prevPerpY * perpX;
        const dotVal     = _prevPerpX * perpX + _prevPerpY * perpY;
        const angleDelta = Math.atan2(crossZ, dotVal); // rotation: circular movement of left hand around the arrow axis
        _prevPerpX = perpX;
        _prevPerpY = perpY;

        // TODO: wire up axes
        // axial      → push/pull (y)
        // angleDelta → roll around arrow axis (rotDelta)
        void axial; void angleDelta;
        handAux = { x: 0, y: 0 };
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


  <PinchJoystickOverlay
    active={showOrigin}
    frozenOrigin={_frozenOrigin}
    axisX={_axisX}
    {originX} {originY} {originZ}
    {originQx} {originQy} {originQz} {originQw}
  />

{/if}
