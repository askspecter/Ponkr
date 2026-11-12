"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { EmptyState, PageHeader, PageShell, Segmented } from "@/components/Page";
import { TokenCard } from "@/components/TokenBits";
import { useLaunches } from "@/components/LiveLaunches";

const tabs = [
  ["latest", "Latest"],
  ["mcap", "Market cap"],
  ["progress", "Graduating"],
  ["graduated", "Graduated"],
  ["app", "Launched on Kekr"],
] as const;
type Tab = (typeof tabs)[number][0];

export default function Launches() {
  const [sort, setSort] = useState<Tab>("latest");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(48);
  const { data, isLoading, error } = useLaunches(sort, limit, q);
  return (
    <PageShell>
      <PageHeader
        eyebrow="Discover"
        title="Every token on the launchpad"
        description={data ? `${data.total.toLocaleString("en-US")} tokens, priced live from Robinhood Chain.` : "Loading tokens from Robinhood Chain."}
        actions={
          <label className="relative block w-full sm:w-72">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input pl-9" placeholder="Search name, $ticker or address" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        }
      />
      <div className="mb-6 overflow-x-auto"><Segmented value={sort} options={tabs} onChange={setSort} /></div>
      {error ? (
        <div className="card p-6 text-sm text-down">{(error as Error).message}</div>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 12 }).map((_, i) => <div key={i} className="card h-52 animate-pulse" />)}</div>
      ) : !data!.items.length ? (
        <EmptyState title="No tokens match" description="Try another search or switch tabs." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{data!.items.map((t) => <TokenCard key={t.token} t={t} />)}</div>
          {data!.total > limit && <div className="mt-10 text-center"><button className="btn btn-ghost" onClick={() => setLimit(limit + 48)}>Load more</button></div>}
        </>
      )}
    </PageShell>
  );
}
