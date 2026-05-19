<script lang="ts">
  import { T, type CurrentReadable, useTask } from "@threlte/core";
  import {
    XR,
    useController,
    Headset,
    type XRController,
    useXR,
    Hand,
  } from "@threlte/xr";
  import * as THREE from "three";
  import Controllers from "$lib/Controllers.svelte";
  import Collision from "$lib/Collision.svelte";
  import Keyboard from "$lib/Keyboard.svelte";
  import GithubInput from "$lib/GithubInput.svelte";
  import MarkdownPanel from "$lib/MarkdownPanel.svelte";
  import OriginMarker from "$lib/OriginMarker.svelte";

  const { isHandTracking } = useXR();

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

  // README source URL — set when the user submits a GitHub search
  let readmeSrc: string | undefined = $state(undefined);

  function onSearch(repo: string) {
    // GitHub API returns raw README regardless of default branch
    readmeSrc = `https://api.github.com/repos/${repo}/readme`;
  }
</script>

<XR>
  <Headset>
    <T.Object3D bind:ref={headset}>
    </T.Object3D>
  </Headset>

  <T.PerspectiveCamera />
  <Controllers
    bind:left
    bind:right
  />

  <!-- <Controllers bind:left bind:right intersectObjs={[test, test2].filter((obj) => obj!=undefined)}/> -->
  <T.Group bind:ref={worldRoot}>
    <T.AmbientLight color={0xd7681c} intensity={0.3} position={[0, 0, 0]} />
    <T.DirectionalLight
      castShadow
      intensity={0.6}
      position={[0, 0, 0]}
      rotation={[0, 0, 1]}
    />

    <OriginMarker></OriginMarker>

    <!-- Search bar: sits 1 m in front, slightly above eye level -->
    <T.Group position={[0, 0.3, -1]}>
      <GithubInput onsearch={onSearch} />
    </T.Group>

    <!-- README panel: appears to the right of the search bar after a search -->
    {#if readmeSrc}
      <MarkdownPanel src={readmeSrc} position={[1.3, 0.5, -1.8]} />
    {/if}

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
