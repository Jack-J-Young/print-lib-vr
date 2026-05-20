<script lang="ts">
  import OriginMarker from "$lib/ui/input/OriginMarker.svelte";
  import { T, useTask, useThrelte } from "@threlte/core";
  import { useHandJoint } from "@threlte/xr";
  import * as THREE from "three";

  let {
    active,
    frozenOrigin,
    axisX,
    originX,
    originY,
    originZ,
    originQx,
    originQy,
    originQz,
    originQw,
  }: {
    active: boolean;
    frozenOrigin: THREE.Vector3;
    axisX: THREE.Vector3;
    originX: number;
    originY: number;
    originZ: number;
    originQx: number;
    originQy: number;
    originQz: number;
    originQw: number;
  } = $props();

  const { scene } = useThrelte();

  const leftIndexTipJoint  = useHandJoint('left',  'index-finger-tip');
  const leftThumbTipJoint  = useHandJoint('left',  'thumb-tip');
  const rightWristJoint    = useHandJoint('right', 'wrist');
  const rightIndexTipJoint = useHandJoint('right', 'index-finger-tip');

  // Pre-allocated temporaries
  const _pinchPoint  = new THREE.Vector3();
  const _thumbTipPos = new THREE.Vector3();
  const _rightPos    = new THREE.Vector3();
  const _rightTipPos = new THREE.Vector3();
  const _rightRayDir = new THREE.Vector3();
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

  // Red line: frozen origin → projected tip on red axis
  const _linePositions = new Float32Array(6);
  const _lineGeo       = new THREE.BufferGeometry();
  _lineGeo.setAttribute('position', new THREE.BufferAttribute(_linePositions, 3));
  const _lineMat       = new THREE.LineBasicMaterial({ color: 0xff3333 });
  const _lineObj       = new THREE.Line(_lineGeo, _lineMat);
  _lineObj.visible     = false;

  // Green arc: true circular arc, center on the live right-hand ray
  const N_ARC_SEGS    = 24;
  const _arcPositions = new Float32Array((N_ARC_SEGS + 1) * 3);
  const _arcGeo       = new THREE.BufferGeometry();
  _arcGeo.setAttribute('position', new THREE.BufferAttribute(_arcPositions, 3));
  const _arcMat       = new THREE.LineBasicMaterial({ color: 0x33ff33 });
  const _arcObj       = new THREE.Line(_arcGeo, _arcMat);
  _arcObj.visible     = false;

  $effect(() => {
    scene.add(_lineObj);
    scene.add(_arcObj);
    return () => { scene.remove(_lineObj); scene.remove(_arcObj); };
  });

  useTask(() => {
    if (!active) {
      _lineObj.visible = false;
      _arcObj.visible  = false;
      return;
    }

    const rightWrist = rightWristJoint.current;
    if (!rightWrist || !getLeftPinchPoint(_pinchPoint)) {
      _lineObj.visible = false;
      _arcObj.visible  = false;
      return;
    }
    rightWrist.updateWorldMatrix(true, false);
    rightWrist.getWorldPosition(_rightPos);

    _dispVec.subVectors(_pinchPoint, frozenOrigin);
    const proj = _dispVec.dot(axisX);

    // Red line: frozen origin → tip projected onto red axis
    const tipX = frozenOrigin.x + axisX.x * proj;
    const tipY = frozenOrigin.y + axisX.y * proj;
    const tipZ = frozenOrigin.z + axisX.z * proj;
    _linePositions[0] = frozenOrigin.x; _linePositions[1] = frozenOrigin.y; _linePositions[2] = frozenOrigin.z;
    _linePositions[3] = tipX;           _linePositions[4] = tipY;           _linePositions[5] = tipZ;
    _lineGeo.attributes.position.needsUpdate = true;
    _lineObj.visible = true;

    // Green arc: circular arc whose center C lies on the live right-hand ray and is
    // equidistant from A (red line tip) and B (current pinch).
    // Solve |C-A|² = |C-B|² with C = rightPos + t·rayDir.
    const rightTipLive = rightIndexTipJoint.current;
    if (rightTipLive) {
      rightTipLive.updateWorldMatrix(true, false);
      rightTipLive.getWorldPosition(_rightTipPos);
      _rightRayDir.subVectors(_rightTipPos, _rightPos).normalize();
    } else {
      _rightRayDir.copy(axisX);
    }

    const dAx = _rightPos.x - tipX,           dAy = _rightPos.y - tipY,           dAz = _rightPos.z - tipZ;
    const dBx = _rightPos.x - _pinchPoint.x,  dBy = _rightPos.y - _pinchPoint.y,  dBz = _rightPos.z - _pinchPoint.z;
    const numAB = (dAx*dAx + dAy*dAy + dAz*dAz) - (dBx*dBx + dBy*dBy + dBz*dBz);
    const ABx = tipX - _pinchPoint.x, ABy = tipY - _pinchPoint.y, ABz = tipZ - _pinchPoint.z;
    const denom = 2 * (ABx * _rightRayDir.x + ABy * _rightRayDir.y + ABz * _rightRayDir.z);

    if (Math.abs(denom) > 0.0001) {
      const tC = numAB / denom;
      const Cx = _rightPos.x + _rightRayDir.x * tC;
      const Cy = _rightPos.y + _rightRayDir.y * tC;
      const Cz = _rightPos.z + _rightRayDir.z * tC;

      const rAx = tipX - Cx, rAy = tipY - Cy, rAz = tipZ - Cz;
      const radius = Math.sqrt(rAx*rAx + rAy*rAy + rAz*rAz);
      const rBx = _pinchPoint.x - Cx, rBy = _pinchPoint.y - Cy, rBz = _pinchPoint.z - Cz;

      if (radius > 0.001) {
        const rAux = rAx/radius, rAuy = rAy/radius, rAuz = rAz/radius;
        const rBLen = Math.sqrt(rBx*rBx + rBy*rBy + rBz*rBz);
        const rBux = rBx/rBLen, rBuy = rBy/rBLen, rBuz = rBz/rBLen;

        const dot   = Math.max(-1, Math.min(1, rAux*rBux + rAuy*rBuy + rAuz*rBuz));
        const theta = Math.acos(dot);

        if (theta > 0.001) {
          const sinTheta = Math.sin(theta);
          for (let i = 0; i <= N_ARC_SEGS; i++) {
            const ti = i / N_ARC_SEGS;
            const w1 = Math.sin((1 - ti) * theta) / sinTheta;
            const w2 = Math.sin(ti * theta) / sinTheta;
            _arcPositions[i * 3]     = Cx + radius * (w1 * rAux + w2 * rBux);
            _arcPositions[i * 3 + 1] = Cy + radius * (w1 * rAuy + w2 * rBuy);
            _arcPositions[i * 3 + 2] = Cz + radius * (w1 * rAuz + w2 * rBuz);
          }
          _arcGeo.attributes.position.needsUpdate = true;
          _arcObj.visible = true;
        } else { _arcObj.visible = false; }
      } else { _arcObj.visible = false; }
    } else { _arcObj.visible = false; }
  });
</script>

{#if active}
  <T.Group position={[originX, originY, originZ]} quaternion={[originQx, originQy, originQz, originQw]}>
    <OriginMarker />
  </T.Group>
{/if}
