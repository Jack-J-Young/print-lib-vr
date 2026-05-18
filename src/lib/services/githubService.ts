import * as THREE from "three";
import { ThreeMFLoader } from "three/addons/loaders/3MFLoader.js";

interface GitHubFile {
  name: string;
  type: string;
  download_url: string | null;
}

/**
 * Convert from 3MF millimetres to WebXR metres (1 unit = 1 m).
 * Also shifts the model so its bounding-box centre sits at the group origin.
 */
function normalise(group: THREE.Group): void {
  // 3MF spec: units are millimetres → scale to metres
  group.scale.setScalar(0.001);

  // Centre the model at the group origin after scaling
  const box = new THREE.Box3().setFromObject(group);
  const centre = box.getCenter(new THREE.Vector3());
  group.children.forEach((child) => child.position.sub(centre));
}

/**
 * Fetch the root of a GitHub repo, find all .3mf files, load them with
 * ThreeMFLoader, and return an array of positioned THREE.Groups.
 *
 * @param repoPath  "owner/repo"
 */
export async function load3MFsFromRepo(repoPath: string): Promise<THREE.Group[]> {
  const parts = repoPath.trim().split("/");
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new Error('Expected format: owner/repo  (e.g. Jack-J-Young/my-project)');
  }
  const [owner, repo] = parts;

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/`,
    { headers: { Accept: "application/vnd.github+json" } }
  );
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`);

  const files: GitHubFile[] = await res.json();
  const threemfFiles = files.filter(
    (f) => f.type === "file" && f.name.toLowerCase().endsWith(".3mf") && f.download_url
  );

  if (threemfFiles.length === 0) {
    throw new Error("No .3mf files found in the repo root");
  }

  const loader = new ThreeMFLoader();

  return Promise.all(
    threemfFiles.map(async (file, index) => {
      const raw = await fetch(file.download_url!);
      if (!raw.ok) throw new Error(`Failed to download ${file.name}`);
      const buffer = await raw.arrayBuffer();

      const group = loader.parse(buffer) as THREE.Group;
      group.name = file.name.replace(/\.3mf$/i, "");

      normalise(group);

      // Space models 0.5 m apart along X, centred on the origin
      const totalWidth = (threemfFiles.length - 1) * 0.5;
      group.position.set(index * 0.5 - totalWidth / 2, 0, -2);

      return group;
    })
  );
}
