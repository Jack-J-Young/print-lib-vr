<script lang="ts">
  import { useThrelte, useTask } from '@threlte/core';
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
  const _rA   = new THREE.Vector3();
  const _rB   = new THREE.Vector3();
  const _quat = new THREE.Quaternion();
  const _yUp  = new THREE.Vector3(0, 1, 0);
  const _tang = new THREE.Vector3();

  useTask(() => {
    if (!visible) {
      _tubeMesh.visible  = false;
      _headGroup.visible = false;
      return;
    }

    _rA.subVectors(from, center);
    _rB.subVectors(to,   center);
    const radius = _rA.length();
    const rBLen  = _rB.length();

    if (radius < 0.001 || rBLen < 0.001) {
      _tubeMesh.visible  = false;
      _headGroup.visible = false;
      return;
    }

    const rAux = _rA.x / radius, rAuy = _rA.y / radius, rAuz = _rA.z / radius;
    const rBux = _rB.x / rBLen,  rBuy = _rB.y / rBLen,  rBuz = _rB.z / rBLen;

    const dot   = Math.max(-1, Math.min(1, rAux * rBux + rAuy * rBuy + rAuz * rBuz));
    const theta = Math.acos(dot);

    if (theta < 0.001) {
      _tubeMesh.visible  = false;
      _headGroup.visible = false;
      return;
    }

    const sinTheta = Math.sin(theta);
    const Cx = center.x, Cy = center.y, Cz = center.z;

    let lastPx = 0, lastPy = 0, lastPz = 0;
    let lastTx = 0, lastTy = 0, lastTz = 0;

    for (let i = 0; i <= segments; i++) {
      const ti = i / segments;
      const w1 = Math.sin((1 - ti) * theta) / sinTheta;
      const w2 = Math.sin(ti * theta) / sinTheta;

      // Arc position (SLERP — guaranteed unit direction × radius)
      const px = Cx + radius * (w1 * rAux + w2 * rBux);
      const py = Cy + radius * (w1 * rAuy + w2 * rBuy);
      const pz = Cz + radius * (w1 * rAuz + w2 * rBuz);

      // Centripetal inward normal — unit by SLERP property, no normalisation needed
      const nux = -(w1 * rAux + w2 * rBux);
      const nuy = -(w1 * rAuy + w2 * rBuy);
      const nuz = -(w1 * rAuz + w2 * rBuz);

      // Tangent — derivative of SLERP, then normalise
      const dw1 = -Math.cos((1 - ti) * theta);
      const dw2 =  Math.cos(ti * theta);
      let tx = dw1 * rAux + dw2 * rBux;
      let ty = dw1 * rAuy + dw2 * rBuy;
      let tz = dw1 * rAuz + dw2 * rBuz;
      const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz);
      if (tLen > 0.0001) { tx /= tLen; ty /= tLen; tz /= tLen; }

      // Binormal = tangent × normal
      const bx = ty * nuz - tz * nuy;
      const by = tz * nux - tx * nuz;
      const bz = tx * nuy - ty * nux;

      // Tube ring vertices
      for (let j = 0; j <= RADIAL; j++) {
        const ang = (j / RADIAL) * Math.PI * 2;
        const cos = Math.cos(ang), sin = Math.sin(ang);
        const vi = (i * (RADIAL + 1) + j) * 3;
        _tubePos[vi]     = px + shaftRadius * (cos * nux + sin * bx);
        _tubePos[vi + 1] = py + shaftRadius * (cos * nuy + sin * by);
        _tubePos[vi + 2] = pz + shaftRadius * (cos * nuz + sin * bz);
      }

      if (i === segments) { lastPx = px; lastPy = py; lastPz = pz; lastTx = tx; lastTy = ty; lastTz = tz; }
    }

    _tubeGeo.attributes.position.needsUpdate = true;
    _tubeGeo.computeBoundingSphere();
    _tubeMesh.visible = true;

    // Arrowhead at final arc point, oriented along final tangent
    _tang.set(lastTx, lastTy, lastTz);
    if (_tang.y > 0.9999)       _quat.set(0, 0, 0, 1);
    else if (_tang.y < -0.9999) _quat.set(0, 0, 1, 0);
    else                        _quat.setFromUnitVectors(_yUp, _tang);
    _headGroup.position.set(lastPx, lastPy, lastPz);
    _headGroup.quaternion.copy(_quat);
    _headGroup.visible = true;
  });
</script>
