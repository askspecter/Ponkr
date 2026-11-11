// Node-only startup work: warm the launch index and ranking caches in the background
// so first page loads are fast. Imported from instrumentation.ts only on the nodejs runtime.
import { sync } from "./lib/server/indexer";
import { listTokens } from "./lib/server/tokens";

if (!process.env.DISABLE_WARMUP) {
  setTimeout(async () => {
    try {
      await sync({ maxChunks: 200 });
      await listTokens({ sort: "mcap", limit: 1 });
      setInterval(() => void sync({ wait: false }), 15_000);
      setInterval(() => void listTokens({ sort: "mcap", limit: 1 }).catch(() => {}), 60_000);
      console.log("[ponkr] index warm");
    } catch (e) {
      console.error("[ponkr] warmup failed", e);
    }
  }, 1000);
}
