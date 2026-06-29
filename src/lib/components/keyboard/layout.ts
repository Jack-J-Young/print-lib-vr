export const rows = [
  {
    letters: "`1234567890-=⌫".split(""),
    sizes: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  },
  {
    letters: [
      "Tab",
      "q",
      "w",
      "e",
      "r",
      "t",
      "y",
      "u",
      "i",
      "o",
      "p",
      "[",
      "]",
      "#",
    ],
    sizes: [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  {
    letters: [
      "Caps",
      "a",
      "s",
      "d",
      "f",
      "g",
      "h",
      "j",
      "k",
      "l",
      ";",
      "'",
      "Enter",
    ],
    sizes: [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
  },
  {
    letters: [
      "Shift",
      "\\",
      "z",
      "x",
      "c",
      "v",
      "b",
      "n",
      "m",
      ",",
      ".",
      "/",
      "Shift",
    ],
    sizes: [1.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75],
  },
  {
    letters: ["Ctrl", "Win", "Alt", "Space", "AltGr", "Fn", "Menu", "Ctrl"],
    sizes: [1.25, 1.25, 1.25, 6.25, 1.25, 1, 1, 1.25],
  },
];

export const rowSpacing = 0.35;

export const totalWidth =
  Math.max(...rows.map((r) => r.sizes.reduce((a, b) => a + b, 0))) * 0.5;

export const totalHeight = rows.length * rowSpacing;

export type KeyRow = {
  letters: string[];
  sizes: number[];
  positions: number[];
  y: number;
};

export function buildRows(
  rows: { letters: string[]; sizes: number[] }[],
  rowSpacing: number,
): KeyRow[] {
  return rows.map((row, rowIndex) => {
    const positions = row.sizes.reduce<number[]>((acc, size, i) => {
      acc.push(
        i === 0 ? size / 2 : acc[i - 1] + row.sizes[i - 1] / 2 + size / 2,
      );
      return acc;
    }, []);
    const y = -rowIndex * rowSpacing;
    return { letters: row.letters, sizes: row.sizes, positions, y };
  });
}
