import "server-only";
import { formatUnits, isAddress, type Address } from "viem";
import { CONTRACTS, NATIVE, PAIR_TOKENS } from "../config";
import { escrowAbi, tokenAbi } from "../abis";
import { marketCapQuote, priceE18, progressPct } from "../math";
import { allLaunches, ensureLaunch, liveStates, refreshViaApp, sync, tradesFor, type Launch, type LiveState } from "./indexer";
import { ethUsd, prices } from "./price";
import { rpc } from "./rpc";

export interface TokenView extends Launch {
  live: LiveState;
  priceEth: number;
  priceUsd: number;
  marketCapEth: number;
  marketCapUsd: number;
  progress: number;
  isNative: boolean;
  volume24hEth?: number;
  change24h?: number;
  trades24h?: number;
}

type Px = { eth: number; btc: number };

/** Converts curve reserves into prices. `priceEth`/`marketCapEth` are in the pair asset's units. */
export function toView(l: Launch, live: LiveState, px: Px | number): TokenView {
  const p = typeof px === "number" ? { eth: px, btc: 0 } : px;
  const q = BigInt(live.quoteReserve), t = BigInt(live.tokenReserve);
  const pair = PAIR_TOKENS[l.pairToken.toLowerCase()];
  const dec = pair?.decimals ?? 18;
  // priceE18 is quote-wei per token scaled 1e18; adjust for the pair's decimals.
  const priceEth = Number(formatUnits(priceE18(q, t), dec));
  const mcEth = Number(formatUnits(marketCapQuote(q, t), dec));
  const isNative = l.pairToken === NATIVE;
  const unitUsd = !pair ? 0 : pair.usd === "eth" ? p.eth : pair.usd === "btc" ? p.btc : pair.usd;
  return {
    ...l,
    live,
    priceEth,
    priceUsd: priceEth * unitUsd,
    marketCapEth: mcEth,
    marketCapUsd: mcEth * unitUsd,
    progress: live.graduated ? 100 : progressPct(BigInt(live.realQuote), BigInt(l.threshold)),
    isNative,
  };
}

export type SortKey = "new" | "latest" | "mcap" | "progress" | "graduated" | "app";

export async function listTokens(opts: { sort?: SortKey; q?: string; limit?: number; offset?: number; creator?: string }) {
  await sync({ wait: allLaunches().length === 0 });
  await refreshViaApp();
  const { q, limit = 50, offset = 0, creator } = opts;
  const sort = !opts.sort || opts.sort === "latest" ? "new" : opts.sort;
  let ls = allLaunches().slice();
  if (q) {
    const s = q.toLowerCase().replace(/^\$/, "");
    ls = ls.filter((l) => l.symbol.toLowerCase().includes(s) || l.name.toLowerCase().includes(s) || l.token.toLowerCase() === s);
  }
  if (creator) ls = ls.filter((l) => l.creator.toLowerCase() === creator.toLowerCase());
  if (sort === "app") ls = ls.filter((l) => l.viaApp);
  const usd = await prices();

  if (sort === "new" || sort === "app") {
    ls.sort((a, b) => Number(BigInt(b.block) - BigInt(a.block)));
    const page = ls.slice(offset, offset + limit);
    const live = await liveStates(page.map((l) => l.curve));
    return { total: ls.length, items: page.map((l) => toView(l, live.get(l.curve.toLowerCase())!, usd)) };
  }
  // Ranking sorts need live state for the candidate set (cached for 60s).
  const live = await liveStates(ls.map((l) => l.curve), 60_000, true);
  let views = ls.map((l) => toView(l, live.get(l.curve.toLowerCase())!, usd));
  if (sort === "graduated") views = views.filter((v) => v.live.graduated);
  if (sort === "progress") views = views.filter((v) => !v.live.graduated).sort((a, b) => b.progress - a.progress);
  else views.sort((a, b) => b.marketCapUsd - a.marketCapUsd);
  return { total: views.length, items: views.slice(offset, offset + limit) };
}

export async function resolveToken(query: string): Promise<Launch | undefined> {
  await sync({ wait: allLaunches().length === 0 });
  if (isAddress(query)) return ensureLaunch(query);
  const s = query.toLowerCase().replace(/^\$/, "");
  const matches = allLaunches().filter((l) => l.symbol.toLowerCase() === s);
  if (!matches.length) return undefined;
  if (matches.length === 1) return matches[0];
  // Ambiguous ticker: pick the largest market cap.
  const live = await liveStates(matches.map((m) => m.curve), 60_000);
  return matches
    .map((m) => ({ m, q: BigInt(live.get(m.curve.toLowerCase())?.realQuote ?? "0") }))
    .sort((a, b) => (b.q > a.q ? 1 : -1))[0].m;
}

export async function tokenDetail(query: string) {
  const l = await resolveToken(query);
  if (!l) return undefined;
  const [live, usd, trades] = await Promise.all([
    liveStates([l.curve], 4_000),
    prices(),
    tradesFor(l),
  ]);
  const view = toView(l, live.get(l.curve.toLowerCase())!, usd);
  const dayAgo = Date.now() / 1000 - 86400;
  const recent = trades.filter((t) => t.timestamp >= dayAgo);
  const dec = PAIR_TOKENS[l.pairToken.toLowerCase()]?.decimals ?? 18;
  view.volume24hEth = recent.reduce((s, t) => s + Number(formatUnits(BigInt(t.quote), dec)), 0);
  view.trades24h = recent.length;
  const firstRecent = recent[0];
  if (firstRecent) {
    const p0 = Number(formatUnits(BigInt(firstRecent.quote), dec)) / Number(formatUnits(BigInt(firstRecent.tokens), 18));
    view.change24h = p0 > 0 ? ((view.priceEth - p0) / p0) * 100 : undefined;
  }
  return { token: view, trades: trades.slice(-200).reverse() };
}

export async function walletHoldings(owner: Address) {
  await sync({ wait: allLaunches().length === 0 });
  const client = rpc();
  const ls = allLaunches();
  const out: { launch: Launch; balance: bigint }[] = [];
  const BATCH = 500;
  for (let i = 0; i < ls.length; i += BATCH) {
    const slice = ls.slice(i, i + BATCH);
    const res = await client.multicall({
      allowFailure: true,
      contracts: slice.map((l) => ({ address: l.token, abi: tokenAbi, functionName: "balanceOf", args: [owner] }) as const),
    });
    res.forEach((r, j) => {
      if (r.status === "success" && (r.result as bigint) > 0n) out.push({ launch: slice[j], balance: r.result as bigint });
    });
  }
  const [eth, usd, live] = await Promise.all([
    client.getBalance({ address: owner }),
    prices(),
    liveStates(out.map((o) => o.launch.curve)),
  ]);
  const positions = out.map((o) => {
    const v = toView(o.launch, live.get(o.launch.curve.toLowerCase())!, usd);
    const amount = Number(formatUnits(o.balance, 18));
    return { token: v, balance: o.balance.toString(), amount, valueEth: amount * v.priceEth, valueUsd: amount * v.priceUsd };
  });
  positions.sort((a, b) => b.valueEth - a.valueEth);
  const ethAmt = Number(formatUnits(eth, 18));
  return {
    address: owner,
    eth: eth.toString(),
    ethUsd: ethAmt * usd.eth,
    positions,
    totalUsd: ethAmt * usd.eth + positions.reduce((s, p) => s + p.valueUsd, 0),
  };
}

export async function creatorFees(owner: Address) {
  await sync({ wait: allLaunches().length === 0 });
  const client = rpc();
  // Launches where owner is creator. The fee recipient can differ; we read it per token.
  const mine = allLaunches().filter((l) => l.creator.toLowerCase() === owner.toLowerCase());
  const [claimableEth, live, usd] = await Promise.all([
    client.readContract({ address: CONTRACTS.feeEscrow, abi: escrowAbi, functionName: "balanceOf", args: [owner] }),
    liveStates(mine.map((m) => m.curve)),
    prices(),
  ]);
  const perToken = mine.length
    ? await client.multicall({
        allowFailure: true,
        contracts: mine.map((m) => ({ address: CONTRACTS.feeEscrow, abi: escrowAbi, functionName: "balanceOfToken", args: [owner, m.token] }) as const),
      })
    : [];
  return {
    address: owner,
    claimableEth: claimableEth.toString(),
    claimableUsd: Number(formatUnits(claimableEth, 18)) * usd.eth,
    tokens: mine.map((m, i) => ({
      token: toView(m, live.get(m.curve.toLowerCase())!, usd),
      claimableTokens: perToken[i]?.status === "success" ? String(perToken[i].result) : "0",
    })),
  };
}
