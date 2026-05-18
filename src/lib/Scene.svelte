<script lang="ts">
  import { T, type CurrentReadable, useTask } from "@threlte/core";
  import {
    XR,
    useController,
    Headset,
    type XRController,
  } from "@threlte/xr";
  import * as THREE from "three";
  import Controllers from "$lib/Controllers.svelte";
  import Collision from "$lib/Collision.svelte";
  import Keyboard from "$lib/Keyboard.svelte";
  import OriginMarker from "$lib/OriginMarker.svelte";
  import GithubInput from "$lib/GithubInput.svelte";
  import ModelViewer from "$lib/ModelViewer.svelte";
  import { load3MFsFromRepo } from "$lib/services/githubService";
  import { repoStore } from "$lib/stores/repoStore.svelte";

  async function handleSearch(text: string) {
    const query = text.trim();
    if (!query) return;
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

  let headset: THREE.Object3D = $state(new THREE.Object3D());

  let worldRoot: THREE.Group = $state(new THREE.Group());

  function recenter(head: THREE.Object3D) {
    if (!worldRoot) return;

    // decompose into position + rotation
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    head.matrixWorld.decompose(pos, quat, scale);

    quat.z = 0;

    worldRoot.position.copy(pos);
    worldRoot.quaternion.copy(quat);
    worldRoot.scale.copy(scale);
  }

  let init = false;

  useTask(() => {
    if (!init) {
      recenter(headset);

      init = true;
    }
    const gamepad = $right?.inputSource?.gamepad;

    if (!gamepad) return;

    const pressed = gamepad.buttons[3]?.pressed;
    // button[0] = primary trigger (most devices)

    if (pressed && worldRoot && headset) {
      recenter(headset);
      // $left = $right;
    }
  });

  let left: CurrentReadable<XRController | undefined> = $state(
    useController("left"),
  );
  let right: CurrentReadable<XRController | undefined> = $state(
    useController("right"),
  );
  // let test2: THREE.Mesh | undefined = $state();
</script>

<XR>
  <Headset>
    <T.Object3D bind:ref={headset} />
  </Headset>

  <Controllers bind:left bind:right />

  <T.Group bind:ref={worldRoot}>
    <T.AmbientLight color={0xd7681c} intensity={0.3} position={[0, 0, 0]} />
    <T.DirectionalLight
      castShadow
      intensity={0.6}
      position={[0, 0, 0]}
      rotation={[0, 0, 1]}
    />

    <!-- <grid -->

    <OriginMarker />
    <GithubInput onsearch={handleSearch} />
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
