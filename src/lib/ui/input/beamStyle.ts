import { grabTool } from "./tools/GrabTool.svelte";
import { interactTool } from "./tools/InteractTool.svelte";
import { TOOL_COLORS } from "./tools/colors";

// Controller beam / hit-marker colour from the current tool state. Reads tool
// $state, so calling it inside markup stays reactive.
export function controllerBeamColor(): number {
  if (grabTool.isActive) return TOOL_COLORS.grab;
  if (interactTool.isHovering) return TOOL_COLORS.interact;
  return TOOL_COLORS.idle;
}

export function controllerActive(): boolean {
  return grabTool.isActive || interactTool.isActive;
}
