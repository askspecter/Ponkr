"use client";

import Link from "next/link";
import { useState } from "react";
import { SignInButton } from "@/components/Providers";
import { useLaunches } from "@/components/LiveLaunches";
import { Progress, TokenAvatar } from "@/components/TokenBits";
import { useAuth } from "@/hooks/useAuth";
import { useTxRunner } from "@/hooks/useTxRunner";
import { EXPLORER } from "@/lib/config";
import { fmtUsd } from "@/lib/format";

const SORTS = [["mcap", "Top"], ["progress", "Graduating"], ["new", "New"]] as const;
const AMOUNTS = ["0.001", "0.005", "0.01"];

export default function Trade() {
  const [sort, setSort] = useState<string>("mcap");
  const [amount, setAmount] = useState(AMOUNTS[1]);
  const { data, isLoading } = useLaunches(sort, 30);
  const { address, authenticated } = useAuth();
  const { run, status } = useTxRunner();
  const [pending, setPending] = useState<string>();
  const [msg, setMsg] = useState<{ ok: boolean; text: string; hash?: string }>();

  async function quickBuy(token: string, symbol: string) {
    setMsg(undefined);
    setPending(token);
    try {
      const r = await fetch("/api/tx/trade", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, side: "buy", amount, wallet: address }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const hash = await run(j.txs);
      setMsg({ ok: true, text: `Bought $${symbol}`, hash });
    } catch (e) {
      setMsg({ ok: false, text: (e as { shortMessage?: string }).shortMessage || (e as Error).message });
    } finally {
      setPending(undefined);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-4xl font-bold">Trade</h1>
          <p className="text-sm text-muted">One tap buys on the bonding curve. Your wallet confirms each one.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="label mb-0">Size</span>
          {AMOUNTS.map((a) => (
            <button key={a} onClick={() => setAmount(a)} className={`mono rounded border px-2.5 py-1 text-xs ${amount === a ? "border-acid bg-acid text-black" : "border-line text-muted"}`}>{a} ETH</button>
          ))}
        </div>
      </div>
      <div className="mt-6 flex gap-1">
        {SORTS.map(([k, l]) => (
          <button key={k} onClick={() => setSort(k)} className={`mono rounded px-3 py-1.5 text-xs ${sort === k ? "bg-panel-2 text-fg" : "text-muted"}`}>{l}</button>
        ))}
      </div>
      {msg && (
        <div className={`card mt-4 p-3 text-sm ${msg.ok ? "text-up" : "text-down"}`}>
          {msg.text} {msg.hash && <a href={`${EXPLORER}/tx/${msg.hash}`} target="_blank" rel="noreferrer" className="underline">view</a>}
        </div>
      )}
      <div className="mt-4 space-y-2">
        {isLoading && Array.from({ length: 8 }).map((_, i) => <div key={i} className="card h-20 animate-pulse" />)}
        {data?.items.filter((t) => !t.live.graduated && t.isNative).map((t) => (
          <div key={t.token} className="card flex items-center gap-4 p-3">
            <Link href={`/token/${t.token}`} className="flex min-w-0 flex-1 items-center gap-3">
              <TokenAvatar t={t} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2"><span className="truncate font-semibold">{t.name}</span><span className="mono text-xs text-muted">${t.symbol}</span></div>
                <div className="mt-1.5 max-w-[220px]"><Progress pct={t.progress} /></div>
              </div>
              <div className="hidden text-right sm:block">
                <div className="display font-bold">{fmtUsd(t.marketCapUsd)}</div>
                <div className="mono text-[10px] text-muted">{t.progress.toFixed(1)}% BONDED</div>
              </div>
            </Link>
            {authenticated ? (
              <button className="btn btn-acid mono shrink-0 px-3 py-2 text-xs" disabled={!!pending} onClick={() => quickBuy(t.token, t.symbol)}>
                {pending === t.token ? (status.state === "signing" ? "Confirm" : "Buying") : `Buy ${amount}`}
              </button>
            ) : (
              <SignInButton className="btn btn-ghost shrink-0 px-3 py-2 text-xs" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
