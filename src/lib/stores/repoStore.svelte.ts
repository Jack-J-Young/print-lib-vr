import type * as THREE from "three";
import type { RepoTree } from "$lib/services/githubService";

export class RepoStore {
  tree: RepoTree | null = $state(null);
  models: THREE.Group[] = $state([]);
  loading = $state(false);
  error = $state("");
}

export const repoStore = new RepoStore();
