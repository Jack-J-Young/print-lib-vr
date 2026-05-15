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
  import TestPlane from "$lib/Keyboard.svelte";
  import Collision from "$lib/Collision.svelte";
    import Keyboard from "$lib/Keyboard.svelte";
    import Input from "$lib/Input.svelte";
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
  // let test2: THREE.Mesh | undefined = $state();
</script>

<XR>
  <Headset>
    <T.Object3D bind:ref={headset}>
    <!-- TODO: Hand tracking / controller abstract / alternate mode -->
      <!-- {#if isHandTracking}
        <T.Object3D>
          <Hand left></Hand>
          <Hand right></Hand>
        </T.Object3D>
      {/if} -->
    </T.Object3D>
  </Headset>

  <T.PerspectiveCamera />
  <Controllers
    bind:left
    bind:right
  /><!-- intersectObjs={[test, test2].filter((obj) => obj!=undefined)} -->

  <!-- <Controllers bind:left bind:right intersectObjs={[test, test2].filter((obj) => obj!=undefined)}/> -->
  <T.Group bind:ref={worldRoot}>
    <T.AmbientLight color={0xd7681c} intensity={0.3} position={[0, 0, 0]} />
    <T.DirectionalLight
      castShadow
      intensity={0.6}
      position={[0, 0, 0]}
      rotation={[0, 0, 1]}
    />

    <!-- {#if $keyboard}
      <T is={$keyboard}></T>
    {/if} -->
    <OriginMarker></OriginMarker>
    <!-- <Input /> -->
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
