import * as THREE from "three";

const _yUp = new THREE.Vector3(0, 1, 0);

// Orient the Three.js +Y primitive axis onto a unit direction, with pole-safe
// handling for directions parallel to +Y / -Y. Mutates the passed quaternion.
export function alignYTo(quat: THREE.Quaternion, dir: THREE.Vector3): void {
  if (dir.y > 0.9999)       quat.set(0, 0, 0, 1);
  else if (dir.y < -0.9999) quat.set(0, 0, 1, 0);
  else                      quat.setFromUnitVectors(_yUp, dir);
}
