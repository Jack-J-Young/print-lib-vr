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
  import FileExplorer from "$lib/components/FileExplorer.svelte";
  import OriginMarker from "$lib/models/OriginMarker.svelte";
  import { fetchRepoTree, load3MF, rawUrl, type DirEntry } from "$lib/services/githubService";
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

  // Search loads the repo's file tree into the explorer — nothing auto-loads.
  async function onSearch(repo: string) {
    const query = repo.trim();
    if (!query) return;

    repoStore.loading = true;
    repoStore.error = "";
    repoStore.models = [];
    readmeSrc = undefined;
    try {
      repoStore.tree = await fetchRepoTree(query);
    } catch (e) {
      repoStore.error = e instanceof Error ? e.message : "Unknown error";
      repoStore.tree = null;
      console.error(repoStore.error);
    } finally {
      repoStore.loading = false;
    }
  }

  // A file the user picked in the explorer: load 3MF models, open markdown.
  async function openFile(entry: DirEntry) {
    const tree = repoStore.tree;
    if (!tree) return;
    const url = rawUrl(tree, entry.path);
    const name = entry.name.toLowerCase();

    if (name.endsWith(".md")) {
      readmeSrc = url;
    } else if (name.endsWith(".3mf")) {
      try {
        const model = await load3MF(url);
        model.position.set((repoStore.models.length % 5) * 0.4 - 0.8, 1, -1.5);
        repoStore.models = [...repoStore.models, model];
      } catch (e) {
        repoStore.error = e instanceof Error ? e.message : "Unknown error";
        console.error(repoStore.error);
      }
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

    {#if repoStore.tree}
      <FileExplorer tree={repoStore.tree} onfile={openFile} position={[-1.3, 0.6, -1.8]} />
    {/if}

    {#if readmeSrc}
      <MarkdownPanel src={readmeSrc} position={[1.3, 0.6, -1.8]} />
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
