"use client";

import Link from "next/link";
import { Check, Lock, Rocket } from "lucide-react";
import { SignInButton } from "@/components/Providers";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useClub } from "@/hooks/useClub";
import { CLUB } from "@/lib/config";
import { fmtNum } from "@/lib/format";

const free = ["5 agent messages per day", "Research, trade and track your wallet", "100 API requests per day"];
const perks = ["Launch tokens from chat, the launch form, the API and X", "Unlimited agent messages", "1,000 API requests per day", "Early access to upcoming features"];

export default function Club() {
  const { authenticated } = useAuth();
  const { data } = useClub();
  const need = CLUB.minHold;
  const have = data?.balance ?? 0;
  const pct = Math.min(100, (have / need) * 100);
  const live = Boolean(CLUB.token);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="text-center">
        <Logo className="mx-auto h-14 w-14" />
        <h1 className="display mt-4 text-4xl font-bold md:text-5xl">Kekr Club</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted">
          Hold <b className="text-fg">{need.toLocaleString("en-US")} ${CLUB.symbol}</b> and you are in. Club members are the only ones who can launch tokens on Kekr.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-[1fr_1.3fr]">
        <div className="card p-8">
          <div className="label">Everyone</div>
          <div className="display text-3xl font-bold">Free</div>
          <ul className="mt-6 space-y-2.5 text-sm text-muted">
            {free.map((f) => <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0" /> {f}</li>)}
            <li className="flex gap-2 text-muted/60"><Lock size={16} className="mt-0.5 shrink-0" /> Launching tokens</li>
          </ul>
        </div>

        <div className="card-hard border-accent p-8">
          <div className="label text-acid">Club</div>
          <div className="display text-3xl font-bold">Hold {fmtNum(need, 0)} ${CLUB.symbol}</div>
          <ul className="mt-6 space-y-2.5 text-sm">
            {perks.map((f) => <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-acid" /> {f}</li>)}
          </ul>

          <div className="mt-8 rounded-md border border-line bg-panel-2 p-4">
            {!authenticated ? (
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted">Sign in to check your wallet.</span>
                <SignInButton />
              </div>
            ) : data?.club ? (
              <div>
                <div className="display text-xl font-bold text-acid">You are in the Club.</div>
                <p className="mt-1 text-sm text-muted">{data.allowlisted ? "Team wallet." : `Holding ${fmtNum(have, 0)} $${CLUB.symbol}.`} Launching is unlocked.</p>
                <Link href="/launch" className="btn btn-primary mt-4"><Rocket size={16} /> Launch a token</Link>
              </div>
            ) : (
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="label mb-0">Your ${CLUB.symbol}</span>
                  <span className="mono text-sm">{fmtNum(have, 0)} / {fmtNum(need, 0)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg"><div className="h-full bg-acid" style={{ width: `${Math.max(1, pct)}%` }} /></div>
                <p className="mt-3 text-sm text-muted">
                  {live
                    ? `Pick up ${fmtNum(Math.max(0, need - have), 0)} more $${CLUB.symbol} to unlock launching. Membership updates within a minute of your balance changing.`
                    : `$${CLUB.symbol} is not live yet. Club opens the moment it launches.`}
                </p>
                {live && <Link href={`/token/${CLUB.token}`} className="btn btn-acid mt-4">Get ${CLUB.symbol}</Link>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card mt-6 p-6 text-sm text-muted">
        <div className="label">How it works</div>
        Membership is checked live from your wallet balance. There is nothing to pay or renew: keep {fmtNum(need, 0)} ${CLUB.symbol} in the wallet you sign in with and Club stays on. Drop below and launching locks again.
      </div>
    </div>
  );
}
