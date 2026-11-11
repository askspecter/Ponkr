"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { TokenAvatar } from "@/components/TokenBits";
import { EXPLORER } from "@/lib/config";
import { fmtNum, fmtUsd, shortAddr } from "@/lib/format";
import type { TokenView } from "@/lib/types";

interface LB { tokens: TokenView[]; creators: { creator: string; launches: number; marketCapUsd: number; raisedEth: number; best?: string }[] }

export default function Leaderboard() {
  const [tab, setTab] = useState<"tokens" | "creators">("tokens");
  const { data, isLoading } = useQuery({ queryKey: ["lb"], queryFn: async () => (await (await fetch("/api/leaderboard")).json()) as LB, refetchInterval: 60_000 });
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="display text-4xl font-bold">Leaderboard</h1>
      <p className="text-sm text-muted">Top tokens and creators by market cap.</p>
      <div className="mt-6 flex gap-2">
        {(["tokens", "creators"] as const).map((k) => <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-4 py-1.5 text-sm capitalize ${tab === k ? "border-accent" : "border-line text-muted"}`}>{k}</button>)}
      </div>
      <div className="card mt-6 overflow-x-auto">
        {isLoading ? <div className="h-96 animate-pulse" /> : tab === "tokens" ? (
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-xs text-muted"><tr className="text-left"><th className="px-4 py-3">#</th><th>Token</th><th>Price</th><th>Market cap</th><th>Bonded</th><th className="pr-4">Creator</th></tr></thead>
            <tbody>
              {data?.tokens.map((t, i) => (
                <tr key={t.token} className="border-t border-line/60 hover:bg-panel-2">
                  <td className="px-4 py-3 text-muted">{i + 1}</td>
                  <td><Link href={`/token/${t.token}`} className="flex items-center gap-2"><TokenAvatar t={t} size={28} /><span className="font-semibold">${t.symbol}</span><span className="hidden text-muted sm:inline">{t.name}</span></Link></td>
                  <td className="mono">{fmtUsd(t.priceUsd)}</td>
                  <td className="font-semibold">{fmtUsd(t.marketCapUsd)}</td>
                  <td>{t.live.graduated ? <span className="text-up">Graduated</span> : `${t.progress.toFixed(0)}%`}</td>
                  <td className="mono pr-4 text-muted">{shortAddr(t.creator)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-xs text-muted"><tr className="text-left"><th className="px-4 py-3">#</th><th>Creator</th><th>Launches</th><th>Total market cap</th><th className="pr-4">Raised on curves</th></tr></thead>
            <tbody>
              {data?.creators.map((c, i) => (
                <tr key={c.creator} className="border-t border-line/60 hover:bg-panel-2">
                  <td className="px-4 py-3 text-muted">{i + 1}</td>
                  <td><a className="mono" href={`${EXPLORER}/address/${c.creator}`} target="_blank" rel="noreferrer">{shortAddr(c.creator, 6)}</a> {c.best && <span className="text-xs text-muted">· ${c.best}</span>}</td>
                  <td>{c.launches}</td>
                  <td className="font-semibold">{fmtUsd(c.marketCapUsd)}</td>
                  <td className="mono pr-4">{fmtNum(c.raisedEth, 3)} ETH</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
