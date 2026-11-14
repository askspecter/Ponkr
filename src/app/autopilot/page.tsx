"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { parseEther, type Address } from "viem";
import { ArrowDownToLine, ArrowUpFromLine, Bot, Check, Copy, ExternalLink, Pause, Play, X } from "lucide-react";
import { Modal } from "@/components/Modal";
import { EmptyState, PageShell } from "@/components/Page";
import { SignInButton } from "@/components/Providers";
import { useAuth } from "@/hooks/useAuth";
import { useTxRunner } from "@/hooks/useTxRunner";
import { EXPLORER } from "@/lib/config";
import { fmtNum, fmtUsd, shortAddr, timeAgo } from "@/lib/format";

interface Rule { id: string; kind: "buy" | "sell" | "follow"; status: "active" | "done" | "cancelled" | "failed"; label: string; createdAt: number; firedAt?: number; txHash?: string; lastError?: string }
interface Overview {
  enabled: boolean;
  signedIn: boolean;
  address?: string;
  eth: number;
  holdings: { token: string; symbol: string; amount: number; valueUsd: number }[];
  rules: Rule[];
  settings: { dailyLimitEth: number; paused: boolean };
  spentToday: number;
}

const STATUS: Record<Rule["status"], string> = {
  active: "bg-acid text-black",
  done: "bg-up/15 text-up",
  cancelled: "bg-panel-2 text-muted",
  failed: "bg-down/15 text-down",
};

export default function AutopilotPage() {
  const { authenticated, address, authHeaders } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [fund, setFund] = useState(false);

  const q = useQuery({
    queryKey: ["autopilot", address],
    enabled: !!address,
    refetchInterval: 15_000,
    queryFn: async () => {
      const r = await fetch(`/api/autopilot?address=${address}`, { headers: await authHeaders() });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j as Overview;
    },
  });

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    setError(undefined);
    try {
      const r = await fetch("/api/autopilot", { method: "POST", headers: { "content-type": "application/json", ...(await authHeaders()) }, body: JSON.stringify({ address, action, ...extra }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      await qc.invalidateQueries({ queryKey: ["autopilot"] });
      return j;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(undefined);
    }
  }

  const header = (
    <header className="mb-6 border-b border-line pb-6">
      <div className="label text-acid">Agent</div>
      <h1 className="display text-3xl font-bold md:text-[2.6rem] md:leading-[1.1]">Autopilot</h1>
      <p className="mt-2 max-w-2xl text-muted">Set the rule once. Kekr watches the chain every minute and trades for you from a separate Autopilot wallet, within a daily limit you control.</p>
    </header>
  );

  if (!authenticated) {
    return (
      <PageShell>
        {header}
        <EmptyState title="Sign in to use Autopilot" description="Your Autopilot wallet and rules are tied to your account." action={<SignInButton />} />
      </PageShell>
    );
  }

  const d = q.data;
  if (d && !d.enabled) {
    return (
      <PageShell>
        {header}
        <EmptyState title="Autopilot is warming up" description="This feature is being switched on. Check back soon." />
      </PageShell>
    );
  }

  return (
    <PageShell>
      {header}
      {error && <p className="mb-4 rounded-md border border-down/40 bg-down/10 px-4 py-3 text-sm text-down">{error}</p>}

      {q.isLoading && <div className="card h-48 animate-pulse" />}

      {d && !d.address && (
        <div className="card-hard p-6 md:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-acid text-black"><Bot size={26} /></div>
          <h2 className="display mt-5 text-2xl font-bold">Create your Autopilot wallet</h2>
          <ol className="mt-4 space-y-3 text-sm text-muted">
            {[
              ["Create", "Kekr makes a separate wallet just for Autopilot. Your main wallet is never touched."],
              ["Fund", "Send it a budget, for example 0.05 ETH. That is all Autopilot can ever spend."],
              ["Set rules", "Buy when a market cap drops, take profit when it pumps, or buy every launch from a creator."],
              ["Withdraw", "Send everything back to your own wallet with one click, any time."],
            ].map(([t, s], i) => (
              <li key={t} className="flex gap-3"><span className="mono flex h-6 w-6 shrink-0 items-center justify-center rounded bg-panel-2 text-xs text-fg">{i + 1}</span><span><b className="text-fg">{t}.</b> {s}</span></li>
            ))}
          </ol>
          <button className="btn btn-primary mt-6" disabled={busy === "setup"} onClick={() => act("setup")}>{busy === "setup" ? "Creating" : "Create Autopilot wallet"}</button>
        </div>
      )}

      {d?.address && (
        <>
          <WalletCard d={d} busy={busy} onFund={() => setFund(true)} onAct={act} />
          <RuleForm busy={busy === "rule"} onCreate={(rule) => act("rule", { rule })} />
          <section className="mt-8">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="display text-xl font-bold">Rules</h2>
              <span className="mono text-xs text-muted">Checked about every minute</span>
            </div>
            {!d.rules.length && <p className="card px-4 py-8 text-center text-sm text-muted">No rules yet. Add one above, or tell Kekr in <Link href="/chat" className="text-fg underline decoration-accent underline-offset-4">chat</Link>: “Buy 0.01 ETH of $GM if market cap drops to $20K”.</p>}
            <div className="space-y-2">
              {d.rules.map((r) => (
                <div key={r.id} className="card flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className={`tag ${STATUS[r.status]}`}>{r.status}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{r.label}</div>
                    <div className="mono mt-0.5 text-[11px] text-muted">
                      created {timeAgo(Math.floor(r.createdAt / 1000))}
                      {r.firedAt ? ` · fired ${timeAgo(Math.floor(r.firedAt / 1000))}` : ""}
                      {r.lastError && r.status === "active" ? <span className="text-down"> · waiting: {r.lastError}</span> : ""}
                    </div>
                  </div>
                  {r.txHash && <a href={`${EXPLORER}/tx/${r.txHash}`} target="_blank" rel="noreferrer" className="text-muted hover:text-acid" aria-label="View transaction"><ExternalLink size={15} /></a>}
                  {r.status === "active" && <button className="btn btn-ghost px-3 py-1.5 text-xs" disabled={busy === "cancel"} onClick={() => act("cancel", { id: r.id })}><X size={13} /> Cancel</button>}
                </div>
              ))}
            </div>
          </section>
          <FundModal open={fund} onClose={() => setFund(false)} to={d.address as Address} onDone={() => qc.invalidateQueries({ queryKey: ["autopilot"] })} />
        </>
      )}
    </PageShell>
  );
}

function WalletCard({ d, busy, onFund, onAct }: { d: Overview; busy?: string; onFund: () => void; onAct: (a: string, x?: Record<string, unknown>) => Promise<unknown> }) {
  const [copied, setCopied] = useState(false);
  const [limit, setLimit] = useState("");
  const [confirmOut, setConfirmOut] = useState(false);
  const pct = Math.min(100, (d.spentToday / d.settings.dailyLimitEth) * 100);
  return (
    <div className="card-hard p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="label">Autopilot balance</div>
          <div className="display text-4xl font-bold">{d.eth.toFixed(d.eth < 1 ? 5 : 3)} <span className="text-2xl text-muted">ETH</span></div>
          <button onClick={() => { void navigator.clipboard.writeText(d.address!); setCopied(true); setTimeout(() => setCopied(false), 1300); }} className="mono mt-2 flex items-center gap-2 text-sm text-muted hover:text-acid">
            {shortAddr(d.address!, 5)} {copied ? <Check size={13} className="text-acid" /> : <Copy size={13} />}
          </button>
        </div>
        <span className={`tag ${d.settings.paused ? "bg-panel-2 text-muted" : "bg-up/15 text-up"}`}>{d.settings.paused ? "Paused" : "Running"}</span>
      </div>

      <div className="mt-5">
        <div className="mono flex justify-between text-xs text-muted"><span>Spent today</span><span>{d.spentToday.toFixed(4)} / {d.settings.dailyLimitEth} ETH</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded bg-panel-2"><div className="h-full bg-acid" style={{ width: `${pct}%` }} /></div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button className="btn btn-primary" onClick={onFund}><ArrowDownToLine size={16} /> Fund</button>
        {confirmOut ? (
          <button className="btn btn-ghost border-down text-down" disabled={busy === "withdraw"} onClick={async () => { await onAct("withdraw"); setConfirmOut(false); }}>{busy === "withdraw" ? "Sending" : "Confirm withdraw"}</button>
        ) : (
          <button className="btn btn-ghost" onClick={() => setConfirmOut(true)}><ArrowUpFromLine size={16} /> Withdraw all</button>
        )}
        <button className="btn btn-ghost col-span-2 sm:col-span-1" disabled={busy === "settings"} onClick={() => onAct("settings", { settings: { paused: !d.settings.paused } })}>
          {d.settings.paused ? <><Play size={16} /> Resume</> : <><Pause size={16} /> Pause</>}
        </button>
      </div>
      {confirmOut && <p className="mt-2 text-xs text-muted">Sends all tokens and ETH in the Autopilot wallet back to your own wallet.</p>}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-sm">
        <span className="text-muted">Daily limit</span>
        <input className="input w-28 py-1.5" inputMode="decimal" placeholder={String(d.settings.dailyLimitEth)} value={limit} onChange={(e) => setLimit(e.target.value.replace(/[^0-9.]/g, ""))} />
        <span className="text-muted">ETH</span>
        <button className="btn btn-ghost px-3 py-1.5 text-xs" disabled={!limit || busy === "settings"} onClick={async () => { await onAct("settings", { settings: { dailyLimitEth: Number(limit) } }); setLimit(""); }}>Save</button>
      </div>

      {d.holdings.length > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <div className="label">Holdings</div>
          <div className="mt-2 space-y-1.5">
            {d.holdings.map((h) => (
              <Link key={h.token} href={`/token/${h.token}`} className="flex justify-between text-sm hover:text-acid"><span className="font-semibold">${h.symbol}</span><span className="mono text-muted">{fmtNum(h.amount)} · {fmtUsd(h.valueUsd)}</span></Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const METRICS = [["mcapUsd", "Market cap ($)"], ["priceUsd", "Price ($)"], ["progress", "Curve progress (%)"]] as const;

function RuleForm({ busy, onCreate }: { busy: boolean; onCreate: (r: Record<string, unknown>) => Promise<unknown> }) {
  const [kind, setKind] = useState<"buy" | "sell" | "follow">("buy");
  const [token, setToken] = useState("");
  const [creator, setCreator] = useState("");
  const [metric, setMetric] = useState<string>("mcapUsd");
  const [op, setOp] = useState<"lte" | "gte">("lte");
  const [value, setValue] = useState("");
  const [amount, setAmount] = useState("");
  const [maxBuys, setMaxBuys] = useState("3");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const rule = kind === "follow"
      ? { kind, creator, ethAmount: Number(amount), maxBuys: Number(maxBuys) }
      : { kind, token, metric, op, value: Number(value), ...(kind === "buy" ? { ethAmount: Number(amount) } : { percent: Number(amount) }) };
    const ok = await onCreate(rule);
    if (ok) { setValue(""); setAmount(""); }
  }

  return (
    <form onSubmit={submit} className="card mt-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="display text-xl font-bold">New rule</h2>
        <div className="grid grid-cols-3 gap-1 rounded-md bg-panel-2 p-1 text-sm">
          {([["buy", "Buy when"], ["sell", "Sell when"], ["follow", "Follow creator"]] as const).map(([k, l]) => (
            <button type="button" key={k} onClick={() => { setKind(k); setOp(k === "sell" ? "gte" : "lte"); }} className={`rounded px-3 py-1.5 font-semibold ${kind === k ? "bg-panel text-fg" : "text-muted"}`}>{l}</button>
          ))}
        </div>
      </div>

      {kind === "follow" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="sm:col-span-3"><span className="label">Creator wallet</span><input id="ap-creator" className="input mono" placeholder="0x…" value={creator} onChange={(e) => setCreator(e.target.value.trim())} /></label>
          <label><span className="label">ETH per launch</span><input id="ap-follow-eth" className="input" inputMode="decimal" placeholder="0.005" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} /></label>
          <label><span className="label">Up to</span><input id="ap-follow-max" className="input" inputMode="numeric" value={maxBuys} onChange={(e) => setMaxBuys(e.target.value.replace(/[^0-9]/g, ""))} /></label>
          <p className="self-end pb-2 text-xs text-muted">Buys every token this wallet launches from now on.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="sm:col-span-2 lg:col-span-1"><span className="label">Token</span><input id="ap-token" className="input" placeholder="$GM or 0x…" value={token} onChange={(e) => setToken(e.target.value.trim())} /></label>
          <label><span className="label">When</span>
            <select id="ap-metric" className="input" value={metric} onChange={(e) => setMetric(e.target.value)}>{METRICS.map(([m, l]) => <option key={m} value={m}>{l}</option>)}</select>
          </label>
          <label><span className="label">{op === "lte" ? "Falls to" : "Reaches"}</span>
            <div className="flex gap-1">
              <select id="ap-op" className="input w-20 px-2" value={op} onChange={(e) => setOp(e.target.value as "lte" | "gte")}><option value="lte">≤</option><option value="gte">≥</option></select>
              <input id="ap-value" className="input" inputMode="decimal" placeholder={metric === "progress" ? "90" : metric === "priceUsd" ? "0.00002" : "20000"} value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))} />
            </div>
          </label>
          <label><span className="label">{kind === "buy" ? "Buy with (ETH)" : "Sell (% of bag)"}</span><input id="ap-amount" className="input" inputMode="decimal" placeholder={kind === "buy" ? "0.01" : "50"} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} /></label>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">Sell rules sell what the Autopilot wallet holds. Max {kind === "sell" ? "100%" : "0.1 ETH"} per trade.</p>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Saving" : "Add rule"}</button>
      </div>
    </form>
  );
}

function FundModal({ open, onClose, to, onDone }: { open: boolean; onClose: () => void; to: Address; onDone: () => void }) {
  const { run, status, reset } = useTxRunner();
  const [amount, setAmount] = useState("0.02");
  const [err, setErr] = useState<string>();
  const busy = status.state === "signing" || status.state === "pending";
  async function send() {
    setErr(undefined);
    reset();
    if (!(Number(amount) > 0)) return setErr("Enter an amount.");
    try {
      await run([{ to, data: "0x", value: parseEther(amount as `${number}`).toString(), description: `Fund Autopilot with ${amount} ETH` }]);
      onDone();
    } catch (e) {
      setErr((e as { shortMessage?: string }).shortMessage || (e as Error).message);
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Fund Autopilot">
      <p className="text-sm text-muted">Send ETH from your wallet to your Autopilot wallet. Autopilot can only spend what is here, up to your daily limit.</p>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {["0.01", "0.02", "0.05", "0.1"].map((v) => <button key={v} type="button" onClick={() => setAmount(v)} className={`btn ${amount === v ? "btn-primary" : "btn-ghost"} px-2 py-2 text-sm`}>{v}</button>)}
      </div>
      <label className="mt-4 block"><span className="label">Amount (ETH)</span><input id="ap-fund" className="input text-lg" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} /></label>
      <button className="btn btn-primary mt-5 w-full" disabled={busy} onClick={send}>{status.state === "signing" ? "Confirm in wallet" : status.state === "pending" ? "Sending" : `Send ${amount} ETH`}</button>
      {status.state === "done" && <a className="mt-3 block text-center text-sm text-up underline" href={`${EXPLORER}/tx/${status.hash}`} target="_blank" rel="noreferrer">Funded. View transaction</a>}
      {err && <p className="mt-3 text-center text-sm text-down">{err}</p>}
    </Modal>
  );
}
