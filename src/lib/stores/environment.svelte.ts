import * as THREE from "three";

const _pos   = new THREE.Vector3();
const _quat  = new THREE.Quaternion();
const _scale = new THREE.Vector3();

// VR-space controller: owns the world's placement relative to the headset.
// Recentering today; scale / origin are the natural next operations to live here.
// This is VR-space logic, not controller-specific — any input source can drive it.
class Environment {
  worldRoot: THREE.Group | undefined;
  headset:   THREE.Object3D | undefined;

  recenter(): void {
    if (!this.worldRoot || !this.headset) return;

    this.headset.matrixWorld.decompose(_pos, _quat, _scale);
    _quat.z = 0;

    this.worldRoot.position.copy(_pos);
    this.worldRoot.quaternion.copy(_quat);
    this.worldRoot.scale.copy(_scale);
  }
}

export const environment = new Environment();
