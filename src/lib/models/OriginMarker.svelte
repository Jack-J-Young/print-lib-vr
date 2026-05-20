<!--
  OriginMarker.svelte
  Renders 3 axis arrows at the world origin:
    X = Red, Y = Green, Z = Blue
  Each arrow is a cylinder (shaft) + cone (head).
-->
<script lang="ts">
  import { T } from '@threlte/core';
  import { CylinderGeometry, ConeGeometry } from 'three';

  const SHAFT_RADIUS = 0.01;
  const SHAFT_LENGTH = 0.15;
  const HEAD_RADIUS = 0.025;
  const HEAD_LENGTH = 0.06;
  const TOTAL = SHAFT_LENGTH + HEAD_LENGTH;

  // Each axis: rotation to orient the Y-up primitives along the right direction
  const axes = [
    { color: '#ff3333', rotation: [0, 0, -Math.PI / 2] as [number, number, number], label: 'X' },
    { color: '#33ff33', rotation: [0, 0, 0] as [number, number, number], label: 'Y' },
    { color: '#3399ff', rotation: [Math.PI / 2, 0, 0] as [number, number, number], label: 'Z' },
  ];
</script>

<T.Group name="origin-marker">
  {#each axes as axis}
    <T.Group rotation={axis.rotation}>
      <!-- Shaft -->
      <T.Mesh position.y={SHAFT_LENGTH / 2}>
        <T.CylinderGeometry args={[SHAFT_RADIUS, SHAFT_RADIUS, SHAFT_LENGTH, 8]} />
        <T.MeshStandardMaterial color={axis.color} roughness={0.3} metalness={0.6} />
      </T.Mesh>

      <!-- Arrow head -->
      <T.Mesh position.y={SHAFT_LENGTH + HEAD_LENGTH / 2}>
        <T.ConeGeometry args={[HEAD_RADIUS, HEAD_LENGTH, 8]} />
        <T.MeshStandardMaterial color={axis.color} roughness={0.3} metalness={0.6} />
      </T.Mesh>
    </T.Group>
  {/each}

  <!-- Centre sphere -->
  <T.Mesh>
    <T.SphereGeometry args={[0.018, 12, 12]} />
    <T.MeshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.8} />
  </T.Mesh>
</T.Group>
