"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
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
  if (isLoading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: limit }).map((_, i) => <div key={i} className="card h-48 animate-pulse" />)}</div>;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{data!.items.map((t) => <TokenCard key={t.token} t={t} />)}</div>;
}

export function Ticker() {
  const { data } = useLaunches("mcap", 20);
  if (!data?.items.length) return <div className="h-10" />;
  const items = [...data.items, ...data.items];
  return (
    <div className="overflow-hidden border-y border-line bg-panel/60">
      <div className="ticker flex w-max gap-8 py-2.5">
        {items.map((t, i) => (
          <Link key={i} href={`/token/${t.token}`} className="flex items-center gap-2 text-sm whitespace-nowrap">
            <TokenAvatar t={t} size={20} />
            <span className="font-semibold">${t.symbol}</span>
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
    ["Tokens launched", data?.totalLaunches?.toLocaleString() ?? "…"],
    ["Launched (24h)", data?.launches24h?.toLocaleString() ?? "…"],
    ["ETH price", data ? "$" + data.ethUsd.toLocaleString() : "…"],
  ];
  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line">
      {items.map(([k, v]) => (
        <div key={k} className="bg-panel p-4 text-center">
          <div className="text-xl font-bold md:text-2xl">{v}</div>
          <div className="text-xs text-muted">{k}</div>
        </div>
      ))}
    </div>
  );
}
