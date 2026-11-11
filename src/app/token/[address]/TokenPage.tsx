"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { formatUnits } from "viem";
import { PriceChart } from "@/components/PriceChart";
import { Progress, TokenAvatar } from "@/components/TokenBits";
import { TradePanel } from "@/components/TradePanel";
import { EXPLORER } from "@/lib/config";
import { fmtNum, fmtUsd, shortAddr, timeAgo } from "@/lib/format";
import type { TokenView, Trade } from "@/lib/types";

export function TokenPage({ address }: { address: string }) {
  const [usd, setUsd] = useState(true);
  const [copied, setCopied] = useState(false);
  const { data, error, isLoading } = useQuery({
    queryKey: ["token", address],
    queryFn: async () => {
      const r = await fetch(`/api/tokens/${address}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j as { token: TokenView; trades: Trade[] };
    },
    refetchInterval: 6_000,
    retry: 20,
    retryDelay: 3000,
  });
  const stats = useQuery({ queryKey: ["stats"], queryFn: async () => (await (await fetch("/api/stats")).json()) as { ethUsd: number } });

  if (isLoading) return <div className="mx-auto max-w-7xl px-4 py-10"><div className="card h-96 animate-pulse" /></div>;
  if (error || !data) return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-muted">{(error as Error)?.message === "Token not found" ? "Indexing this token… it will appear in a few seconds." : (error as Error)?.message}</div>;

  const t = data.token;
  const ethUsd = stats.data?.ethUsd ?? (t.priceEth ? t.priceUsd / t.priceEth : 0);
  const socials = Object.entries(t.socials).filter(([, v]) => v);
  const raised = Number(formatUnits(BigInt(t.live.realQuote), 18));
  const threshold = Number(formatUnits(BigInt(t.threshold), 18));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-4">
        <TokenAvatar t={t} size={64} />
        <div className="min-w-0">
          <h1 className="display text-3xl font-bold">{t.name} <span className="text-muted">${t.symbol}</span></h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
            <button onClick={() => { navigator.clipboard.writeText(t.token); setCopied(true); setTimeout(() => setCopied(false), 1200); }} className="mono hover:text-fg">{copied ? "Copied!" : shortAddr(t.token, 6)} ⧉</button>
            <span>Launched {timeAgo(t.timestamp)}</span>
            <span>by <a className="mono hover:text-fg" href={`${EXPLORER}/address/${t.creator}`} target="_blank" rel="noreferrer">{shortAddr(t.creator)}</a></span>
            {socials.map(([k, v]) => <a key={k} href={v.startsWith("http") ? v : `https://${v}`} target="_blank" rel="noreferrer" className="capitalize text-accent hover:underline">{k}</a>)}
          </div>
        </div>
        <div className="ml-auto grid grid-cols-2 gap-6 text-right sm:grid-cols-4">
          <Stat k="Price" v={usd ? fmtUsd(t.priceUsd) : `${t.priceEth.toExponential(3)} ETH`} />
          <Stat k="Market cap" v={usd ? fmtUsd(t.marketCapUsd) : `${fmtNum(t.marketCapEth)} ETH`} />
          <Stat k="24h vol" v={t.volume24hEth !== undefined ? (usd ? fmtUsd(t.volume24hEth * ethUsd) : `${fmtNum(t.volume24hEth)} ETH`) : "n/a"} />
          <Stat k="24h" v={t.change24h !== undefined ? `${t.change24h >= 0 ? "+" : ""}${t.change24h.toFixed(1)}%` : "n/a"} cls={t.change24h !== undefined ? (t.change24h >= 0 ? "text-up" : "text-down") : ""} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="card p-4">
            <div className="mb-2 flex justify-end"><button onClick={() => setUsd(!usd)} className="text-xs text-muted hover:text-fg">{usd ? "USD" : "ETH"} ⇄</button></div>
            <PriceChart trades={data.trades} ethUsd={ethUsd} usd={usd} />
          </div>
          <div className="card overflow-hidden">
            <div className="border-b border-line px-4 py-3 text-sm font-semibold">Trades</div>
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="text-muted"><tr className="text-left"><th className="px-4 py-2">Type</th><th>ETH</th><th>${t.symbol}</th><th>Trader</th><th>Time</th><th className="pr-4 text-right">Tx</th></tr></thead>
                <tbody>
                  {data.trades.map((tr) => (
                    <tr key={tr.txHash + tr.side + tr.tokens} className="border-t border-line/60">
                      <td className={`px-4 py-2 font-semibold ${tr.side === "buy" ? "text-up" : "text-down"}`}>{tr.side}</td>
                      <td className="mono">{Number(formatUnits(BigInt(tr.quote), 18)).toFixed(5)}</td>
                      <td className="mono">{fmtNum(Number(formatUnits(BigInt(tr.tokens), 18)))}</td>
                      <td className="mono"><a href={`${EXPLORER}/address/${tr.trader}`} target="_blank" rel="noreferrer" className="hover:text-fg">{shortAddr(tr.trader)}</a></td>
                      <td className="text-muted">{tr.timestamp ? timeAgo(tr.timestamp) : "n/a"}</td>
                      <td className="pr-4 text-right"><a href={`${EXPLORER}/tx/${tr.txHash}`} target="_blank" rel="noreferrer" className="text-accent">↗</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.trades.length && <p className="p-6 text-center text-sm text-muted">No trades yet.</p>}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <TradePanel t={t} />
          <div className="card p-5">
            <div className="flex justify-between text-sm"><span className="font-semibold">Bonding curve</span><span>{t.progress.toFixed(1)}%</span></div>
            <div className="mt-3"><Progress pct={t.progress} graduated={t.live.graduated} /></div>
            <p className="mt-3 text-xs text-muted">
              {t.live.graduated ? "Graduated: liquidity is locked forever in a Uniswap v4 pool." : `${fmtNum(raised, 4)} / ${fmtNum(threshold)} ETH raised. At ${fmtNum(threshold)} ETH the token graduates to a locked Uniswap v4 pool.`}
            </p>
          </div>
          <div className="card space-y-2 p-5 text-xs">
            <Row k="Supply" v="1,000,000,000" />
            <Row k="Trading fee" v={`${Number(t.live.feeBps) / 100}%`} />
            <Row k="Creator tax" v={`${Number(t.live.creatorTaxBps) / 100}%`} />
            <Row k="Token" v={<a href={`${EXPLORER}/token/${t.token}`} target="_blank" rel="noreferrer" className="mono text-accent">{shortAddr(t.token)}</a>} />
            <Row k="Curve" v={<a href={`${EXPLORER}/address/${t.curve}`} target="_blank" rel="noreferrer" className="mono text-accent">{shortAddr(t.curve)}</a>} />
            <Row k="Launch tx" v={<a href={`${EXPLORER}/tx/${t.txHash}`} target="_blank" rel="noreferrer" className="mono text-accent">{shortAddr(t.txHash)}</a>} />
          </div>
          {t.description && <div className="card p-5 text-sm text-muted">{t.description}</div>}
        </div>
      </div>
    </div>
  );
}

function Stat({ k, v, cls = "" }: { k: string; v: string; cls?: string }) {
  return <div><div className="text-[11px] text-muted">{k}</div><div className={`font-semibold ${cls}`}>{v}</div></div>;
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between"><span className="text-muted">{k}</span><span>{v}</span></div>;
}
