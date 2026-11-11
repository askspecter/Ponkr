"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { parseEther } from "viem";
import { Check } from "lucide-react";
import { SignInButton } from "@/components/Providers";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useTxRunner } from "@/hooks/useTxRunner";
import { CLUB } from "@/lib/config";

const free = ["5 agent messages per day", "Trade and launch from chat", "Gasless launches (daily cap)", "100 API requests per day"];
const club = ["Unlimited agent messages on web, Telegram and X", "1,000 API requests per day", "Early access to new features", "Club badge on your launches", "Pay in ETH on Robinhood Chain"];

export default function Club() {
  const { address, authHeaders } = useAuth();
  const { run, status } = useTxRunner();
  const [msg, setMsg] = useState<string>();
  const st = useQuery({
    queryKey: ["club-status", address],
    queryFn: async () =>
      (await (await fetch(`/api/club/status${address ? `?address=${address}` : ""}`, { headers: await authHeaders() })).json()) as { club: boolean; expiresAt: number | null; messagesUsed: number; freeLimit: number },
  });

  async function join() {
    setMsg(undefined);
    if (!CLUB.treasury) return setMsg("Club payments are not configured on this deployment yet.");
    try {
      const hash = await run([{ to: CLUB.treasury as `0x${string}`, data: "0x", value: parseEther(CLUB.priceEth).toString(), description: "Club membership" }]);
      const r = await fetch("/api/club/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ txHash: hash, address }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setMsg("Welcome to Club.");
      void st.refetch();
    } catch (e) {
      setMsg((e as { shortMessage?: string }).shortMessage || (e as Error).message);
    }
  }
  const busy = status.state === "signing" || status.state === "pending";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="text-center">
        <Logo className="mx-auto h-14 w-14" />
        <h1 className="display mt-4 text-4xl font-bold md:text-5xl">Ponkr Club</h1>
        <p className="mt-2 text-muted">Unlimited agent, bigger API limits, first look at everything new.</p>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="card p-8">
          <div className="label">Free</div>
          <div className="display text-4xl font-bold">$0</div>
          <ul className="mt-6 space-y-2.5 text-sm text-muted">{free.map((f) => <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0" /> {f}</li>)}</ul>
        </div>
        <div className="card-hard border-accent p-8">
          <div className="label text-acid">Club</div>
          <div className="display text-4xl font-bold">{CLUB.priceEth} ETH<span className="text-base font-normal text-muted"> per {CLUB.periodDays} days</span></div>
          <ul className="mt-6 space-y-2.5 text-sm">{club.map((f) => <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-acid" /> {f}</li>)}</ul>
          <div className="mt-8">
            {!address ? <SignInButton className="btn btn-primary w-full" /> : st.data?.club ? (
              <div className="space-y-2 text-sm">
                <div className="text-up">Active until {new Date(st.data.expiresAt!).toLocaleDateString()}</div>
                <button className="btn btn-ghost w-full" onClick={join} disabled={busy}>Extend {CLUB.periodDays} days</button>
              </div>
            ) : (
              <button className="btn btn-primary w-full" onClick={join} disabled={busy}>
                {status.state === "signing" ? "Confirm in wallet" : status.state === "pending" ? "Confirming" : "Join Club"}
              </button>
            )}
            {msg && <p className="mt-3 text-sm text-muted">{msg}</p>}
            {st.data && !st.data.club && <p className="mono mt-3 text-xs text-muted">Today: {st.data.messagesUsed}/{st.data.freeLimit} free messages used</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
