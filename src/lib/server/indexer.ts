import "server-only";
import { decodeAbiParameters, decodeEventLog, encodeAbiParameters, encodeFunctionData, getAddress, hexToBigInt, keccak256, parseAbi, type Address, type Hex } from "viem";
import { factoryAbi, launchedTokenPrefix, tokenAbi, curveAbi } from "../abis";
import { CONTRACTS, GRADUATED_TICK_SPACING, LOG_CHUNK, LOOKBACK_BLOCKS, NATIVE, START_BLOCK, TOKEN_LAUNCHED_TOPIC } from "../config";
import { getLogsAdaptive, rpc, withRetry, type RawLog } from "./rpc";
import { load, save } from "./store";

export interface Launch {
  token: Address;
  curve: Address;
  creator: Address;
  pairToken: Address;
  configId: string;
  threshold: string;
  block: string;
  txHash: string;
  timestamp: number;
  name: string;
  symbol: string;
  logo: string;
  description: string;
  socials: { twitter: string; telegram: string; discord: string; website: string; farcaster: string };
  /** Launched through this app (web, agent, API, socials). */
  viaApp?: boolean;
}

interface IndexState {
  lastBlock: string;
  launches: Launch[];
}

const EMPTY: IndexState = { lastBlock: START_BLOCK !== undefined ? (START_BLOCK - 1n).toString() : "auto", launches: [] };

let syncing: Promise<void> | null = null;
let lastSync = 0;

export function state(): IndexState {
  return load<IndexState>("launches", EMPTY);
}

export function allLaunches(): Launch[] {
  return state().launches;
}

let byAddr: { n: number; m: Map<string, Launch> } = { n: -1, m: new Map() };

export function findLaunch(tokenOrCurve: string): Launch | undefined {
  const ls = state().launches;
  if (byAddr.n !== ls.length) {
    const m = new Map<string, Launch>();
    for (const l of ls) {
      m.set(l.token.toLowerCase(), l);
      m.set(l.curve.toLowerCase(), l);
    }
    byAddr = { n: ls.length, m };
  }
  const a = tokenOrCurve.toLowerCase();
  return byAddr.m.get(a) ?? extra().find((l) => l.token.toLowerCase() === a || l.curve.toLowerCase() === a);
}

/** Tokens outside the indexed window that were looked up on demand. */
function extra() {
  return load<Launch[]>("launches-extra", []);
}


/** Resolves any launchpad token by address directly from the chain (for tokens older than the index window). */
export async function ensureLaunch(token: Address): Promise<Launch | undefined> {
  const hit = findLaunch(token);
  if (hit) return hit;
  const client = rpc();
  let rec: readonly unknown[];
  try {
    const raw = await client.call({ to: CONTRACTS.factory, data: encodeFunctionData({ abi: parseAbi(["function getLaunchedToken(address) view returns (uint256)"]), args: [token] }) });
    if (!raw.data || raw.data.length < 2 + 64 * 6) return undefined;
    rec = decodeAbiParameters(launchedTokenPrefix, raw.data);
  } catch {
    return undefined;
  }
  const [tok, curve, creator, , pairToken, threshold] = rec as [Address, Address, Address, Address, Address, bigint];
  if (tok.toLowerCase() !== token.toLowerCase() || curve === NATIVE) return undefined;
  // Find the TokenLaunched event (token is an indexed topic), scanning back in 10M-block windows.
  const head = await client.getBlockNumber();
  const tokenTopic = ("0x" + tok.slice(2).toLowerCase().padStart(64, "0")) as Hex;
  let launchLog: RawLog | undefined;
  for (let to = head; to > 0n && !launchLog; to -= 10_000_000n) {
    const from = to > 9_999_999n ? to - 9_999_999n : 0n;
    const logs = await getLogsAdaptive({ address: CONTRACTS.factory, topics: [TOKEN_LAUNCHED_TOPIC, tokenTopic] }, from, to);
    if (logs.length) launchLog = logs[0];
  }
  const mint = launchLog;
  const meta = (await metadata([tok])).get(tok.toLowerCase());
  const block = mint?.blockNumber ?? head;
  const b = await client.getBlock({ blockNumber: block });
  const l: Launch = {
    token: getAddress(tok), curve: getAddress(curve), creator: getAddress(creator), pairToken: getAddress(pairToken),
    configId: "0", threshold: threshold.toString(), block: block.toString(), txHash: mint?.transactionHash ?? "",
    timestamp: Number(b.timestamp), name: meta?.name ?? "Unknown", symbol: meta?.symbol ?? "???", logo: meta?.logo ?? "",
    description: meta?.description ?? "", socials: meta?.socials ?? { twitter: "", telegram: "", discord: "", website: "", farcaster: "" },
  };
  const ex = extra();
  ex.push(l);
  save("launches-extra", ex.slice(-5000));
  return l;
}

export function markViaApp(token: string) {
  const s = state();
  const l = s.launches.find((x) => x.token.toLowerCase() === token.toLowerCase());
  if (l) {
    l.viaApp = true;
    save("launches", s);
  } else {
    const pending = load<string[]>("app-launches", []);
    pending.push(token.toLowerCase());
    save("app-launches", pending);
  }
}

async function metadata(tokens: Address[]) {
  const client = rpc();
  const out = new Map<string, Pick<Launch, "name" | "symbol" | "logo" | "description" | "socials">>();
  const BATCH = 150;
  for (let i = 0; i < tokens.length; i += BATCH) {
    const slice = tokens.slice(i, i + BATCH);
    const res = await withRetry(() =>
      client.multicall({
        allowFailure: true,
        contracts: slice.flatMap((t) => [
          { address: t, abi: tokenAbi, functionName: "name" } as const,
          { address: t, abi: tokenAbi, functionName: "symbol" } as const,
          { address: t, abi: tokenAbi, functionName: "getTokenInfo" } as const,
        ]),
      }),
    );
    slice.forEach((t, j) => {
      const [n, s, info] = res.slice(j * 3, j * 3 + 3);
      const i3 = info.status === "success" ? (info.result as readonly [Address, string, string, Launch["socials"]]) : undefined;
      out.set(t.toLowerCase(), {
        name: n.status === "success" ? String(n.result) : "Unknown",
        symbol: s.status === "success" ? String(s.result) : "???",
        logo: i3?.[1] ?? "",
        description: i3?.[2] ?? "",
        socials: i3?.[3]
          ? { twitter: i3[3].twitter, telegram: i3[3].telegram, discord: i3[3].discord, website: i3[3].website, farcaster: i3[3].farcaster }
          : { twitter: "", telegram: "", discord: "", website: "", farcaster: "" },
      });
    });
  }
  return out;
}

async function doSync(maxChunks: number) {
  const client = rpc();
  const s = state();
  const head = await withRetry(() => client.getBlockNumber());
  if (s.lastBlock === "auto") s.lastBlock = (head > LOOKBACK_BLOCKS ? head - LOOKBACK_BLOCKS : 0n).toString();
  let from = BigInt(s.lastBlock) + 1n;
  let chunks = 0;
  const appTokens = new Set(load<string[]>("app-launches", []));

  while (from <= head && chunks < maxChunks) {
    const to = from + LOG_CHUNK - 1n > head ? head : from + LOG_CHUNK - 1n;
    const logs = await getLogsAdaptive({ address: CONTRACTS.factory, topics: [TOKEN_LAUNCHED_TOPIC] }, from, to);
    const launchedLogs = logs.filter((l) => l.topics[0] === TOKEN_LAUNCHED_TOPIC);

    if (launchedLogs.length) {
      // Interpolate timestamps from the chunk's boundary blocks (2 calls per chunk).
      const minB = launchedLogs[0].blockNumber!;
      const maxB = launchedLogs[launchedLogs.length - 1].blockNumber!;
      const [b0, b1] = await Promise.all([
        withRetry(() => client.getBlock({ blockNumber: minB })),
        withRetry(() => client.getBlock({ blockNumber: maxB })),
      ]);
      const span = Number(maxB - minB) || 1;
      const tsAt = (b: bigint) =>
        Number(b0.timestamp) + ((Number(b1.timestamp) - Number(b0.timestamp)) * Number(b - minB)) / span;

      const decoded = launchedLogs.map((l) => {
        const d = decodeEventLog({ abi: factoryAbi, data: l.data, topics: l.topics, eventName: "TokenLaunched" });
        const a = d.args as { token: Address; curve: Address; creator: Address; pairToken: Address; launchConfigId: bigint; graduationThreshold: bigint };
        return { l, a };
      });
      const meta = await metadata(decoded.map((d) => d.a.token));
      for (const { l, a } of decoded) {
        const m = meta.get(a.token.toLowerCase());
        s.launches.push({
          token: getAddress(a.token),
          curve: getAddress(a.curve),
          creator: getAddress(a.creator),
          pairToken: getAddress(a.pairToken),
          configId: a.launchConfigId.toString(),
          threshold: a.graduationThreshold.toString(),
          block: l.blockNumber!.toString(),
          txHash: l.transactionHash!,
          timestamp: Math.round(tsAt(l.blockNumber!)),
          name: m?.name ?? "Unknown",
          symbol: m?.symbol ?? "???",
          logo: m?.logo ?? "",
          description: m?.description ?? "",
          socials: m?.socials ?? { twitter: "", telegram: "", discord: "", website: "", farcaster: "" },
          viaApp: appTokens.has(a.token.toLowerCase()) || undefined,
        });
      }
    }
    s.lastBlock = to.toString();
    from = to + 1n;
    chunks++;
  }
  save("launches", s);
}

/**
 * Incremental sync. Cheap to call on every request: throttled and de-duplicated.
 * The first run back-fills from INDEXER_START_BLOCK (use `npm run indexer` to pre-warm).
 */
export async function sync(opts: { maxChunks?: number; minIntervalMs?: number; wait?: boolean } = {}) {
  const { maxChunks = 80, minIntervalMs = 8_000, wait = true } = opts;
  if (!syncing && Date.now() - lastSync > minIntervalMs) {
    lastSync = Date.now();
    syncing = doSync(maxChunks)
      .catch((e) => console.error("indexer sync failed", e))
      .finally(() => {
        syncing = null;
      });
  }
  if (wait && syncing) await syncing;
}

// ---- Live curve state -------------------------------------------------------

export interface LiveState {
  quoteReserve: string;
  tokenReserve: string;
  realQuote: string;
  graduated: boolean;
  feeBps: string;
  creatorTaxBps: string;
  /** True when quote/token reserves encode the Uniswap v4 pool price (graduated tokens). */
  poolPrice?: boolean;
}

const liveCache = new Map<string, { at: number; v: LiveState }>();

const refreshing = new Set<string>();

/**
 * Batched curve reads via multicall. With `swr`, cached-but-stale entries are returned
 * immediately and refreshed in the background (used for big ranking scans).
 */
export async function liveStates(curves: Address[], maxAgeMs = 15_000, swr = false): Promise<Map<string, LiveState>> {
  const out = new Map<string, LiveState>();
  const missing: Address[] = [];
  const stale: Address[] = [];
  for (const c of curves) {
    const hit = liveCache.get(c.toLowerCase());
    if (hit && Date.now() - hit.at < maxAgeMs) out.set(c.toLowerCase(), hit.v);
    else if (hit && swr) {
      out.set(c.toLowerCase(), hit.v);
      if (!refreshing.has(c.toLowerCase())) stale.push(c);
    } else missing.push(c);
  }
  if (stale.length) {
    stale.forEach((c) => refreshing.add(c.toLowerCase()));
    void fetchLive(stale).finally(() => stale.forEach((c) => refreshing.delete(c.toLowerCase())));
  }
  if (missing.length) for (const [k, v] of await fetchLive(missing)) out.set(k, v);
  return out;
}

async function fetchLive(stale: Address[]): Promise<Map<string, LiveState>> {
  const out = new Map<string, LiveState>();
  const client = rpc();
  const BATCH = 200;
  for (let i = 0; i < stale.length; i += BATCH) {
    const slice = stale.slice(i, i + BATCH);
    const res = await withRetry(() =>
      client.multicall({
        allowFailure: true,
        contracts: slice.flatMap((c) => [
          { address: c, abi: curveAbi, functionName: "getReserves" } as const,
          { address: c, abi: curveAbi, functionName: "realQuoteReserve" } as const,
          { address: c, abi: curveAbi, functionName: "graduated" } as const,
          { address: c, abi: curveAbi, functionName: "feeBps" } as const,
          { address: c, abi: curveAbi, functionName: "creatorTaxBps" } as const,
        ]),
      }),
    );
    slice.forEach((c, j) => {
      const [r, rq, g, f, t] = res.slice(j * 5, j * 5 + 5);
      const reserves = r.status === "success" ? (r.result as readonly [bigint, bigint]) : [0n, 0n];
      const v: LiveState = {
        quoteReserve: reserves[0].toString(),
        tokenReserve: reserves[1].toString(),
        realQuote: rq.status === "success" ? String(rq.result) : "0",
        graduated: g.status === "success" ? Boolean(g.result) : false,
        feeBps: f.status === "success" ? String(f.result) : "100",
        creatorTaxBps: t.status === "success" ? String(t.result) : "0",
      };
      liveCache.set(c.toLowerCase(), { at: Date.now(), v });
      out.set(c.toLowerCase(), v);
    });
    await applyPoolPrices(slice.filter((c) => out.get(c.toLowerCase())?.graduated), out);
  }
  return out;
}

const extsloadAbi = parseAbi(["function extsload(bytes32 slot) view returns (bytes32)"]);
const POOLS_SLOT = 6n; // PoolManager._pools mapping slot
const Q192 = 1n << 192n;

/** Graduated tokens trade in a Uniswap v4 pool; read sqrtPriceX96 from PoolManager storage. */
async function applyPoolPrices(curves: Address[], out: Map<string, LiveState>) {
  const items = curves.map((c) => ({ c, l: findLaunch(c) })).filter((x): x is { c: Address; l: Launch } => !!x.l);
  if (!items.length) return;
  const slots = items.map(({ l }) => {
    const pairFirst = BigInt(l.pairToken) < BigInt(l.token);
    const [c0, c1] = pairFirst ? [l.pairToken, l.token] : [l.token, l.pairToken];
    const id = keccak256(encodeAbiParameters([{ type: "address" }, { type: "address" }, { type: "uint24" }, { type: "int24" }, { type: "address" }], [c0, c1, 0, GRADUATED_TICK_SPACING, CONTRACTS.hook]));
    return { pairFirst, slot: keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "uint256" }], [id, POOLS_SLOT])) };
  });
  const res = await withRetry(() =>
    rpc().multicall({ allowFailure: true, contracts: slots.map((s) => ({ address: CONTRACTS.poolManager, abi: extsloadAbi, functionName: "extsload", args: [s.slot] }) as const) }),
  );
  items.forEach(({ c }, i) => {
    const r = res[i];
    if (r.status !== "success") return;
    const sp = hexToBigInt(r.result as Hex) & ((1n << 160n) - 1n);
    if (sp === 0n) return;
    const v = out.get(c.toLowerCase())!;
    // priceE18(q, t) = q * 1e18 / t, so encode the pool price as a reserve ratio.
    const sp2 = sp * sp;
    Object.assign(v, slots[i].pairFirst ? { quoteReserve: Q192.toString(), tokenReserve: sp2.toString() } : { quoteReserve: sp2.toString(), tokenReserve: Q192.toString() }, { poolPrice: true });
  });
}

// ---- Trades -------------------------------------------------------------------

export interface Trade {
  side: "buy" | "sell";
  trader: Address;
  quote: string; // wei
  tokens: string; // wei
  fee: string;
  tax: string;
  block: string;
  txHash: string;
  timestamp: number;
}

interface TradeCache {
  lastBlock: string;
  trades: Trade[];
}
const tradeMem = new Map<string, TradeCache>();
const tradeSyncing = new Map<string, Promise<void>>();
const tradeLastSync = new Map<string, number>();

export async function tradesFor(launch: Launch, opts: { maxChunks?: number } = {}): Promise<Trade[]> {
  const key = launch.curve.toLowerCase();
  let tc = tradeMem.get(key) ?? load<TradeCache>(`trades-${key}`, { lastBlock: (BigInt(launch.block) - 1n).toString(), trades: [] });
  tradeMem.set(key, tc);

  if (!tradeSyncing.has(key) && Date.now() - (tradeLastSync.get(key) ?? 0) > 4_000) {
    tradeLastSync.set(key, Date.now());
    const p = (async () => {
      const client = rpc();
      const head = await withRetry(() => client.getBlockNumber());
      let from = BigInt(tc.lastBlock) + 1n;
      let n = 0;
      while (from <= head && n < (opts.maxChunks ?? 60)) {
        const to = from + LOG_CHUNK - 1n > head ? head : from + LOG_CHUNK - 1n;
        const logs = await getLogsAdaptive({ address: launch.curve }, from, to);
        const decoded: Trade[] = [];
        for (const l of logs) {
          try {
            const d = decodeEventLog({ abi: curveAbi, data: l.data, topics: l.topics });
            if (d.eventName === "CurveBuy") {
              const a = d.args;
              decoded.push({ side: "buy", trader: a.recipient, quote: a.quoteIn.toString(), tokens: a.tokensOut.toString(), fee: a.fee.toString(), tax: a.tax.toString(), block: l.blockNumber!.toString(), txHash: l.transactionHash!, timestamp: 0 });
            } else if (d.eventName === "CurveSell") {
              const a = d.args;
              decoded.push({ side: "sell", trader: a.seller, quote: a.quoteOut.toString(), tokens: a.tokensIn.toString(), fee: a.fee.toString(), tax: a.tax.toString(), block: l.blockNumber!.toString(), txHash: l.transactionHash!, timestamp: 0 });
            }
          } catch {
            /* other events */
          }
        }
        if (decoded.length) {
          const b0 = BigInt(decoded[0].block), b1 = BigInt(decoded[decoded.length - 1].block);
          const [x0, x1] = await Promise.all([
            withRetry(() => client.getBlock({ blockNumber: b0 })),
            withRetry(() => client.getBlock({ blockNumber: b1 })),
          ]);
          const span = Number(b1 - b0) || 1;
          for (const t of decoded) {
            t.timestamp = Math.round(Number(x0.timestamp) + ((Number(x1.timestamp) - Number(x0.timestamp)) * Number(BigInt(t.block) - b0)) / span);
          }
        }
        tc = { lastBlock: to.toString(), trades: tc.trades.concat(decoded) };
        tradeMem.set(key, tc);
        from = to + 1n;
        n++;
      }
      save(`trades-${key}`, tc);
    })()
      .catch((e) => console.error("trade sync failed", e))
      .finally(() => tradeSyncing.delete(key));
    tradeSyncing.set(key, p);
  }
  await tradeSyncing.get(key);
  return tradeMem.get(key)!.trades;
}
