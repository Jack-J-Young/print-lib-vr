import * as THREE from "three";
import { ThreeMFLoader } from "three/addons/loaders/3MFLoader.js";

export interface RepoFile {
  path: string;
  type: "blob" | "tree";
}

export interface RepoTree {
  owner: string;
  repo: string;
  branch: string;
  files: RepoFile[];
}

export interface DirEntry {
  name: string;
  path: string;
  isDir: boolean;
  up?: boolean; // the synthetic "go up a level" entry
}

const GH_HEADERS = { Accept: "application/vnd.github+json" };

function parseRepoPath(repoPath: string): [string, string] {
  const parts = repoPath.trim().split("/");
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new Error("Expected format: owner/repo  (e.g. Jack-J-Young/my-project)");
  }
  return [parts[0], parts[1]];
}

// Fetch the whole repo file tree in one request (default branch), to navigate locally.
export async function fetchRepoTree(repoPath: string): Promise<RepoTree> {
  const [owner, repo] = parseRepoPath(repoPath);

  const infoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: GH_HEADERS });
  if (!infoRes.ok) throw new Error(`GitHub API ${infoRes.status}: ${infoRes.statusText}`);
  const branch: string = (await infoRes.json()).default_branch;

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: GH_HEADERS },
  );
  if (!treeRes.ok) throw new Error(`GitHub API ${treeRes.status}: ${treeRes.statusText}`);

  const data = await treeRes.json();
  const files: RepoFile[] = (data.tree ?? [])
    .filter((t: { type: string }) => t.type === "blob" || t.type === "tree")
    .map((t: { path: string; type: "blob" | "tree" }) => ({ path: t.path, type: t.type }));

  return { owner, repo, branch, files };
}

// Immediate children of `dir` ("" = root), folders first then files, alphabetical.
export function listDir(files: RepoFile[], dir: string): DirEntry[] {
  const prefix = dir ? `${dir}/` : "";
  const seen = new Set<string>();
  const entries: DirEntry[] = [];

  for (const f of files) {
    if (!f.path.startsWith(prefix)) continue;
    const rest = f.path.slice(prefix.length);
    const slash = rest.indexOf("/");
    const name = slash === -1 ? rest : rest.slice(0, slash);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    entries.push({ name, path: prefix + name, isDir: slash !== -1 || f.type === "tree" });
  }

  entries.sort((a, b) =>
    a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1,
  );
  return entries;
}

export function parentDir(dir: string): string {
  return dir.includes("/") ? dir.slice(0, dir.lastIndexOf("/")) : "";
}

export function rawUrl(tree: RepoTree, path: string): string {
  return `https://raw.githubusercontent.com/${tree.owner}/${tree.repo}/${tree.branch}/${path}`;
}

const loader = new ThreeMFLoader();

// Load + parse + normalise a single .3mf into a centred, metre-scaled group at origin.
export async function load3MF(url: string): Promise<THREE.Group> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}`);
  const group = loader.parse(await res.arrayBuffer()) as THREE.Group;
  normalise(group);
  return group;
}

function normalise(group: THREE.Group): void {
  // 3MF spec: units are millimetres → scale to metres
  group.scale.setScalar(0.001);

  const box = new THREE.Box3().setFromObject(group);
  const centre = box.getCenter(new THREE.Vector3());
  group.children.forEach((child) => child.position.sub(centre));
}
