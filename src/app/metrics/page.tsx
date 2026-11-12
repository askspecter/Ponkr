"use client";

import { PageHeader, PageShell } from "@/components/Page";

import { useQuery } from "@tanstack/react-query";
import { fmtNum, fmtUsd } from "@/lib/format";

interface M { ethUsd: number; totalTokens: number; launches24h: number; graduated: number; totalMarketCapUsd: number; raisedEth: number; creators: number; appLaunches: number; days: { day: string; launches: number }[] }

export default function Metrics() {
  const { data } = useQuery({ queryKey: ["metrics"], queryFn: async () => (await (await fetch("/api/metrics")).json()) as M, refetchInterval: 60_000 });
  const max = Math.max(1, ...(data?.days.map((d) => d.launches) ?? [1]));
  const tiles = data
    ? [
        ["Tokens indexed", data.totalTokens.toLocaleString()],
        ["Launched in 24h", data.launches24h.toLocaleString()],
        ["Graduated", data.graduated.toLocaleString()],
        ["Unique creators", data.creators.toLocaleString()],
        ["Combined market cap", fmtUsd(data.totalMarketCapUsd)],
        ["ETH raised on curves", `${fmtNum(data.raisedEth)} ETH`],
        ["Launched via Kekr", data.appLaunches.toLocaleString()],
        ["ETH price", fmtUsd(data.ethUsd)],
      ]
    : [];
  return (
    <PageShell>
      <PageHeader eyebrow="Metrics" title="Launchpad activity" description="Network wide numbers for the last two weeks of launches, refreshed every minute." />
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-4">
        {(tiles.length ? tiles : Array.from({ length: 8 }).map(() => ["…", "…"])).map(([k, v], i) => (
          <div key={i} className="bg-panel p-5"><div className="label">{k}</div><div className="display text-2xl font-bold">{v}</div></div>
        ))}
      </div>
      <div className="card mt-6 p-5">
        <div className="label">Launches per day</div>
        <div className="mt-4 flex h-56 items-end gap-1.5">
          {data?.days.map((d) => (
            <div key={d.day} className="group flex flex-1 flex-col items-center gap-2">
              <div className="mono text-[10px] text-muted opacity-0 group-hover:opacity-100">{d.launches}</div>
              <div className="w-full rounded-t-[2px] bg-accent transition group-hover:bg-acid" style={{ height: `${(d.launches / max) * 170}px` }} />
              <div className="mono text-[9px] text-muted">{d.day}</div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
