<script lang="ts">
  import Grabbable from "$lib/Grabbable.svelte";
  import { T } from "@threlte/core";
  import * as THREE from "three";

</script>

<Grabbable>
  <T.Mesh
      position={[-1.0, -1.0, -1.0]}
    >
      <T.PlaneGeometry args={[10, 10]} />
      <T.MeshBasicMaterial color="gray" side={THREE.DoubleSide} />
    </T.Mesh>
</Grabbable>