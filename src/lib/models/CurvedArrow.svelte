<script lang="ts">
  import { useThrelte, useTask } from '@threlte/core';
  import { alignYTo } from '$lib/models/orient';
  import { arcParams, writeArcTube, type ArcParams, type ArcEndpoint } from '$lib/math/sphericalArc';
  import * as THREE from 'three';

  let {
    center,
    from,
    to,
    color       = 0xffffff,
    segments    = 24,
    shaftRadius = 0.003,
    headRadius  = 0.008,
    headLength  = 0.03,
    visible     = true,
  }: {
    center:       THREE.Vector3;
    from:         THREE.Vector3;
    to:           THREE.Vector3;
    color?:       number;
    segments?:    number;
    shaftRadius?: number;
    headRadius?:  number;
    headLength?:  number;
    visible?:     boolean;
  } = $props();

  const { scene } = useThrelte();

  const RADIAL   = 4;
  const _tubePos = new Float32Array((segments + 1) * (RADIAL + 1) * 3);
  const _tubeGeo = new THREE.BufferGeometry();
  _tubeGeo.setAttribute('position', new THREE.BufferAttribute(_tubePos, 3));

  // Index buffer — computed once at mount
  const _idxArr: number[] = [];
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < RADIAL; j++) {
      const a = i       * (RADIAL + 1) + j;
      const b = (i + 1) * (RADIAL + 1) + j;
      const c = (i + 1) * (RADIAL + 1) + j + 1;
      const d = i       * (RADIAL + 1) + j + 1;
      _idxArr.push(a, b, d, b, c, d);
    }
  }
  _tubeGeo.setIndex(_idxArr);

  const _tubeMat  = new THREE.MeshBasicMaterial({ color });
  const _tubeMesh = new THREE.Mesh(_tubeGeo, _tubeMat);
  _tubeMesh.visible = false;

  // Arrowhead cone
  const _headGeo   = new THREE.ConeGeometry(headRadius, headLength, 8);
  const _headMat   = new THREE.MeshBasicMaterial({ color });
  const _headMesh  = new THREE.Mesh(_headGeo, _headMat);
  const _headGroup = new THREE.Group();
  _headGroup.add(_headMesh);
  _headMesh.position.y = headLength / 2;
  _headGroup.visible = false;

  $effect(() => {
    _tubeMat.color.set(color);
    _headMat.color.set(color);
  });

  $effect(() => {
    scene.add(_tubeMesh);
    scene.add(_headGroup);
    return () => {
      scene.remove(_tubeMesh);
      scene.remove(_headGroup);
    };
  });

  // Pre-allocated temporaries
  const _quat = new THREE.Quaternion();
  const _tang = new THREE.Vector3();

  const _params: ArcParams = {
    valid: false, radius: 0, theta: 0, sinTheta: 0,
    rAux: 0, rAuy: 0, rAuz: 0, rBux: 0, rBuy: 0, rBuz: 0,
  };
  const _last: ArcEndpoint = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0 };

  useTask(() => {
    if (!visible) {
      _tubeMesh.visible  = false;
      _headGroup.visible = false;
      return;
    }

    arcParams(from, to, center, _params);
    if (!_params.valid) {
      _tubeMesh.visible  = false;
      _headGroup.visible = false;
      return;
    }

    writeArcTube(_tubePos, _params, center, segments, RADIAL, shaftRadius, _last);

    _tubeGeo.attributes.position.needsUpdate = true;
    _tubeGeo.computeBoundingSphere();
    _tubeMesh.visible = true;

    // Arrowhead at final arc point, oriented along final tangent
    _tang.set(_last.tx, _last.ty, _last.tz);
    alignYTo(_quat, _tang);
    _headGroup.position.set(_last.px, _last.py, _last.pz);
    _headGroup.quaternion.copy(_quat);
    _headGroup.visible = true;
  });
</script>
