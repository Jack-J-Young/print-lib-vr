<script lang="ts">
  import OriginMarker from "$lib/ui/input/OriginMarker.svelte";
  import StraightArrow from "$lib/models/StraightArrow.svelte";
  import CurvedArrow from "$lib/models/CurvedArrow.svelte";
  import { T, useTask } from "@threlte/core";
  import { useHandJoint } from "@threlte/xr";
  import * as THREE from "three";

  let {
    active,
    frozenOrigin,
    rayOrigin,   // live right-hand targetRay world position
    perpDir,     // frozen unit vector: perp from ray to initial left pinch
    axisX,       // live right-hand targetRay direction
    originX, originY, originZ,
    originQx, originQy, originQz, originQw,
  }: {
    active:       boolean;
    frozenOrigin: THREE.Vector3;
    rayOrigin:    THREE.Vector3;
    perpDir:      THREE.Vector3;
    axisX:        THREE.Vector3;
    originX: number; originY: number; originZ: number;
    originQx: number; originQy: number; originQz: number; originQw: number;
  } = $props();

  const leftIndexTipJoint = useHandJoint('left', 'index-finger-tip');
  const leftThumbTipJoint = useHandJoint('left', 'thumb-tip');

  const _pinchPoint  = new THREE.Vector3();
  const _thumbTipPos = new THREE.Vector3();
  const _dispVec     = new THREE.Vector3();

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

  // Passed by reference to arrow components — mutated each frame
  const _lineFrom  = new THREE.Vector3();
  const _lineTo    = new THREE.Vector3();
  const _arcCenter = new THREE.Vector3();
  const _arcFrom   = new THREE.Vector3();
  const _arcTo     = new THREE.Vector3();

  let lineVisible = $state(false);
  let arcVisible  = $state(false);

  useTask(() => {
    if (!active || !getLeftPinchPoint(_pinchPoint)) {
      lineVisible = false;
      arcVisible  = false;
      return;
    }

    // Decompose current pinch into cylindrical coords relative to right-hand ray.
    //   axialDist = how far along the ray the pinch is from rayOrigin
    //   rCurrent  = perpendicular distance of pinch from the ray
    _dispVec.subVectors(_pinchPoint, rayOrigin);
    const axialDist  = _dispVec.dot(axisX);
    const dispLenSq  = _dispVec.dot(_dispVec);
    const rCurrent   = Math.sqrt(Math.max(0, dispLenSq - axialDist * axialDist));

    // Red arrow: runs along axisX at perpDir * rCurrent offset from the ray.
    //   Starts at rayOrigin offset, ends at the projected tip.
    //   This way the tip and the pinch point are both at radius rCurrent from the ray,
    //   guaranteeing the arc centre derivation below is exact.
    _lineFrom.copy(rayOrigin).addScaledVector(perpDir, rCurrent);
    _lineTo.copy(_lineFrom).addScaledVector(axisX, axialDist);
    lineVisible = true;

    // Green arc: from lineTo to pinchPoint, centred on ray at the same axial depth.
    //   Both endpoints are at perpendicular distance rCurrent from the centre,
    //   so this is a proper circular arc — no equidistant formula needed.
    if (rCurrent > 0.005) {
      _arcCenter.copy(rayOrigin).addScaledVector(axisX, axialDist);
      _arcFrom.copy(_lineTo);
      _arcTo.copy(_pinchPoint);
      arcVisible = true;
    } else {
      arcVisible = false;
    }
  });
</script>

{#if active}
  <!-- <T.Group position={[originX, originY, originZ]} quaternion={[originQx, originQy, originQz, originQw]}>
    <OriginMarker />
  </T.Group> -->
  <StraightArrow from={rayOrigin} to={_lineFrom} color={0x000000} visible={lineVisible} />
  <StraightArrow from={_lineFrom} to={_lineTo} color={0xff3333} visible={lineVisible} />
  <CurvedArrow center={_arcCenter} from={_arcFrom} to={_arcTo} color={0x33ff33} visible={arcVisible} />
{/if}
