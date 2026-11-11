"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { TokenAvatar } from "@/components/TokenBits";
import { useTxRunner } from "@/hooks/useTxRunner";
import { EXPLORER } from "@/lib/config";
import { fmtNum, fmtUsd } from "@/lib/format";
import type { TokenView } from "@/lib/types";

interface F { claimableEth: string; claimableUsd: number; tokens: { token: TokenView; claimableTokens: string }[] }

export default function Fees() {
  const { address } = useAccount();
  const { run, status } = useTxRunner();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["fees", address],
    enabled: !!address,
    queryFn: async () => (await (await fetch(`/api/fees/${address}`)).json()) as F,
    refetchInterval: 30_000,
  });
  async function act(kind: "claim" | "sweep" | "claimToken", token?: string) {
    const r = await fetch("/api/tx/claim", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, token }) });
    const j = await r.json();
    if (!r.ok) return alert(j.error);
    await run(j.txs).catch(() => {});
    void refetch();
  }
  if (!address) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Creator fees</h1>
        <p className="text-sm text-muted">Connect the wallet that receives your creator fees.</p>
        <ConnectButton />
      </div>
    );
  }
  const busy = status.state === "signing" || status.state === "pending";
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Creator fees</h1>
      <p className="text-sm text-muted">Your share of trading fees and creator tax accrues on each token&apos;s curve, gets swept into escrow, and is yours to claim.</p>
      <div className="card glow mt-6 flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="label">Claimable now</div>
          <div className="text-3xl font-bold">{data ? `${fmtNum(Number(formatUnits(BigInt(data.claimableEth), 18)), 6)} ETH` : "…"}</div>
          <div className="text-sm text-muted">{data && fmtUsd(data.claimableUsd)}</div>
        </div>
        <button className="btn btn-primary" disabled={busy || !data || BigInt(data.claimableEth) === 0n} onClick={() => act("claim")}>{busy ? "Confirm…" : "Claim ETH"}</button>
      </div>
      {status.state === "done" && <a className="mt-2 block text-sm text-up underline" href={`${EXPLORER}/tx/${status.hash}`} target="_blank" rel="noreferrer">✓ Transaction confirmed</a>}
      {status.state === "error" && <p className="mt-2 text-sm text-down">{status.error}</p>}
      <h2 className="mt-10 text-lg font-semibold">Tokens you created</h2>
      <div className="card mt-3 overflow-x-auto">
        {isLoading ? <div className="h-48 animate-pulse" /> : (
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-xs text-muted"><tr className="text-left"><th className="px-4 py-3">Token</th><th>Market cap</th><th>Creator tax</th><th>Claimable tokens</th><th className="pr-4 text-right">Actions</th></tr></thead>
            <tbody>
              {data?.tokens.map((x) => (
                <tr key={x.token.token} className="border-t border-line/60">
                  <td className="px-4 py-3"><Link href={`/token/${x.token.token}`} className="flex items-center gap-2"><TokenAvatar t={x.token} size={28} /><span className="font-semibold">${x.token.symbol}</span></Link></td>
                  <td>{fmtUsd(x.token.marketCapUsd)}</td>
                  <td>{Number(x.token.live.creatorTaxBps) / 100}%</td>
                  <td className="mono">{fmtNum(Number(formatUnits(BigInt(x.claimableTokens), 18)))}</td>
                  <td className="space-x-2 pr-4 text-right">
                    {!x.token.live.graduated && <button disabled={busy} onClick={() => act("sweep", x.token.token)} className="btn btn-ghost px-2 py-1 text-xs">Sweep & claim</button>}
                    {BigInt(x.claimableTokens) > 0n && <button disabled={busy} onClick={() => act("claimToken", x.token.token)} className="btn btn-ghost px-2 py-1 text-xs">Claim tokens</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && !data.tokens.length && <p className="p-8 text-center text-sm text-muted">No tokens launched from this wallet. Fees for tokens where you&apos;re only the fee recipient still show in &ldquo;Claimable now&rdquo;. <Link href="/launch" className="text-accent underline">Launch one</Link>.</p>}
      </div>
    </div>
  );
}
