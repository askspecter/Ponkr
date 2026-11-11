import { listTokens, type SortKey } from "@/lib/server/tokens";
import { handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const r = await listTokens({
      sort: (u.searchParams.get("sort") as SortKey) || "new",
      q: u.searchParams.get("q") || undefined,
      creator: u.searchParams.get("creator") || undefined,
      limit: Math.min(Number(u.searchParams.get("limit") || 50), 100),
      offset: Number(u.searchParams.get("offset") || 0),
    });
    return json(r);
  });
}
