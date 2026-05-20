<script lang="ts">
  import { useThrelte, useTask } from '@threlte/core';
  import * as THREE from 'three';

  let {
    from,
    to,
    color      = 0xffffff,
    shaftRadius = 0.003,
    headRadius  = 0.008,
    headLength  = 0.03,
    visible     = true,
  }: {
    from:         THREE.Vector3;
    to:           THREE.Vector3;
    color?:       number;
    shaftRadius?: number;
    headRadius?:  number;
    headLength?:  number;
    visible?:     boolean;
  } = $props();

  const { scene } = useThrelte();

  const _mat      = new THREE.MeshBasicMaterial({ color });
  // Unit-height cylinder — scaled in Y each frame to match shaft length
  const _shaftGeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, 1, 8);
  const _headGeo  = new THREE.ConeGeometry(headRadius, headLength, 8);
  const _shaft    = new THREE.Mesh(_shaftGeo, _mat);
  const _head     = new THREE.Mesh(_headGeo,  _mat);
  _head.position.y = headLength / 2; // will be overwritten per frame
  const _group    = new THREE.Group();
  _group.add(_shaft, _head);
  _group.visible  = false;

  $effect(() => { _mat.color.set(color); });

  $effect(() => {
    scene.add(_group);
    return () => scene.remove(_group);
  });

  const _dir  = new THREE.Vector3();
  const _quat = new THREE.Quaternion();
  const _yUp  = new THREE.Vector3(0, 1, 0);

  useTask(() => {
    if (!visible) { _group.visible = false; return; }

    _dir.subVectors(to, from);
    const fullLen  = _dir.length();
    const shaftLen = Math.max(0, fullLen - headLength);
    if (shaftLen < 0.0005) { _group.visible = false; return; }

    _dir.divideScalar(fullLen);
    // Handle degenerate case where direction is exactly ±Y
    if (_dir.y > 0.9999)       _quat.set(0, 0, 0, 1);
    else if (_dir.y < -0.9999) _quat.set(0, 0, 1, 0); // 180° around Z
    else                       _quat.setFromUnitVectors(_yUp, _dir);

    _group.position.copy(from);
    _group.quaternion.copy(_quat);

    _shaft.position.y = shaftLen / 2;
    _shaft.scale.y    = shaftLen;
    _head.position.y  = shaftLen + headLength / 2;

    _group.visible = true;
  });
</script>
