import "server-only";

let cached = { eth: Number(process.env.FALLBACK_ETH_USD || 3500), btc: Number(process.env.FALLBACK_BTC_USD || 90000), at: 0 };

async function refresh() {
  if (Date.now() - cached.at < 60_000) return;
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd", {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    const j = (await r.json()) as { ethereum?: { usd?: number }; bitcoin?: { usd?: number } };
    cached = { eth: j.ethereum?.usd ?? cached.eth, btc: j.bitcoin?.usd ?? cached.btc, at: Date.now() };
  } catch {
    cached.at = Date.now() - 30_000; // retry in 30s
  }
}

export async function ethUsd(): Promise<number> {
  await refresh();
  return cached.eth;
}

export async function prices() {
  await refresh();
  return { eth: cached.eth, btc: cached.btc };
}
