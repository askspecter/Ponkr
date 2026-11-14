import "server-only";
import { createPublicClient, http, toHex, type Address, type Hex, type PublicClient } from "viem";
import { RPC_URL, robinhoodChain } from "../config";

export const SERVER_RPC = process.env.RPC_URL || RPC_URL;

let client: PublicClient | undefined;

export function rpc(): PublicClient {
  if (!client) {
    client = createPublicClient({
      chain: robinhoodChain,
      transport: http(SERVER_RPC, {
        retryCount: 5,
        retryDelay: 600,
        batch: { batchSize: 50, wait: 10 },
      }),
      batch: { multicall: { batchSize: 4096, wait: 10 } },
    }) as PublicClient;
  }
  return client;
}

export async function withRetry<T>(fn: () => Promise<T>, tries = 5): Promise<T> {
  let err: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      err = e;
      await new Promise((r) => setTimeout(r, 500 * 2 ** i));
    }
  }
  throw err;
}

export interface RawLog {
  address: Address;
  topics: [Hex, ...Hex[]];
  data: Hex;
  blockNumber: bigint;
  transactionHash: Hex;
  logIndex: number;
}

interface RpcLog {
  address: Address;
  topics: Hex[];
  data: Hex;
  blockNumber: Hex;
  transactionHash: Hex;
  logIndex: Hex;
}

/**
 * Raw eth_getLogs (viem's getLogs ignores a plain `topics` filter) that splits the block
 * range when the RPC rejects it for matching too many logs.
 */
export async function getLogsAdaptive(filter: { address: Address; topics?: (Hex | Hex[] | null)[] }, fromBlock: bigint, toBlock: bigint): Promise<RawLog[]> {
  try {
    const res = await withRetry(
      () =>
        rpc().request({
          method: "eth_getLogs",
          params: [{ address: filter.address, topics: filter.topics as Hex[] | undefined, fromBlock: toHex(fromBlock), toBlock: toHex(toBlock) }],
        }) as Promise<RpcLog[]>,
      3,
    );
    return res.map((l) => ({
      address: l.address,
      topics: l.topics as [Hex, ...Hex[]],
      data: l.data,
      blockNumber: BigInt(l.blockNumber),
      transactionHash: l.transactionHash,
      logIndex: Number(l.logIndex),
    }));
  } catch (e) {
    const msg = String((e as { details?: string }).details ?? (e as Error).message);
    if (toBlock > fromBlock && /exceed|too many logs|limit of|range/i.test(msg)) {
      const mid = fromBlock + (toBlock - fromBlock) / 2n;
      const a = await getLogsAdaptive(filter, fromBlock, mid);
      const b = await getLogsAdaptive(filter, mid + 1n, toBlock);
      return [...a, ...b];
    }
    throw e;
  }
}
