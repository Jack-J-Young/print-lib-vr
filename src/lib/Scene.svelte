<script lang="ts">
  import { T, type CurrentReadable, useTask } from "@threlte/core";
  import {
    XR,
    useController,
    Headset,
    type XRController,
    useXR,
  } from "@threlte/xr";
  import * as THREE from "three";
  import Controllers from "$lib/ui/input/Controllers.svelte";
  import Collision from "$lib/ui/interactables/Collision.svelte";
  import Keyboard from "$lib/components/Keyboard.svelte";
  import GithubInput from "$lib/components/GithubInput.svelte";
  import MarkdownPanel from "$lib/components/MarkdownPanel.svelte";
  import ModelViewer from "$lib/components/ModelViewer.svelte";
  import OriginMarker from "$lib/models/OriginMarker.svelte";
  import { load3MFsFromRepo } from "$lib/services/githubService";
  import { repoStore } from "$lib/stores/repoStore.svelte";
  import { worldStore } from "$lib/stores/worldStore.svelte";

  const { isHandTracking } = useXR();

  let headset: THREE.Object3D = $state(new THREE.Object3D());
  let worldRoot: THREE.Group = $state(new THREE.Group());

  $effect(() => { worldStore.worldRoot = worldRoot; });
  $effect(() => { worldStore.headset   = headset; });

  let init = false;

  useTask(() => {
    if (!init) {
      worldStore.recenter();
      init = true;
    }
    const gamepad = $right?.inputSource?.gamepad;
    if (!gamepad) return;
    if (gamepad.buttons[3]?.pressed) worldStore.recenter();
  });

  let left: CurrentReadable<XRController | undefined> = $state(useController("left"));
  let right: CurrentReadable<XRController | undefined> = $state(useController("right"));

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
  <Controllers bind:left bind:right />

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
        <T.MeshBasicMaterial
          color="clear"
          transparent
          side={THREE.DoubleSide}
        />
      </T.Mesh>
    </Collision>
  </T.Group>
</XR>
