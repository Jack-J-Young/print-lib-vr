import { grabTool } from "$lib/tools/GrabTool.svelte";
import { interactTool } from "$lib/tools/InteractTool.svelte";
import type { Tool } from "$lib/tools/Tool";

class ToolStore {
  private readonly tools: Tool[] = [interactTool, grabTool];
  private index: number = $state(0);

  get activeTool(): Tool {
    return this.tools[this.index];
  }

  get color(): number {
    return this.tools[this.index].color;
  }

  cycleNext(): void {
    this.index = (this.index + 1) % this.tools.length;
  }
}

export const toolStore = new ToolStore();
