<script lang="ts">
  import CanvasPanel from "$lib/ui/canvas/CanvasPanel.svelte";
  import { listDir, parentDir, type RepoTree, type DirEntry } from "$lib/services/githubService";
  import { renderExplorer, rowIndexAt, pageCount } from "$lib/services/fileExplorerCanvas";

  let {
    tree,
    position = [-1.1, 1.0, -1.8] as [number, number, number],
    onfile,
  }: {
    tree: RepoTree;
    position?: [number, number, number];
    onfile: (entry: DirEntry) => void;
  } = $props();

  let path = $state("");
  let page = $state(0);
  let hoveredRow = $state(-1);

  const entries = $derived.by(() => {
    const list = listDir(tree.files, path);
    if (!path) return list;
    return [{ name: "..", path: parentDir(path), isDir: true, up: true } as DirEntry, ...list];
  });

  const totalPages = $derived(pageCount(entries));

  function navigate(to: string) {
    path = to;
    page = 0;
    hoveredRow = -1;
  }

  function select(_x: number, y: number, atPage: number) {
    const i = rowIndexAt(y, atPage);
    if (i < 0 || i >= entries.length) return;
    const entry = entries[i];
    if (entry.isDir) navigate(entry.path);
    else onfile(entry);
  }

  function hover(_x: number, y: number, atPage: number) {
    const i = rowIndexAt(y, atPage);
    hoveredRow = i >= 0 && i < entries.length ? i : -1;
  }
</script>

<CanvasPanel
  {position}
  pageCount={totalPages}
  bind:page
  render={(ctx, p) => renderExplorer(ctx, { path, entries, page: p, hoveredRow })}
  onSelect={select}
  onHover={hover}
  onHoverEnd={() => { hoveredRow = -1; }}
/>
