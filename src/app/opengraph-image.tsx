import { ImageResponse } from "next/og";
import { C, Mascot, OG_SIZE, dots, ogFonts } from "@/lib/og";

export const alt = "Kekr: talk to trade, type to launch";
export const size = OG_SIZE;
export const contentType = "image/png";

const PILLS = ["AI trading agent", "Token launchpad", "300+ AI models"];

export default async function Image() {
  const text = "KekrTalk to trade.Type to launch.AI trading agentToken launchpad300+ AI modelskekr.appRobinhood Chain·";
  const fonts = await ogFonts(text);
  return new ImageResponse(
    (
      <div style={{ ...dots, width: "100%", height: "100%", display: "flex", padding: 56, fontFamily: "Display" }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            border: `2px solid #3a3a42`,
            borderRadius: 18,
            background: C.panel,
            boxShadow: `14px 14px 0 0 ${C.acid}`,
            padding: "56px 64px",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 96, color: C.fg, letterSpacing: -4, lineHeight: 1 }}>Kekr</div>
              <div style={{ display: "flex", fontFamily: "Mono", fontSize: 18, color: C.bg, background: C.acid, padding: "6px 12px", borderRadius: 6, marginTop: 14 }}>
                Robinhood Chain
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 68, color: C.fg, letterSpacing: -2, lineHeight: 1.05 }}>Talk to trade.</div>
              <div style={{ display: "flex" }}>
                <div style={{ fontSize: 68, color: C.bg, background: C.acid, padding: "0 14px", letterSpacing: -2, lineHeight: 1.12 }}>Type to launch.</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, fontFamily: "Mono" }}>
              {PILLS.map((p) => (
                <div key={p} style={{ display: "flex", fontSize: 20, color: C.fg, border: `1.5px solid ${C.line}`, background: "#1b1b20", padding: "8px 14px", borderRadius: 8 }}>
                  {p}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
            <Mascot px={18} />
            <div style={{ fontFamily: "Mono", fontSize: 24, color: C.muted }}>kekr.app</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
