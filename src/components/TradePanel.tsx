"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatUnits, parseEther, parseUnits } from "viem";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { tokenAbi } from "@/lib/abis";
import { EXPLORER, robinhoodChain } from "@/lib/config";
import { fmtNum } from "@/lib/format";
import { useTxRunner } from "@/hooks/useTxRunner";
import type { TokenView } from "@/lib/types";

export function TradePanel({ t }: { t: TokenView }) {
  const { address } = useAccount();
  const qc = useQueryClient();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [slip, setSlip] = useState(3);
  const [err, setErr] = useState<string>();
  const { run, status, reset } = useTxRunner();
  const eth = useBalance({ address, chainId: robinhoodChain.id, query: { enabled: !!address } });
  const bal = useReadContract({ address: t.token, abi: tokenAbi, functionName: "balanceOf", args: address ? [address] : undefined, chainId: robinhoodChain.id, query: { enabled: !!address } });

  const valid = (() => {
    try {
      return amount && Number(amount) > 0 && (side === "buy" ? parseEther(amount as `${number}`) : parseUnits(amount, 18)) > 0n;
    } catch {
      return false;
    }
  })();

  const q = useQuery({
    queryKey: ["quote", t.token, side, amount, address],
    enabled: Boolean(valid),
    queryFn: async () => {
      const r = await fetch(`/api/quote?token=${t.token}&side=${side}&amount=${amount}${address ? `&wallet=${address}` : ""}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j as { graduated: boolean; amountOut: string; fees: string; priceImpactBps: string; snipeTaxBps: string };
    },
  });

  async function submit() {
    setErr(undefined);
    reset();
    try {
      const r = await fetch("/api/tx/trade", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: t.token, side, amount, wallet: address, slippageBps: slip * 100 }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      await run(j.txs);
      setAmount("");
      void bal.refetch();
      void eth.refetch();
      void qc.invalidateQueries({ queryKey: ["token", t.token] });
    } catch (e) {
      setErr((e as { shortMessage?: string }).shortMessage || (e as Error).message);
    }
  }

  if (t.live.graduated) {
    return (
      <div className="card p-5 text-sm">
        <div className="font-semibold text-up">🎓 Graduated</div>
        <p className="mt-2 text-muted">Liquidity for ${t.symbol} now lives in a permanently locked Uniswap v4 pool. Trade it on any Uniswap v4-compatible interface on Robinhood Chain.</p>
        <a className="btn btn-ghost mt-4 w-full" href={`${EXPLORER}/token/${t.token}`} target="_blank" rel="noreferrer">View on explorer</a>
      </div>
    );
  }
  if (!t.isNative) return <div className="card p-5 text-sm text-muted">This token is paired with a non-ETH asset. Trading it here is coming soon.</div>;

  const presets = side === "buy" ? ["0.001", "0.005", "0.01", "0.05"] : ["25", "50", "75", "100"];
  const tokenBal = (bal.data as bigint | undefined) ?? 0n;

  return (
    <div className="card p-5">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-panel-2 p-1">
        {(["buy", "sell"] as const).map((s) => (
          <button key={s} onClick={() => { setSide(s); setAmount(""); }} className={`rounded-lg py-2 text-sm font-semibold capitalize ${side === s ? (s === "buy" ? "bg-up text-black" : "bg-down text-black") : "text-muted"}`}>{s}</button>
        ))}
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>{side === "buy" ? "You pay (ETH)" : `You sell ($${t.symbol})`}</span>
          {address && <span>Bal: {side === "buy" ? fmtNum(Number(eth.data?.formatted ?? 0), 4) : fmtNum(Number(formatUnits(tokenBal, 18)))}</span>}
        </div>
        <input className="input text-lg" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.0" />
        <div className="mt-2 grid grid-cols-4 gap-1">
          {presets.map((p) => (
            <button key={p} onClick={() => setAmount(side === "buy" ? p : formatUnits((tokenBal * BigInt(p)) / 100n, 18))} className="rounded-lg border border-line py-1 text-xs text-muted hover:text-fg">{side === "buy" ? p : `${p}%`}</button>
          ))}
        </div>
      </div>
      <div className="mt-4 space-y-1 text-xs">
        <div className="flex justify-between"><span className="text-muted">You receive (est.)</span><span className="mono">{q.data ? (side === "buy" ? `${fmtNum(Number(formatUnits(BigInt(q.data.amountOut), 18)))} $${t.symbol}` : `${Number(formatUnits(BigInt(q.data.amountOut), 18)).toFixed(6)} ETH`) : "-"}</span></div>
        <div className="flex justify-between"><span className="text-muted">Fees</span><span className="mono">{q.data ? `${Number(formatUnits(BigInt(q.data.fees), 18)).toFixed(6)} ETH` : "-"}</span></div>
        <div className="flex justify-between"><span className="text-muted">Price impact</span><span className="mono">{q.data ? `${(Number(q.data.priceImpactBps) / 100).toFixed(2)}%` : "-"}</span></div>
        {q.data && Number(q.data.snipeTaxBps) > 0 && <div className="flex justify-between text-down"><span>Anti-snipe tax</span><span>{Number(q.data.snipeTaxBps) / 100}%</span></div>}
        <div className="flex items-center justify-between"><span className="text-muted">Slippage</span>
          <span className="flex gap-1">{[1, 3, 5, 10].map((s) => <button key={s} onClick={() => setSlip(s)} className={`rounded px-1.5 ${slip === s ? "bg-panel-2 text-fg" : "text-muted"}`}>{s}%</button>)}</span>
        </div>
      </div>
      <div className="mt-4">
        {!address ? <ConnectButton /> : (
          <button onClick={submit} disabled={!valid || status.state === "signing" || status.state === "pending"} className={`btn w-full ${side === "buy" ? "bg-up text-black" : "bg-down text-black"} disabled:opacity-50`}>
            {status.state === "signing" ? `Confirm in wallet (${status.step}/${status.total})` : status.state === "pending" ? "Pending…" : side === "buy" ? `Buy $${t.symbol}` : `Sell $${t.symbol}`}
          </button>
        )}
        {status.state === "done" && <a className="mt-2 block text-center text-xs text-up underline" href={`${EXPLORER}/tx/${status.hash}`} target="_blank" rel="noreferrer">✓ Done — view transaction</a>}
        {(err || q.error) && <p className="mt-2 text-xs text-down">{err || (q.error as Error).message}</p>}
      </div>
    </div>
  );
}
