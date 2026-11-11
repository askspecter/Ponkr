"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { TokenAvatar, TokenCard } from "./TokenBits";
import { fmtUsd } from "@/lib/format";
import type { TokenView } from "@/lib/types";

export function useLaunches(sort = "new", limit = 24, q = "") {
  return useQuery({
    queryKey: ["launches", sort, limit, q],
    queryFn: async () => {
      const r = await fetch(`/api/launches?sort=${sort}&limit=${limit}&q=${encodeURIComponent(q)}`);
      if (!r.ok) throw new Error((await r.json()).error);
      return (await r.json()) as { total: number; items: TokenView[] };
    },
    refetchInterval: 15_000,
  });
}

export function LiveGrid({ sort = "new", limit = 8 }: { sort?: string; limit?: number }) {
  const { data, isLoading, error } = useLaunches(sort, limit);
  if (error) return <div className="card p-6 text-sm text-down">{(error as Error).message}</div>;
  if (isLoading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: limit }).map((_, i) => <div key={i} className="card h-52 animate-pulse" />)}</div>;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{data!.items.map((t) => <TokenCard key={t.token} t={t} />)}</div>;
}

const TABS = [["new", "Fresh"], ["progress", "Graduating"], ["mcap", "Biggest"]] as const;

export function DiscoverTabs() {
  const [tab, setTab] = useState<string>("new");
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-3xl font-bold">Discover</h2>
          <p className="text-sm text-muted">Straight from the chain, refreshed every few seconds.</p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-line bg-panel p-1">
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`mono rounded px-3 py-1.5 text-xs ${tab === k ? "bg-acid text-black" : "text-muted hover:text-fg"}`}>{l}</button>
          ))}
        </div>
      </div>
      <LiveGrid sort={tab} limit={8} />
      <div className="mt-6 text-right"><Link href="/launches" className="mono text-sm text-acid hover:underline">All tokens →</Link></div>
    </div>
  );
}

export function Ticker() {
  const { data } = useLaunches("mcap", 20);
  if (!data?.items.length) return <div className="h-11 border-b border-line" />;
  const items = [...data.items, ...data.items];
  return (
    <div className="overflow-hidden border-b border-line bg-panel">
      <div className="ticker flex w-max gap-10 py-3">
        {items.map((t, i) => (
          <Link key={i} href={`/token/${t.token}`} className="mono flex items-center gap-2 whitespace-nowrap text-xs">
            <TokenAvatar t={t} size={18} />
            <span className="font-semibold text-fg">${t.symbol}</span>
            <span className="text-muted">{fmtUsd(t.marketCapUsd)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Stats() {
  const { data } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => (await (await fetch("/api/stats")).json()) as { totalLaunches: number; launches24h: number; appLaunches: number; ethUsd: number },
    refetchInterval: 30_000,
  });
  const items = [
    ["Tokens indexed", data?.totalLaunches?.toLocaleString() ?? "…"],
    ["Launched today", data?.launches24h?.toLocaleString() ?? "…"],
    ["ETH", data ? "$" + data.ethUsd.toLocaleString() : "…"],
  ];
  return (
    <div className="grid max-w-3xl grid-cols-3 gap-px overflow-hidden rounded-md border border-line bg-line">
      {items.map(([k, v]) => (
        <div key={k} className="bg-panel px-4 py-3">
          <div className="label mb-1">{k}</div>
          <div className="display text-xl font-bold md:text-2xl">{v}</div>
        </div>
      ))}
    </div>
  );
}
