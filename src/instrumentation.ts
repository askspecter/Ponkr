export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.DISABLE_WARMUP) return;
  // Warm the launch index and ranking caches in the background so first page loads are fast.
  setTimeout(async () => {
    try {
      const { sync } = await import("./lib/server/indexer");
      const { listTokens } = await import("./lib/server/tokens");
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
