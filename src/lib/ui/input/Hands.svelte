<script lang="ts">
  import Pointer from "$lib/models/Pointer.svelte";
  import PinchJoystickOverlay from "$lib/ui/input/PinchJoystickOverlay.svelte";
  import { T, useTask, useThrelte } from "@threlte/core";
  import { Hand, useHand, useHandJoint, useXR } from "@threlte/xr";
  import { toolStore } from "$lib/ui/input/stores/toolStore.svelte";
  import { worldStore } from "$lib/stores/worldStore.svelte";
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

  const rightHandStore = useHand('right');

  const leftWristJoint     = useHandJoint('left',  'wrist');
  const leftIndexTipJoint  = useHandJoint('left',  'index-finger-tip');
  const leftThumbTipJoint  = useHandJoint('left',  'thumb-tip');
  const leftPinkyTipJoint  = useHandJoint('left',  'pinky-finger-tip');
  const rightWristJoint    = useHandJoint('right', 'wrist');

  const MAX_SWITCH_RADIUS = 0.025;
  const PALM_ORB_RADIUS   = MAX_SWITCH_RADIUS * 2 / 6;
  const PINCH_MAX_DIST    = 0.07;

  let palmOrbRef: THREE.Mesh | undefined;
  let palmOrbVisible   = $state(false);
  let _palmOrbPinched  = false; // debounce: recenter fires once per pinch
  const _pinkyTipPos   = new THREE.Vector3();
  const SWITCH_PHASE_DUR  = 0.09; // seconds per shrink/grow phase

  // Refs for per-frame position/scale updates — avoids reactive overhead.
  let switchBackRef:  THREE.Mesh | undefined;
  let switchFrontRef: THREE.Mesh | undefined;

  let switchBackVisible  = $state(false);
  let switchFrontVisible = $state(false);
  let switchBackColor    = $state(toolStore.nextColor);
  let switchFrontColor   = $state(toolStore.color);

  // Non-reactive animation state.
  let _switchPhase       = 0;   // 0=idle, 1=shrinking, 2=growing
  let _switchProgress    = 0;   // 0..1 within current phase
  let _shrinkStartFactor = 1;   // pinchFactor captured at pinch start
  let _lastPinchFactor   = 1;   // updated each idle frame so pinchstart can read it
  let _waitForUnpinch    = false; // hold front at full size until fingers open after animation

  // Ray color fade.
  const RAY_FADE_DUR    = 0.15;
  let rayColor          = $state(toolStore.color);
  let _rayFadeActive    = false;
  let _rayFadeProgress  = 0;
  const _rayFromColor   = new THREE.Color();
  const _rayToColor     = new THREE.Color();
  const _rayLerpColor   = new THREE.Color();

  let leftPinching    = $state(false);
  let prevBothPinching = false;

  let showOrigin = $state(false);
  let originX = $state(0), originY = $state(0), originZ = $state(0);
  let originQx = $state(0), originQy = $state(0), originQz = $state(0), originQw = $state(1);
  const _originQuat = new THREE.Quaternion();

  const PALM_CAM_DOT = 0.85;
  const GRAD_SPEED   = 6.0;
  let _tipAmount = 0;

  const _indexTipPos  = new THREE.Vector3();
  const _thumbTipPos2 = new THREE.Vector3();
  const _midpoint     = new THREE.Vector3();

  // Right-hand ray frame joystick state
  const _pinchDisp = new THREE.Vector3();
  const _perpAxisY = new THREE.Vector3();
  let _axialPrev   = 0;
  let _prevPerpXR  = 0;
  let _prevPerpYR  = 0;

  const _wristPos = new THREE.Vector3();
  const _rightPos = new THREE.Vector3();
  const _toLeft   = new THREE.Vector3();

  const _axisX   = new THREE.Vector3();
  const _axisY   = new THREE.Vector3();
  const _axisZ   = new THREE.Vector3();
  const _rotMat  = new THREE.Matrix4();

  const _frozenOrigin = new THREE.Vector3();
  const _rayOrigin    = new THREE.Vector3();
  const _perpDirLocal = new THREE.Vector3();
  const _perpDir      = new THREE.Vector3();
  const _invRot       = new THREE.Matrix4();
  const _pinchPoint   = new THREE.Vector3();
  const _thumbTipPos  = new THREE.Vector3();

  // Kept for no-targetRay fallback
  const _auxAxisDir   = new THREE.Vector3();
  const _auxPerpCross = new THREE.Vector3();

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

  useTask((delta) => {
    if (!$isHandTracking) return;

    const wrist = leftWristJoint.current;
    if (!wrist) return;
    wrist.updateWorldMatrix(true, false);
    wrist.getWorldPosition(_wristPos);

    // Ray color fade.
    if (_rayFadeActive) {
      _rayFadeProgress = Math.min(1, _rayFadeProgress + delta / RAY_FADE_DUR);
      _rayLerpColor.lerpColors(_rayFromColor, _rayToColor, _rayFadeProgress);
      rayColor = _rayLerpColor.getHex();
      if (_rayFadeProgress >= 1) {
        _rayFadeActive = false;
        rayColor = _rayToColor.getHex();
      }
    } else {
      rayColor = toolStore.color;
    }

    // Hold _tipAmount at 1 during the switch animation so spheres don't fade.
    if (_switchPhase !== 0) {
      _tipAmount = 1;
    } else {
      const palmNowFacing = isLeftPalmFacingCamera();
      _tipAmount += ((palmNowFacing ? 1 : 0) - _tipAmount) * Math.min(1, GRAD_SPEED * delta);
    }

    const indexTipJ = leftIndexTipJoint.current;
    const thumbTipJ = leftThumbTipJoint.current;
    if (indexTipJ && thumbTipJ && _tipAmount > 0.001) {
      indexTipJ.updateWorldMatrix(true, false);
      thumbTipJ.updateWorldMatrix(true, false);
      indexTipJ.getWorldPosition(_indexTipPos);
      thumbTipJ.getWorldPosition(_thumbTipPos2);
      _midpoint.addVectors(_indexTipPos, _thumbTipPos2).multiplyScalar(0.5);
      if (switchBackRef)  switchBackRef.position.copy(_midpoint);
      if (switchFrontRef) switchFrontRef.position.copy(_midpoint);
      switchBackRef?.scale.setScalar(MAX_SWITCH_RADIUS * _tipAmount);

      const pinchDist   = _indexTipPos.distanceTo(_thumbTipPos2);
      const pinchFactor = Math.min(pinchDist / PINCH_MAX_DIST, 1);

      if (_switchPhase === 0) {
        // Idle: front follows finger distance (or holds full until unpinched after animation).
        if (_waitForUnpinch) {
          if (pinchFactor > 0.9) _waitForUnpinch = false;
          switchFrontRef?.scale.setScalar(MAX_SWITCH_RADIUS * _tipAmount);
        } else {
          _lastPinchFactor = pinchFactor;
          switchFrontRef?.scale.setScalar(MAX_SWITCH_RADIUS * _tipAmount * pinchFactor);
        }
        switchBackColor    = toolStore.nextColor;
        switchFrontColor   = toolStore.color;
        switchBackVisible  = true;
        switchFrontVisible = true;
      } else if (_switchPhase === 1) {
        // Shrinking: animate from captured start factor down to 0, visible.
        _switchProgress = Math.min(1, _switchProgress + delta / SWITCH_PHASE_DUR);
        switchFrontRef?.scale.setScalar(MAX_SWITCH_RADIUS * _tipAmount * _shrinkStartFactor * (1 - _switchProgress));
        switchBackVisible  = true;
        switchFrontVisible = true;
        if (_switchProgress >= 1) {
          _rayFromColor.set(toolStore.color);
          toolStore.cycleNext();
          _rayToColor.set(toolStore.color);
          _rayFadeActive   = true;
          _rayFadeProgress = 0;
          switchFrontColor   = toolStore.color;
          switchFrontVisible = false;
          _switchPhase    = 2;
          _switchProgress = 0;
        }
      } else {
        // Growing: front animates from 0 to full size, invisible until done.
        _switchProgress = Math.min(1, _switchProgress + delta / SWITCH_PHASE_DUR);
        switchFrontRef?.scale.setScalar(MAX_SWITCH_RADIUS * _tipAmount * _switchProgress);
        switchBackVisible  = true;
        switchFrontVisible = false;
        if (_switchProgress >= 1) {
          switchFrontVisible = true;
          switchBackColor    = toolStore.nextColor;
          _switchPhase       = 0;
          _switchProgress    = 0;
          _waitForUnpinch    = true;
        }
      }
    } else {
      switchBackVisible  = false;
      switchFrontVisible = false;
    }

    // Palm orb: between thumb and pinky, always visible when joints available.
    const thumbJ  = leftThumbTipJoint.current;
    const pinkyJ  = leftPinkyTipJoint.current;
    if (thumbJ && pinkyJ && palmOrbRef && _tipAmount > 0.001) {
      thumbJ.updateWorldMatrix(true, false);
      pinkyJ.updateWorldMatrix(true, false);
      thumbJ.getWorldPosition(_thumbTipPos2);
      pinkyJ.getWorldPosition(_pinkyTipPos);
      palmOrbRef.position.addVectors(_thumbTipPos2, _pinkyTipPos).multiplyScalar(0.5);
      const pinkyPinchFactor = Math.min(_thumbTipPos2.distanceTo(_pinkyTipPos) / PINCH_MAX_DIST, 1);
      palmOrbRef.scale.setScalar(PALM_ORB_RADIUS * pinkyPinchFactor * _tipAmount);
      if (pinkyPinchFactor < 0.08 && !_palmOrbPinched) {
        _palmOrbPinched = true;
        worldStore.recenter();
      } else if (pinkyPinchFactor > 0.5) {
        _palmOrbPinched = false;
      }
      palmOrbVisible = true;
    } else {
      palmOrbVisible = false;
    }

    // Joystick: both pinches active.
    const rightWrist   = rightWristJoint.current;
    const bothPinching = leftPinching;

    if (bothPinching && rightWrist) {
      rightWrist.updateWorldMatrix(true, false);
      rightWrist.getWorldPosition(_rightPos);
      _toLeft.subVectors(_wristPos, _rightPos);
      const len = _toLeft.length();

      if (len > 0.001) {
        const arrowDir = _toLeft.clone().divideScalar(len);

        const rightHand = rightHandStore.current;
        const rightRay  = rightHand?.targetRay;
        if (rightRay) {
          rightRay.updateWorldMatrix(true, false);
          _rotMat.extractRotation(rightRay.matrixWorld);
          _axisX.set(0, 0, -1).applyMatrix4(_rotMat);
          _rayOrigin.setFromMatrixPosition(rightRay.matrixWorld);
          _perpDir.copy(_perpDirLocal).applyMatrix4(_rotMat);
        } else {
          _axisX.copy(_auxPerpCross);
          rightWrist.getWorldPosition(_rayOrigin);
        }

        if (!prevBothPinching) {
          _auxAxisDir.copy(arrowDir);
          _axisZ.copy(_auxAxisDir);

          const pinchKnown = getLeftPinchPoint(_pinchPoint);
          const pinchPos   = pinchKnown ? _pinchPoint : _wristPos;
          _frozenOrigin.copy(pinchPos);

          _perpDir.subVectors(pinchPos, _rayOrigin);
          _perpDir.addScaledVector(_axisX, -_perpDir.dot(_axisX));
          const perpLen = _perpDir.length();
          if (perpLen > 0.001) {
            _perpDir.divideScalar(perpLen);
          } else {
            _perpDir.set(Math.abs(_axisX.x) < 0.9 ? 1 : 0, Math.abs(_axisX.x) >= 0.9 ? 1 : 0, 0);
            _perpDir.addScaledVector(_axisX, -_perpDir.dot(_axisX)).normalize();
          }
          _invRot.copy(_rotMat).transpose();
          _perpDirLocal.copy(_perpDir).applyMatrix4(_invRot);

          _pinchDisp.subVectors(pinchPos, _rayOrigin);
          _axialPrev = _pinchDisp.dot(_axisX);
          _pinchDisp.addScaledVector(_axisX, -_axialPrev);
          _perpAxisY.crossVectors(_axisX, _perpDir);
          _prevPerpXR = _pinchDisp.dot(_perpDir);
          _prevPerpYR = _pinchDisp.dot(_perpAxisY);

          showOrigin = true;
        }

        _axisY.crossVectors(_axisZ, _axisX).normalize();
        _originQuat.setFromRotationMatrix(
          new THREE.Matrix4().makeBasis(_axisX, _axisY.negate(), _axisZ.negate())
        );
        originX = _frozenOrigin.x; originY = _frozenOrigin.y; originZ = _frozenOrigin.z;
        originQx = _originQuat.x;  originQy = _originQuat.y;
        originQz = _originQuat.z;  originQw = _originQuat.w;

        const pinchKnownLive = getLeftPinchPoint(_pinchPoint);
        if (pinchKnownLive) {
          _pinchDisp.subVectors(_pinchPoint, _rayOrigin);
          const axialCurrent = _pinchDisp.dot(_axisX);
          _pinchDisp.addScaledVector(_axisX, -axialCurrent);
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
      handAux    = { x: 0, y: 0 };
      showOrigin = false;
    }

    prevBothPinching = bothPinching;
  });
</script>

{#if $isHandTracking}

<!-- Mode-switch spheres: always in scene so refs are stable; visibility toggled via prop. -->
<T.Mesh bind:ref={palmOrbRef} visible={palmOrbVisible}>
  <T.SphereGeometry args={[1, 12, 8]} />
  <T.MeshBasicMaterial color={0xffffff}/>
</T.Mesh>

<T.Mesh bind:ref={switchBackRef} visible={switchBackVisible} renderOrder={-2}>
  <T.SphereGeometry args={[1, 16, 12]} />
  <T.MeshBasicMaterial color={switchBackColor} />
</T.Mesh>
<T.Mesh bind:ref={switchFrontRef} visible={switchFrontVisible}>
  <T.SphereGeometry args={[1, 16, 12]} />
  <T.MeshBasicMaterial color={switchFrontColor}/>
</T.Mesh>

<Hand left
  onpinchstart={() => {
    if (isLeftPalmFacingCamera()) {
      _shrinkStartFactor = _lastPinchFactor;
      _switchPhase       = 1;
      _switchProgress    = 0;
      _waitForUnpinch    = false;
    } else {
      leftPinching = true;
    }
  }}
  onpinchend={() => { leftPinching = false; }}
>
  {#snippet targetRay()}
    <T.Group rotation={[Math.PI / 2, 0, 0]}>
      <Pointer
        color={rayColor}
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
  {#snippet targetRay()}
    <T.Group rotation={[Math.PI / 2, 0, 0]}>
      <Pointer
        color={rayColor}
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
