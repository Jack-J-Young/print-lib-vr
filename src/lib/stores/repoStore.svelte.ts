import type * as THREE from "three";

export class RepoStore {
  models: THREE.Group[] = $state([]);
  loading = $state(false);
  error = $state("");
}

export const repoStore = new RepoStore();
