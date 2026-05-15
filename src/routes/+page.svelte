<script lang="ts">
  import { Canvas } from '@threlte/core'
  import Scene from '$lib/Scene.svelte';
  import { VRButton } from "@threlte/xr";

</script>

<VRButton/>
<Canvas >
  
  <Scene />
</Canvas>