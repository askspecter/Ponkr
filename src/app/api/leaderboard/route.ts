import { formatUnits } from "viem";
import { listTokens } from "@/lib/server/tokens";
import { handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const { items } = await listTokens({ sort: "mcap", limit: 100000 });
    const top = items.slice(0, 50);
    // Creators ranked by aggregate market cap of the tokens they launched.
    const byCreator = new Map<string, { creator: string; launches: number; marketCapUsd: number; raisedEth: number; best?: string }>();
    for (const t of items) {
      const c = byCreator.get(t.creator) ?? { creator: t.creator, launches: 0, marketCapUsd: 0, raisedEth: 0 };
      c.launches++;
      c.marketCapUsd += t.marketCapUsd;
      c.raisedEth += t.isNative ? Number(formatUnits(BigInt(t.live.graduated ? t.threshold : t.live.realQuote), 18)) : 0;
      if (!c.best) c.best = t.symbol;
      byCreator.set(t.creator, c);
    }
    const creators = [...byCreator.values()].sort((a, b) => b.marketCapUsd - a.marketCapUsd).slice(0, 50);
    return json({ tokens: top, creators });
  });
}
