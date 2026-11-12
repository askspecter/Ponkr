import { ImageResponse } from "next/og";
import { mascotPixels } from "@/lib/mascot";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home screen icon for iOS. */
export default function AppleIcon() {
  const px = 9;
  return new ImageResponse(
    (
      <div style={{ width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: "#e6ff4a" }}>
        <div style={{ position: "relative", width: px * 16, height: px * 16, display: "flex" }}>
          {mascotPixels().map(([x, y, c]) => (
            <div key={`${x}-${y}`} style={{ position: "absolute", left: x * px, top: y * px, width: px, height: px, background: c === "#e6ff4a" ? (y < 3 ? "#0b0b0d" : "#f2ecdf") : c }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
