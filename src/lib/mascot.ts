/**
 * Kekr mascot: a pixel courier robot with a visor and a coin antenna, on a 16x16 grid.
 * Shared by the in-app logo, the favicon and the social share images.
 */
export const MASCOT_ROWS = [
  "......aa........",
  ".....aYYa.......",
  "......aa........",
  ".......k........",
  "..kkkkkkkkkkkk..",
  ".kBBBBBBBBBBBBk.",
  ".kBkkkkkkkkkkBk.",
  ".kBkYYkkkkYYkBk.",
  ".kBkYYkkkkYYkBk.",
  ".kBkkkkkkkkkkBk.",
  ".kBBBBBBBBBBBBk.",
  ".kBBBkYYYYkBBBk.",
  ".kBBBBBBBBBBBBk.",
  "..kkkkkkkkkkkk..",
  "...kCk....kCk...",
  "...kkk....kkk...",
];

export const MASCOT_COLORS: Record<string, string> = { k: "#0b0b0d", B: "#4d6bff", Y: "#e6ff4a", a: "#e6ff4a", C: "#f2ecdf" };

/** Every filled pixel as [x, y, color]. */
export function mascotPixels(): [number, number, string][] {
  const out: [number, number, string][] = [];
  MASCOT_ROWS.forEach((row, y) => [...row].forEach((c, x) => c !== "." && out.push([x, y, MASCOT_COLORS[c]])));
  return out;
}
