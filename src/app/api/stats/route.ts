import { allLaunches, sync } from "@/lib/server/indexer";
import { ethUsd } from "@/lib/server/price";
import { handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    await sync({ wait: allLaunches().length === 0 });
    const ls = allLaunches();
    const now = Date.now() / 1000;
    return json({
      totalLaunches: ls.length,
      launches24h: ls.filter((l) => l.timestamp > now - 86400).length,
      appLaunches: ls.filter((l) => l.viaApp).length,
      ethUsd: await ethUsd(),
    });
  });
}
