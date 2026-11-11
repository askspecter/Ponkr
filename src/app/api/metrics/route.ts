import { formatUnits } from "viem";
import { allLaunches, sync } from "@/lib/server/indexer";
import { listTokens } from "@/lib/server/tokens";
import { ethUsd } from "@/lib/server/price";
import { handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    await sync({ wait: allLaunches().length === 0 });
    const ls = allLaunches();
    const now = Date.now() / 1000;
    const days: { day: string; launches: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const start = Math.floor(now / 86400 - i) * 86400;
      days.push({ day: new Date(start * 1000).toISOString().slice(5, 10), launches: ls.filter((l) => l.timestamp >= start && l.timestamp < start + 86400).length });
    }
    const { items } = await listTokens({ sort: "mcap", limit: 1_000_000 });
    const graduated = items.filter((t) => t.live.graduated);
    const raisedEth = items.reduce((s, t) => s + (t.isNative ? Number(formatUnits(BigInt(t.live.graduated ? t.threshold : t.live.realQuote), 18)) : 0), 0);
    return json({
      ethUsd: await ethUsd(),
      totalTokens: ls.length,
      launches24h: ls.filter((l) => l.timestamp > now - 86400).length,
      graduated: graduated.length,
      totalMarketCapUsd: items.reduce((s, t) => s + t.marketCapUsd, 0),
      raisedEth,
      creators: new Set(ls.map((l) => l.creator)).size,
      appLaunches: ls.filter((l) => l.viaApp).length,
      days,
    });
  });
}
