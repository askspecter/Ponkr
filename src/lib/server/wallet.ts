import "server-only";
import { decodeEventLog, formatUnits, type Address, type Hex } from "viem";
import { curveAbi } from "../abis";
import { prices } from "./price";
import { getLogsAdaptive, rpc, type RawLog } from "./rpc";
import { walletHoldings } from "./tokens";

const BUY = "0xec36bf571f136799e8dc0b0b8bea4b04d8bd3d43de838aab0d5fc21d4cbfc455" as Hex;
const SELL = "0x8113d738abdcb6b38357e9d53a54a7157861a09031b453651f0fe7fe151f59df" as Hex;
const WINDOW = 9_999_000n;

export interface WalletActivity {
  side: "buy" | "sell";
  token: Address;
  symbol: string;
  name: string;
  logo: string;
  eth: number;
  tokens: number;
  timestamp: number;
  txHash: string;
}

const cache = new Map<string, { at: number; data: Awaited<ReturnType<typeof build>> }>();

/** Runs async tasks with limited concurrency. */
async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

async function build(owner: Address) {
  const holdings = await walletHoldings(owner);
  const client = rpc();
  const head = await client.getBlockNumber();
  // Estimate timestamps from the average block time instead of fetching every block.
  const [hb, pb] = await Promise.all([client.getBlock({ blockNumber: head }), client.getBlock({ blockNumber: head - 1_000_000n })]);
  const secPerBlock = Number(hb.timestamp - pb.timestamp) / 1_000_000;
  const tsOf = (b: bigint) => Math.round(Number(hb.timestamp) - Number(head - b) * secPerBlock);

  const ownerTopic = ("0x" + owner.slice(2).toLowerCase().padStart(64, "0")) as Hex;
  const { eth: ethUsd } = await prices();

  const perToken = await pool(holdings.positions.slice(0, 40), 6, async (p) => {
    // The RPC accepts up to 10M blocks per single-address query, so walk the range in windows.
    const logs: RawLog[] = [];
    for (let from = BigInt(p.token.block); from <= head; from += WINDOW) {
      const to = from + WINDOW - 1n > head ? head : from + WINDOW - 1n;
      try {
        // One value per topic position keeps the 10M block allowance (OR filters drop it to 100k).
        const [b, s] = await Promise.all([BUY, SELL].map((t) => getLogsAdaptive({ address: p.token.curve, topics: [t, null, ownerTopic] }, from, to)));
        logs.push(...b, ...s);
      } catch {
        /* skip a failed window */
      }
    }
    const acts: WalletActivity[] = [];
    let buyEth = 0, buyTok = 0, sellEth = 0, sellTok = 0;
    for (const l of logs) {
      try {
        const d = decodeEventLog({ abi: curveAbi, data: l.data, topics: l.topics });
        const isBuy = d.eventName === "CurveBuy";
        const a = d.args as { quoteIn?: bigint; tokensOut?: bigint; tokensIn?: bigint; quoteOut?: bigint };
        const eth = Number(formatUnits((isBuy ? a.quoteIn : a.quoteOut) ?? 0n, 18));
        const tok = Number(formatUnits((isBuy ? a.tokensOut : a.tokensIn) ?? 0n, 18));
        if (isBuy) { buyEth += eth; buyTok += tok; } else { sellEth += eth; sellTok += tok; }
        acts.push({ side: isBuy ? "buy" : "sell", token: p.token.token, symbol: p.token.symbol, name: p.token.name, logo: p.token.logo, eth, tokens: tok, timestamp: tsOf(l.blockNumber), txHash: l.transactionHash });
      } catch {
        /* other event */
      }
    }
    // PnL over the trades we can see: value now plus ETH taken out, minus ETH put in.
    const pnl = buyTok > 0 && p.token.isNative
      ? (() => {
          const pnlEth = p.valueEth + sellEth - buyEth;
          return { pnlUsd: pnlEth * ethUsd, pnlPct: buyEth > 0 ? (pnlEth / buyEth) * 100 : 0, costUsd: buyEth * ethUsd };
        })()
      : null;
    return { pnl, acts, sellTok };
  });

  const positions = holdings.positions.map((p, i) => ({ ...p, pnl: perToken[i]?.pnl ?? null }));
  const activity = perToken.flatMap((t) => t?.acts ?? []).sort((a, b) => b.timestamp - a.timestamp).slice(0, 200);
  const ethAmt = Number(formatUnits(BigInt(holdings.eth), 18));
  return {
    address: owner,
    ethUsdPrice: ethUsd,
    eth: { amount: ethAmt, valueUsd: holdings.ethUsd },
    positions,
    activity,
    totalUsd: holdings.totalUsd,
    totalPnlUsd: positions.reduce((s, p) => s + (p.pnl?.pnlUsd ?? 0), 0),
  };
}

export async function walletOverview(owner: Address) {
  const key = owner.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 15_000) return hit.data;
  const data = await build(owner);
  cache.set(key, { at: Date.now(), data });
  return data;
}
