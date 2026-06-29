import { textStore } from "$lib/stores/textStore.svelte";

const IGNORE = new Set([
  "Shift",
  "Caps",
  "Ctrl",
  "Win",
  "Alt",
  "AltGr",
  "Fn",
  "Menu",
  "Tab",
]);

export function pressKey(letter: string, shiftActive: boolean): boolean {
  if (letter === "⌫") {
    textStore.value = textStore.value.slice(0, -1);
    return shiftActive;
  }
  if (letter === "Space") {
    textStore.value += " ";
    return shiftActive;
  }
  if (letter === "Enter") {
    textStore.value += "\n";
    return shiftActive;
  }
  if (letter === "Shift") {
    return !shiftActive;
  }
  if (IGNORE.has(letter)) {
    return shiftActive;
  }
  textStore.value += shiftActive ? letter.toUpperCase() : letter;
  return false;
}
