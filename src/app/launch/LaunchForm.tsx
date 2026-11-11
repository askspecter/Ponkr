"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useClub } from "@/hooks/useClub";
import { CLUB } from "@/lib/config";
import { fmtNum } from "@/lib/format";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { useSignMessage } from "wagmi";
import { SignInButton } from "@/components/Providers";
import { useAuth } from "@/hooks/useAuth";
import { TokenAvatar, Progress } from "@/components/TokenBits";
import { useTxRunner } from "@/hooks/useTxRunner";
import { sponsoredLaunchMessage } from "@/lib/messages";
import { EXPLORER, ipfsToHttp } from "@/lib/config";

export function LaunchForm() {
  const { address, authHeaders } = useAuth();
  const router = useRouter();
  const { signMessageAsync } = useSignMessage();
  const { run, status } = useTxRunner();
  const { data: club } = useClub();
  const cfg = club;

  const [f, setF] = useState({ name: "", symbol: "", description: "", logo: "", twitter: "", telegram: "", website: "", discord: "", farcaster: "", feeRecipient: "", creatorTax: 1, buyback: false, initialBuy: "", mode: "wallet" as "wallet" | "sponsored" });
  const [preview, setPreview] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ token?: string; tx?: string }>();

  useEffect(() => {
    if (address && !f.feeRecipient) setF((x) => ({ ...x, feeRecipient: address }));
  }, [address, f.feeRecipient]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function upload(file: File) {
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setError(undefined);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setF((x) => ({ ...x, logo: j.uri }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (!address) return setError("Connect your wallet first");
    if (!isAddress(f.feeRecipient)) return setError("Fee recipient must be a valid 0x address");
    const body = {
      name: f.name,
      symbol: f.symbol,
      logo: f.logo,
      description: f.description,
      socials: { twitter: f.twitter, telegram: f.telegram, website: f.website, discord: f.discord, farcaster: f.farcaster },
      feeRecipient: f.feeRecipient,
      creatorTaxBps: Math.round(f.creatorTax * 100),
      buybackEnabled: f.buyback,
    };
    setBusy(true);
    try {
      if (f.mode === "sponsored") {
        const nonce = String(Date.now());
        const signature = await signMessageAsync({ message: sponsoredLaunchMessage(f.symbol, f.feeRecipient, nonce) });
        const r = await fetch("/api/launch/sponsored", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, owner: address, nonce, signature }) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setDone({ token: j.token, tx: j.txHash });
        if (j.token) router.push(`/token/${j.token}?new=1`);
      } else {
        const r = await fetch("/api/launch/prepare", { method: "POST", headers: { "content-type": "application/json", ...(await authHeaders()) }, body: JSON.stringify({ ...body, initialBuyEth: f.initialBuy || undefined, sender: address }) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        const hash = await run([j.tx]);
        setDone({ token: j.predicted?.token, tx: hash });
        if (j.predicted?.token) setTimeout(() => router.push(`/token/${j.predicted.token}?new=1`), 1200);
      }
    } catch (e) {
      setError((e as { shortMessage?: string }).shortMessage || (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const img = preview || ipfsToHttp(f.logo);
  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="card space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Name</label><input className="input" required maxLength={32} value={f.name} onChange={set("name")} placeholder="Moon Cat" /></div>
          <div><label className="label">Ticker</label><input className="input uppercase" required maxLength={10} value={f.symbol} onChange={(e) => setF({ ...f, symbol: e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() })} placeholder="MCAT" /></div>
        </div>
        <div>
          <label className="label">Logo</label>
          <div className="flex items-center gap-4">
            <label className="flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-line bg-panel-2 text-xs text-muted hover:border-accent">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : uploading ? "Uploading…" : "Upload"}
              <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
            <div className="flex-1">
              <input className="input mono text-xs" value={f.logo} onChange={set("logo")} placeholder="ipfs://… (filled in after upload)" />
              <p className="mt-1 text-xs text-muted">PNG, JPEG, GIF or WebP up to 5MB. Stored on IPFS.</p>
            </div>
          </div>
        </div>
        <div><label className="label">Description</label><textarea className="input" rows={3} maxLength={500} value={f.description} onChange={set("description")} placeholder="What's the story?" /></div>
        <details className="rounded-md border border-line p-4" open>
          <summary className="cursor-pointer text-sm font-semibold">Socials (optional)</summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input className="input" value={f.twitter} onChange={set("twitter")} placeholder="X profile URL" />
            <input className="input" value={f.telegram} onChange={set("telegram")} placeholder="Telegram URL" />
            <input className="input" value={f.website} onChange={set("website")} placeholder="Website" />
            <input className="input" value={f.discord} onChange={set("discord")} placeholder="Discord" />
            <input className="input" value={f.farcaster} onChange={set("farcaster")} placeholder="Farcaster" />
          </div>
        </details>
        <details className="rounded-md border border-line p-4" open>
          <summary className="cursor-pointer text-sm font-semibold">Fees</summary>
          <div className="mt-4 space-y-4">
            <div>
              <label className="label">Fee recipient</label>
              <input className="input mono text-xs" value={f.feeRecipient} onChange={set("feeRecipient")} placeholder="0x…" />
              <p className="mt-1 text-xs text-muted">Receives the creator share of every trade. Use a teammate, treasury or splitter contract to redirect fees.</p>
            </div>
            <div>
              <label className="label">Creator tax: {f.creatorTax}%</label>
              <input type="range" min={0} max={10} step={0.5} value={f.creatorTax} onChange={(e) => setF({ ...f, creatorTax: Number(e.target.value) })} className="w-full accent-[var(--accent)]" />
              <p className="text-xs text-muted">Extra fee on each trade paid 100% to you, on top of your 70% share of the 1% trading fee. Fixed at launch.</p>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.buyback} onChange={(e) => setF({ ...f, buyback: e.target.checked })} /> Route part of fees to automatic token buybacks (vested)</label>
          </div>
        </details>
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <div className="label">Preview</div>
          <div className="flex items-center gap-3">
            <TokenAvatar t={{ logo: f.logo, symbol: f.symbol || "?" }} size={56} />
            <div><div className="font-semibold">{f.name || "Token name"}</div><div className="text-sm text-muted">${f.symbol || "TICKER"}</div></div>
          </div>
          <div className="mt-4"><Progress pct={0} /></div>
          <div className="mt-1 text-right text-[11px] text-muted">0% bonded</div>
        </div>
        <div className="card space-y-4 p-5">
          <div className="label">Launch mode</div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setF({ ...f, mode: "wallet" })} className={`rounded-md border p-3 text-left text-xs ${f.mode === "wallet" ? "border-accent" : "border-line"}`}>
              <div className="font-semibold text-sm">My wallet</div>Pay ~0.0005 ETH + gas. Optional first buy.
            </button>
            <button type="button" disabled={!cfg?.sponsoredLaunches} onClick={() => setF({ ...f, mode: "sponsored" })} className={`rounded-md border p-3 text-left text-xs disabled:opacity-40 ${f.mode === "sponsored" ? "border-accent" : "border-line"}`}>
              <div className="font-semibold text-sm">Gasless</div>{cfg?.sponsoredLaunches ? "We pay the launch. Sign a message." : "Unavailable"}
            </button>
          </div>
          {f.mode === "wallet" && (
            <div>
              <label className="label">Initial buy (ETH, optional)</label>
              <input className="input" inputMode="decimal" value={f.initialBuy} onChange={set("initialBuy")} placeholder="0.01" />
              <p className="mt-1 text-xs text-muted">Bought in the same transaction, exempt from the anti snipe tax.</p>
            </div>
          )}
          {!address ? (
            <SignInButton className="btn btn-primary w-full" />
          ) : club && !club.club ? (
            <div className="rounded-md border border-acid/40 bg-acid/5 p-4 text-sm">
              <div className="flex items-center gap-2 font-semibold text-acid"><Lock size={15} /> Club members only</div>
              <p className="mt-1 text-muted">
                Hold {CLUB.minHold.toLocaleString("en-US")} ${CLUB.symbol} to launch. You hold {fmtNum(club.balance, 0)}.
              </p>
              <Link href="/club" className="btn btn-acid mt-3 w-full">Join Club</Link>
            </div>
          ) : (
            <button className="btn btn-primary w-full" disabled={busy || uploading || !f.logo}>
              {busy ? (status.state === "signing" ? "Confirm in wallet…" : status.state === "pending" ? "Launching…" : "Preparing…") : `Launch $${f.symbol || "TOKEN"}`}
            </button>
          )}
          {!f.logo && <p className="text-xs text-muted">Upload a logo to continue.</p>}
          {error && <p className="text-xs text-down">{error}</p>}
          {done?.tx && <a className="block text-xs text-up underline" href={`${EXPLORER}/tx/${done.tx}`} target="_blank" rel="noreferrer">Launched. View transaction</a>}
        </div>
      </div>
    </form>
  );
}
