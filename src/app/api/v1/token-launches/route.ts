import { listTokens, type SortKey } from "@/lib/server/tokens";
import { handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Public: GET /api/v1/token-launches?sort=new|mcap|progress|graduated|app&limit=50 */
export async function GET(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const r = await listTokens({ sort: (u.searchParams.get("sort") as SortKey) || "new", limit: Math.min(Number(u.searchParams.get("limit") || 50), 100), offset: Number(u.searchParams.get("offset") || 0), q: u.searchParams.get("q") || undefined });
    return json({
      total: r.total,
      launches: r.items.map((t) => ({
        tokenAddress: t.token, curveAddress: t.curve, name: t.name, symbol: t.symbol, image: t.logo, description: t.description,
        creator: t.creator, launchedAt: t.timestamp, txHash: t.txHash, priceUsd: t.priceUsd, marketCapUsd: t.marketCapUsd,
        bondingProgress: t.progress, graduated: t.live.graduated, socials: t.socials,
      })),
    });
  });
}
