/**
 * Kekr mascot: a small pixel courier robot with a visor and a coin antenna.
 * Drawn on a 16x16 grid so it stays crisp at any size.
 */
const ROWS = [
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
const COLORS: Record<string, string> = { k: "#0b0b0d", B: "#4d6bff", Y: "#e6ff4a", a: "#e6ff4a", C: "#f2ecdf" };

export function Logo({ className = "" }: { className?: string }) {
  const rects: React.ReactNode[] = [];
  ROWS.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c !== ".") rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={COLORS[c]} />);
    }),
  );
  return (
    <svg viewBox="0 0 16 16" className={className} shapeRendering="crispEdges" aria-hidden>
      {rects}
    </svg>
  );
}
