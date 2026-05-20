<script lang="ts">
  import { T } from "@threlte/core";
  import Grabbable from "$lib/ui/interactables/Grabbable.svelte";
  import { repoStore } from "$lib/stores/repoStore.svelte";
</script>

{#each repoStore.models as model (model.uuid)}
  <Grabbable>
    <T is={model} />
  </Grabbable>
{/each}
