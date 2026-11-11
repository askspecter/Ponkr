"use client";

import { useState } from "react";
import { TokenCard } from "@/components/TokenBits";
import { useLaunches } from "@/components/LiveLaunches";

const tabs = [
  ["new", "New"],
  ["mcap", "Top market cap"],
  ["progress", "About to graduate"],
  ["graduated", "Graduated"],
  ["app", "Launched on Ponkr"],
] as const;

export default function Launches() {
  const [sort, setSort] = useState<string>("new");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(48);
  const { data, isLoading, error } = useLaunches(sort, limit, q);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Launches</h1>
          <p className="text-sm text-muted">{data ? `${data.total.toLocaleString()} tokens` : "Loading…"} on the launchpad.</p>
        </div>
        <input className="input max-w-xs" placeholder="Search name, $ticker or 0x…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setSort(k)} className={`rounded-full border px-3 py-1.5 text-sm ${sort === k ? "border-accent text-fg" : "border-line text-muted hover:text-fg"}`}>{l}</button>
        ))}
      </div>
      <div className="mt-6">
        {error ? <div className="card p-6 text-sm text-down">{(error as Error).message}</div> : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 12 }).map((_, i) => <div key={i} className="card h-48 animate-pulse" />)}</div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{data!.items.map((t) => <TokenCard key={t.token} t={t} />)}</div>
            {!data!.items.length && <p className="py-20 text-center text-muted">Nothing here yet.</p>}
            {data!.total > limit && <div className="mt-8 text-center"><button className="btn btn-ghost" onClick={() => setLimit(limit + 48)}>Load more</button></div>}
          </>
        )}
      </div>
    </div>
  );
}
