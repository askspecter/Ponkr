import { ImageResponse } from "next/og";
import { logoUrls } from "@/lib/config";
import { fmtNum } from "@/lib/format";
import { C, Mascot, OG_SIZE, dots, ogFonts } from "@/lib/og";
import { tokenSummary } from "@/lib/server/tokens";

export const runtime = "nodejs";
export const alt = "Token on Kekr";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

const usd = (n: number) => (n >= 1 ? "$" + fmtNum(n) : n > 0 ? "$" + n.toPrecision(3) : "n/a");

async function logoDataUrl(uri: string) {
  for (const url of logoUrls(uri).slice(0, 2)) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(3500) });
      const type = r.headers.get("content-type") || "";
      if (!r.ok || !/^image\/(png|jpe?g|gif|webp)/.test(type)) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 4 * 1024 * 1024) continue;
      return `data:${type};base64,${buf.toString("base64")}`;
    } catch {
      /* try the next gateway */
    }
  }
  return undefined;
}

export default async function Image({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const t = await Promise.race([tokenSummary(address), new Promise<undefined>((r) => setTimeout(() => r(undefined), 8000))]).catch(() => undefined);

  if (!t) {
    const fonts = await ogFonts("KekrToken on Kekrkekr.app");
    return new ImageResponse(
      (
        <div style={{ ...dots, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 48, fontFamily: "Display" }}>
          <Mascot px={16} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 96, color: C.fg }}>Kekr</div>
            <div style={{ fontFamily: "Mono", fontSize: 28, color: C.muted }}>kekr.app</div>
          </div>
        </div>
      ),
      { ...size, fonts },
    );
  }

  const logo = await logoDataUrl(t.logo);
  const name = t.name.length > 22 ? t.name.slice(0, 21) + "…" : t.name;
  const cells = 24;
  const filled = t.live.graduated ? cells : Math.round((t.progress / 100) * cells);
  const stats: [string, string][] = [
    ["Market cap", usd(t.marketCapUsd)],
    ["Price", usd(t.priceUsd)],
    ["Bonded", t.live.graduated ? "Graduated" : `${t.progress.toFixed(1)}%`],
  ];
  const text = `${name}$${t.symbol}${stats.flat().join("")}Trade on Kekrkekr.app0123456789.,$%…GraduatedBondedMarket capPriceRobinhood Chain`;
  const fonts = await ogFonts(text);

  return new ImageResponse(
    (
      <div style={{ ...dots, width: "100%", height: "100%", display: "flex", padding: 56, fontFamily: "Display" }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            border: "2px solid #3a3a42",
            borderRadius: 18,
            background: C.panel,
            boxShadow: `14px 14px 0 0 ${C.acid}`,
            padding: "48px 56px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
            {logo ? (
              <img src={logo} width={168} height={168} style={{ borderRadius: 16, objectFit: "cover", border: `2px solid ${C.line}` }} alt="" />
            ) : (
              <div style={{ width: 168, height: 168, borderRadius: 16, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Mono", fontSize: 56, color: C.bg }}>
                {t.symbol.slice(0, 3)}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 76, color: C.fg, letterSpacing: -3, lineHeight: 1 }}>{name}</div>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ fontFamily: "Mono", fontSize: 32, color: C.muted }}>{`$${t.symbol}`}</div>
                <div style={{ display: "flex", fontFamily: "Mono", fontSize: 18, color: C.bg, background: C.acid, padding: "5px 10px", borderRadius: 6 }}>Robinhood Chain</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 0, border: `1.5px solid ${C.line}`, borderRadius: 12 }}>
            {stats.map(([k, v], i) => (
              <div key={k} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, padding: "20px 26px", borderLeft: i ? `1.5px solid ${C.line}` : "none" }}>
                <div style={{ fontFamily: "Mono", fontSize: 18, color: C.muted, textTransform: "uppercase", letterSpacing: 2 }}>{k}</div>
                <div style={{ fontSize: 44, color: i === 2 && t.live.graduated ? C.up : C.fg }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div style={{ display: "flex", flex: 1, gap: 5 }}>
              {Array.from({ length: cells }).map((_, i) => (
                <div key={i} style={{ flex: 1, height: 16, borderRadius: 2, background: i < filled ? (t.live.graduated ? C.up : C.acid) : "#1f1f25" }} />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Mascot px={4} />
              <div style={{ fontFamily: "Mono", fontSize: 24, color: C.fg }}>Trade on kekr.app</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
