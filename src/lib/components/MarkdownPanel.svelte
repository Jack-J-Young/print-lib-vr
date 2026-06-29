<script lang="ts">
  import CanvasPanel from "$lib/ui/canvas/CanvasPanel.svelte";
  import { markdownToLines, type StyledLine } from "$lib/services/markdownLayout";
  import { paginate, renderPage, MAX_W, USABLE_H } from "$lib/services/markdownCanvas";

  let {
    src,
    markdown,
    position = [0, 0.5, -1.5] as [number, number, number],
  }: {
    src?: string;
    markdown?: string;
    position?: [number, number, number];
  } = $props();

  let allLines: StyledLine[] = $state([]);

  const pages = $derived(paginate(allLines, USABLE_H));
  const totalPages = $derived(pages.length || 1);

  async function load() {
    let md = markdown ?? "";
    if (src) {
      try {
        const r = await fetch(src, { headers: { Accept: "application/vnd.github.raw" } });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        md = await r.text();
      } catch (e) {
        md = `# Error\n\nCould not load \`${src}\`\n\n${e}`;
      }
    }
    allLines = markdownToLines(md, MAX_W);
  }

  $effect(() => { void load(); });
</script>

<CanvasPanel
  {position}
  pageCount={totalPages}
  render={(ctx, page) => renderPage(ctx, pages[page] ?? [], totalPages, page)}
/>
