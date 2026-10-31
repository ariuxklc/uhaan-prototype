/** Soft identity hues (see `[data-hue]` in globals.css). */
export const HUES = ["teal", "amber", "blue", "violet", "rose"] as const;
export type Hue = (typeof HUES)[number];

/**
 * Hue for the item at `index` in its list. Cycling in list order keeps
 * neighbours different, and each item keeps its colour wherever it appears.
 */
export function hueAt(index: number): Hue {
  return HUES[((index % HUES.length) + HUES.length) % HUES.length]!;
}
