import { onMount } from "svelte";
import { registry, type Interactable } from "./stores/registryStore.svelte";

// Register a hitbox-bearing object on mount and unregister on destroy. The id is
// captured once at mount (the bound ref is set by then) and reused for cleanup,
// so teardown never depends on the ref still being readable.
function useRegistration(getId: () => number | undefined, register: (id: number) => void): void {
  onMount(() => {
    const id = getId();
    if (id === undefined) return;
    register(id);
    return () => registry.unregister(id);
  });
}

export function registerHitbox(getId: () => number | undefined): void {
  useRegistration(getId, (id) => registry.registerHitbox(id));
}

export function registerGrabbable(getId: () => number | undefined): void {
  useRegistration(getId, (id) => registry.registerGrabbable(id));
}

// `build` runs at mount, after the ref exists, so interactables can derive their
// callbacks from the live object (e.g. its rest position).
export function registerInteractable(getId: () => number | undefined, build: () => Interactable): void {
  useRegistration(getId, (id) => registry.registerInteractable(id, build()));
}
