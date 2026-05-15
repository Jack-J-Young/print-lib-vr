<script lang="ts">
  import { T } from "@threlte/core";

  let {
    color = "white",
    length = 1,
    radius = 0.005,
    segments = 4
  }: { color?: string | number; length?: number; radius?: number, segments?: number } = $props();
</script>

<T.Mesh position={[0, -length / 2, 0]}>
  <T.CylinderGeometry args={[radius, 0.0, length, segments]} />
  <T.MeshStandardMaterial {color}/>
</T.Mesh>
