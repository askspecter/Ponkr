"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useTxRunner } from "@/hooks/useTxRunner";
import { useSession } from "@/hooks/useSession";
import { CLUB } from "@/lib/config";

const free = ["5 agent messages per day", "Trade & launch from chat", "Gas-free launches (daily cap)", "100 API requests per day"];
const club = ["Unlimited agent messages (web, Telegram, X)", "1,000 API requests per day", "Priority access to new features", "Club badge on your launches", "Pay in ETH on Robinhood Chain"];

export default function Club() {
  const { address } = useAccount();
  const { token, signIn } = useSession();
  const { run, status } = useTxRunner();
  const [msg, setMsg] = useState<string>();
  const st = useQuery({
    queryKey: ["club-status", address],
    queryFn: async () => (await (await fetch(`/api/club/status${address ? `?address=${address}` : ""}`)).json()) as { club: boolean; expiresAt: number | null; messagesUsed: number; freeLimit: number },
  });

  async function join() {
    setMsg(undefined);
    if (!CLUB.treasury) return setMsg("Club payments are not configured on this deployment.");
    try {
      const hash = await run([{ to: CLUB.treasury as `0x${string}`, data: "0x", value: parseEther(CLUB.priceEth).toString(), description: "Club membership" }]);
      const r = await fetch("/api/club/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ txHash: hash, address }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setMsg("Welcome to Club! 🎉");
      if (!token) await signIn().catch(() => {});
      void st.refetch();
    } catch (e) {
      setMsg((e as { shortMessage?: string }).shortMessage || (e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Ponkr Club</h1>
        <p className="mt-2 text-muted">Unlimited agent. More API. First access to everything new.</p>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="card p-8">
          <div className="text-lg font-semibold">Free</div>
          <div className="mt-2 text-4xl font-bold">$0</div>
          <ul className="mt-6 space-y-2 text-sm text-muted">{free.map((f) => <li key={f}>✓ {f}</li>)}</ul>
        </div>
        <div className="card glow border-accent/40 p-8">
          <div className="text-lg font-semibold text-accent">Club</div>
          <div className="mt-2 text-4xl font-bold">{CLUB.priceEth} ETH<span className="text-base font-normal text-muted"> / {CLUB.periodDays} days</span></div>
          <ul className="mt-6 space-y-2 text-sm">{club.map((f) => <li key={f}>✓ {f}</li>)}</ul>
          <div className="mt-8">
            {!address ? <ConnectButton /> : st.data?.club ? (
              <div className="space-y-2 text-sm">
                <div className="text-up">✓ Active until {new Date(st.data.expiresAt!).toLocaleDateString()}</div>
                {!token && <button className="btn btn-ghost w-full" onClick={() => signIn()}>Sign in to use Club in chat</button>}
                <button className="btn btn-ghost w-full" onClick={join} disabled={status.state === "signing" || status.state === "pending"}>Extend {CLUB.periodDays} days</button>
              </div>
            ) : (
              <button className="btn btn-primary w-full" onClick={join} disabled={status.state === "signing" || status.state === "pending"}>
                {status.state === "signing" ? "Confirm in wallet…" : status.state === "pending" ? "Confirming…" : "Join Club"}
              </button>
            )}
            {msg && <p className="mt-3 text-sm text-muted">{msg}</p>}
            {st.data && !st.data.club && <p className="mt-3 text-xs text-muted">Today: {st.data.messagesUsed}/{st.data.freeLimit} free messages used.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
