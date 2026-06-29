import * as THREE from "three";

class WorldStore {
  worldRoot: THREE.Group | undefined;
  headset: THREE.Object3D | undefined;

  recenter(): void {
    if (!this.worldRoot || !this.headset) return;

    const pos   = new THREE.Vector3();
    const quat  = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    this.headset.matrixWorld.decompose(pos, quat, scale);
    quat.z = 0;

    this.worldRoot.position.copy(pos);
    this.worldRoot.quaternion.copy(quat);
    this.worldRoot.scale.copy(scale);
  }
}

export const worldStore = new WorldStore();
