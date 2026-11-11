"use client";

import { useState } from "react";
import { useAccount, useConfig, useSwitchChain } from "wagmi";
import { sendTransaction, waitForTransactionReceipt } from "wagmi/actions";
import type { Address, Hex } from "viem";
import { robinhoodChain } from "@/lib/config";

export interface TxReq {
  to: Address;
  data: Hex;
  value: string;
  description: string;
}

export type TxStatus = { step: number; total: number; hash?: Hex; state: "idle" | "signing" | "pending" | "done" | "error"; error?: string };

export function useTxRunner() {
  const config = useConfig();
  const { chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [status, setStatus] = useState<TxStatus>({ step: 0, total: 0, state: "idle" });

  async function run(txs: TxReq[]) {
    if (!isConnected) throw new Error("Connect your wallet first");
    try {
      if (chainId !== robinhoodChain.id) await switchChainAsync({ chainId: robinhoodChain.id });
      let last: Hex | undefined;
      for (let i = 0; i < txs.length; i++) {
        setStatus({ step: i + 1, total: txs.length, state: "signing" });
        const hash = await sendTransaction(config, { to: txs[i].to, data: txs[i].data, value: BigInt(txs[i].value), chainId: robinhoodChain.id });
        setStatus({ step: i + 1, total: txs.length, state: "pending", hash });
        const r = await waitForTransactionReceipt(config, { hash, chainId: robinhoodChain.id });
        if (r.status !== "success") throw new Error("Transaction reverted");
        last = hash;
      }
      setStatus({ step: txs.length, total: txs.length, state: "done", hash: last });
      return last;
    } catch (e) {
      const msg = (e as { shortMessage?: string }).shortMessage || (e as Error).message;
      setStatus((s) => ({ ...s, state: "error", error: msg }));
      throw e;
    }
  }

  return { run, status, reset: () => setStatus({ step: 0, total: 0, state: "idle" }) };
}
