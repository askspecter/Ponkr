"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { formatUnits } from "viem";
import { Check, Copy, ExternalLink, Globe, Send, Share2 } from "lucide-react";
import { PriceChart } from "@/components/PriceChart";
import { Progress, TokenAvatar } from "@/components/TokenBits";
import { TradePanel } from "@/components/TradePanel";
import { EXPLORER } from "@/lib/config";
import { fmtNum, fmtPrice, fmtUsd, shortAddr, timeAgo } from "@/lib/format";
import type { TokenView, Trade } from "@/lib/types";

const SOCIAL_LABEL: Record<string, string> = { twitter: "X", telegram: "Telegram", discord: "Discord", website: "Website", farcaster: "Farcaster" };

export function TokenPage({ address }: { address: string }) {
  const [usd, setUsd] = useState(true);
  const [copied, setCopied] = useState<"addr" | "link">();
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

  const shell = "mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10";
  if (isLoading) {
    return (
      <div className={shell}>
        <div className="flex items-center gap-4"><div className="card h-[72px] w-[72px] animate-pulse" /><div className="card h-12 w-64 animate-pulse" /></div>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-24 animate-pulse" />)}</div>
        <div className="card mt-6 h-96 animate-pulse" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className={shell}>
        <div className="card dots px-6 py-20 text-center">
          <h1 className="display text-2xl font-bold">{(error as Error)?.message === "Token not found" ? "Looking for this token" : "Something went wrong"}</h1>
          <p className="mt-2 text-sm text-muted">{(error as Error)?.message === "Token not found" ? "It may have just launched. It will appear here in a few seconds." : (error as Error)?.message}</p>
        </div>
      </div>
    );
  }

  const t = data.token;
  const ethUsd = stats.data?.ethUsd ?? (t.priceEth ? t.priceUsd / t.priceEth : 0);
  const socials = Object.entries(t.socials).filter(([, v]) => v);
  const raised = Number(formatUnits(BigInt(t.live.realQuote), 18));
  const threshold = Number(formatUnits(BigInt(t.threshold), 18));
  const change = t.change24h;
  const copy = (what: "addr" | "link", text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(undefined), 1400);
  };
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const tweet = `https://x.com/intent/post?text=${encodeURIComponent(`$${t.symbol} on @kekrdotapp`)}&url=${encodeURIComponent(shareUrl)}`;

  const tiles: [string, string, string?][] = [
    ["Price", usd ? fmtPrice(t.priceUsd) : `${fmtPrice(t.priceEth, "")} ETH`],
    ["Market cap", usd ? fmtUsd(t.marketCapUsd) : `${fmtNum(t.marketCapEth)} ETH`],
    ["24h volume", t.volume24hEth ? (usd ? fmtUsd(t.volume24hEth * ethUsd) : `${fmtNum(t.volume24hEth)} ETH`) : "n/a"],
    ["24h change", change !== undefined ? `${change >= 0 ? "+" : ""}${change.toFixed(1)}%` : "n/a", change === undefined ? "" : change >= 0 ? "text-up" : "text-down"],
  ];

  return (
    <div className={shell}>
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
        <div className="flex min-w-0 items-center gap-4">
          <TokenAvatar t={t} size={72} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h1 className="display truncate text-3xl font-bold md:text-4xl">{t.name}</h1>
              <span className="mono text-lg text-muted">${t.symbol}</span>
              {t.live.graduated && <span className="tag bg-up/15 text-up">Graduated</span>}
              {t.viaApp && <span className="tag bg-accent text-accent-ink">Kekr</span>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <button onClick={() => copy("addr", t.token)} className="mono flex items-center gap-1.5 rounded border border-line px-2 py-1 text-muted hover:text-fg">
                {shortAddr(t.token, 5)} {copied === "addr" ? <Check size={12} className="text-acid" /> : <Copy size={12} />}
              </button>
              <span className="rounded border border-line px-2 py-1 text-muted">Launched {timeAgo(t.timestamp)}</span>
              <a href={`${EXPLORER}/address/${t.creator}`} target="_blank" rel="noreferrer" className="mono rounded border border-line px-2 py-1 text-muted hover:text-fg">by {shortAddr(t.creator)}</a>
              {socials.map(([k, v]) => (
                <a key={k} href={v.startsWith("http") ? v : `https://${v}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded border border-line px-2 py-1 text-fg/80 hover:border-accent hover:text-fg">
                  {k === "website" ? <Globe size={12} /> : k === "telegram" ? <Send size={12} /> : <ExternalLink size={12} />} {SOCIAL_LABEL[k] ?? k}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => copy("link", shareUrl)} className="btn btn-ghost px-3 py-2 text-xs">
            {copied === "link" ? <Check size={14} className="text-acid" /> : <Copy size={14} />} {copied === "link" ? "Copied" : "Copy link"}
          </button>
          <a href={tweet} target="_blank" rel="noreferrer" className="btn btn-primary px-3 py-2 text-xs"><Share2 size={14} /> Share on X</a>
        </div>
      </header>

      {t.description && <p className="mt-5 max-w-3xl text-sm leading-relaxed text-muted">{t.description}</p>}

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-4">
        {tiles.map(([k, v, cls]) => (
          <div key={k} className="bg-panel px-4 py-4 md:px-5">
            <div className="label">{k}</div>
            <div className={`display truncate text-xl font-bold md:text-2xl ${cls ?? ""}`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="label mb-0">Price chart</span>
              <button onClick={() => setUsd(!usd)} className="mono rounded border border-line px-2 py-1 text-[11px] text-muted hover:text-fg">{usd ? "USD" : "ETH"} ⇄</button>
            </div>
            <PriceChart trades={data.trades} ethUsd={ethUsd} usd={usd} />
          </div>
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="label mb-0">Recent trades</span>
              <span className="mono text-[11px] text-muted">{data.trades.length} shown</span>
            </div>
            <div className="max-h-[440px] overflow-auto">
              <table className="w-full min-w-[520px] text-xs">
                <thead className="sticky top-0 bg-panel">
                  <tr className="text-left">
                    {["Type", "ETH", `$${t.symbol}`, "Trader", "Time", ""].map((h, i) => <th key={i} className={`label mb-0 py-2.5 font-normal ${i === 0 ? "px-4" : ""} ${i === 5 ? "pr-4" : ""}`}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.trades.map((tr) => (
                    <tr key={tr.txHash + tr.side + tr.tokens} className="border-t border-line/60 hover:bg-panel-2">
                      <td className="px-4 py-2.5"><span className={`tag ${tr.side === "buy" ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>{tr.side}</span></td>
                      <td className="mono">{Number(formatUnits(BigInt(tr.quote), 18)).toFixed(5)}</td>
                      <td className="mono">{fmtNum(Number(formatUnits(BigInt(tr.tokens), 18)))}</td>
                      <td className="mono"><a href={`${EXPLORER}/address/${tr.trader}`} target="_blank" rel="noreferrer" className="text-muted hover:text-fg">{shortAddr(tr.trader)}</a></td>
                      <td className="text-muted">{tr.timestamp ? timeAgo(tr.timestamp) : "n/a"}</td>
                      <td className="pr-4 text-right"><a href={`${EXPLORER}/tx/${tr.txHash}`} target="_blank" rel="noreferrer" className="inline-flex text-muted hover:text-acid" aria-label="View transaction"><ExternalLink size={13} /></a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.trades.length && <p className="p-8 text-center text-sm text-muted">No trades yet. Be the first.</p>}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <TradePanel t={t} />
          <div className="card p-5">
            <div className="flex items-baseline justify-between"><span className="label mb-0">Bonding curve</span><span className="mono text-sm">{t.progress.toFixed(1)}%</span></div>
            <div className="mt-3"><Progress pct={t.progress} graduated={t.live.graduated} /></div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              {t.live.graduated ? "Graduated. Liquidity is locked forever in a Uniswap v4 pool." : `${fmtNum(raised, 4)} of ${fmtNum(threshold)} ETH raised. At ${fmtNum(threshold)} ETH the token graduates to a locked Uniswap v4 pool.`}
            </p>
          </div>
          <div className="card divide-y divide-line/60 text-xs">
            <Row k="Supply" v="1,000,000,000" />
            <Row k="Trading fee" v={`${Number(t.live.feeBps) / 100}%`} />
            <Row k="Creator tax" v={`${Number(t.live.creatorTaxBps) / 100}%`} />
            <Row k="Token" v={<a href={`${EXPLORER}/token/${t.token}`} target="_blank" rel="noreferrer" className="mono hover:text-acid">{shortAddr(t.token)}</a>} />
            <Row k="Curve" v={<a href={`${EXPLORER}/address/${t.curve}`} target="_blank" rel="noreferrer" className="mono hover:text-acid">{shortAddr(t.curve)}</a>} />
            {t.txHash && <Row k="Launch tx" v={<a href={`${EXPLORER}/tx/${t.txHash}`} target="_blank" rel="noreferrer" className="mono hover:text-acid">{shortAddr(t.txHash)}</a>} />}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex items-center justify-between px-5 py-3"><span className="text-muted">{k}</span><span>{v}</span></div>;
}
