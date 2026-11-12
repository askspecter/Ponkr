import { mascotPixels } from "@/lib/mascot";

/** Kekr mascot, drawn on a 16x16 pixel grid so it stays crisp at any size. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} shapeRendering="crispEdges" aria-hidden>
      {mascotPixels().map(([x, y, c]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={c} />
      ))}
    </svg>
  );
}
