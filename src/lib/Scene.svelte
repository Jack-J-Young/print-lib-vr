<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import { XR, Headset } from "@threlte/xr";
  import * as THREE from "three";
  import Input from "$lib/ui/input/Input.svelte";
  import Collision from "$lib/ui/interactables/Collision.svelte";
  import Keyboard from "$lib/components/Keyboard.svelte";
  import GithubInput from "$lib/components/GithubInput.svelte";
  import MarkdownPanel from "$lib/components/MarkdownPanel.svelte";
  import ModelViewer from "$lib/components/ModelViewer.svelte";
  import OriginMarker from "$lib/models/OriginMarker.svelte";
  import { load3MFsFromRepo } from "$lib/services/githubService";
  import { repoStore } from "$lib/stores/repoStore.svelte";
  import { environment } from "$lib/stores/environment.svelte";

  let headset: THREE.Object3D = $state(new THREE.Object3D());
  let worldRoot: THREE.Group = $state(new THREE.Group());

  $effect(() => { environment.worldRoot = worldRoot; });
  $effect(() => { environment.headset   = headset; });

  // Place the world relative to the headset on the first frame, once matrices exist.
  let init = false;
  useTask(() => {
    if (init) return;
    environment.recenter();
    init = true;
  });

  let readmeSrc: string | undefined = $state(undefined);

  async function onSearch(repo: string) {
    const query = repo.trim();
    if (!query) return;

    // Load README as markdown
    readmeSrc = `https://api.github.com/repos/${query}/readme`;

    // Load 3MF models
    repoStore.loading = true;
    repoStore.error = "";
    repoStore.models = [];
    try {
      repoStore.models = await load3MFsFromRepo(query);
    } catch (e) {
      repoStore.error = e instanceof Error ? e.message : "Unknown error";
      console.error(repoStore.error);
    } finally {
      repoStore.loading = false;
    }
  }
</script>

<XR>
  <Headset>
    <T.Object3D bind:ref={headset} />
  </Headset>

  <T.PerspectiveCamera />
  <Input />

  <T.Group bind:ref={worldRoot}>
    <T.AmbientLight color={0xd7681c} intensity={0.3} position={[0, 0, 0]} />
    <T.DirectionalLight
      castShadow
      intensity={0.6}
      position={[0, 0, 0]}
      rotation={[0, 0, 1]}
    />

    <OriginMarker />

    <T.Group position={[0, 0.3, -1]}>
      <GithubInput onsearch={onSearch} />
    </T.Group>

    {#if readmeSrc}
      <MarkdownPanel src={readmeSrc} position={[1.3, 0.5, -1.8]} />
    {/if}

    <ModelViewer />
    <Keyboard />

    <Collision>
      <T.Mesh visible={false}>
        <T.SphereGeometry args={[4, 16, 16]} />
        <T.MeshBasicMaterial transparent side={THREE.DoubleSide} />
      </T.Mesh>
    </Collision>
  </T.Group>
</XR>
