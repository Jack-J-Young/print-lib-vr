<script lang="ts">
  import { T } from "@threlte/core";
  import type * as THREE from "three";

  // Small lit sphere drawn at the current raycast hit point.
  let {
    point,
    color,
  }: {
    point: THREE.Vector3;
    color: THREE.ColorRepresentation;
  } = $props();
</script>

<T.Mesh position={point.toArray()}>
  <T.SphereGeometry args={[0.01, 8, 8]} />
  <T.MeshStandardMaterial {color} />
</T.Mesh>
