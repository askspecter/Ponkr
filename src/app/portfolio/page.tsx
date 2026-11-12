"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { encodeFunctionData, erc20Abi, formatUnits, isAddress, parseEther, parseUnits, type Address } from "viem";
import { ArrowDownToLine, ArrowLeftRight, Check, Copy, ExternalLink, Search, Send } from "lucide-react";
import { Modal } from "@/components/Modal";
import { EmptyState, PageShell, Segmented } from "@/components/Page";
import { SignInButton } from "@/components/Providers";
import { TokenAvatar } from "@/components/TokenBits";
import { useAuth } from "@/hooks/useAuth";
import { useTxRunner } from "@/hooks/useTxRunner";
import { EXPLORER } from "@/lib/config";
import { fmtNum, fmtPrice, fmtUsd, shortAddr, timeAgo } from "@/lib/format";
import type { TokenView } from "@/lib/types";

interface Position {
  token: TokenView;
  balance: string;
  amount: number;
  valueUsd: number;
  valueEth: number;
  pnl: { pnlUsd: number; pnlPct: number; costUsd: number } | null;
}
interface Activity { side: "buy" | "sell"; token: string; symbol: string; name: string; logo: string; eth: number; tokens: number; timestamp: number; txHash: string }
interface Overview { address: string; ethUsdPrice: number; eth: { amount: number; valueUsd: number }; positions: Position[]; activity: Activity[]; totalUsd: number; totalPnlUsd: number }

const TABS = [["portfolio", "Portfolio"], ["activity", "Activity"]] as const;
type Tab = (typeof TABS)[number][0];

export default function WalletPage() {
  const { authenticated, address: active, wallets, useWallet: switchWallet } = useAuth();
  const [tab, setTab] = useState<Tab>("portfolio");
  const [kind, setKind] = useState<"embedded" | "external">("embedded");
  const [modal, setModal] = useState<"deposit" | "send" | "swap">();

  const embedded = wallets.find((w) => w.kind === "embedded");
  const external = wallets.find((w) => w.kind === "external");
  const hasBoth = Boolean(embedded && external);
  const view = (kind === "external" ? external : embedded) ?? embedded ?? external;
  const address = (view?.address ?? active) as Address | undefined;

  const q = useQuery({
    queryKey: ["wallet", address],
    enabled: !!address,
    queryFn: async () => {
      const r = await fetch(`/api/wallet/${address}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j as Overview;
    },
    refetchInterval: 20_000,
  });

  /** Actions sign with the wallet being viewed. */
  const openAction = async (m: "deposit" | "send" | "swap") => {
    if (m !== "deposit" && address && active && address.toLowerCase() !== active.toLowerCase()) await switchWallet(address);
    setModal(m);
  };

  if (!authenticated) {
    return (
      <PageShell>
        <WalletHeader />
        <EmptyState title="Sign in to see your wallet" description="Your balances, positions and activity appear here once you sign in." action={<SignInButton />} />
      </PageShell>
    );
  }

  const d = q.data;
  return (
    <PageShell>
      <WalletHeader tabs={<Segmented value={tab} options={TABS} onChange={setTab} />} />

      {hasBoth && (
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-md border border-line bg-panel p-1">
          {(["embedded", "external"] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={`rounded py-2 text-sm font-semibold transition ${kind === k ? "bg-panel-2 text-fg" : "text-muted hover:text-fg"}`}>
              {k === "embedded" ? "Trading" : "External"}
            </button>
          ))}
        </div>
      )}

      {tab === "portfolio" ? (
        <>
          <div className="card-hard p-5 md:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="label">Your balance</div>
                <div className="display text-4xl font-bold md:text-5xl">{d ? fmtUsd(d.totalUsd) : <span className="inline-block h-10 w-40 animate-pulse rounded bg-panel-2" />}</div>
                {d && d.totalPnlUsd !== 0 && (
                  <div className={`mono mt-1 text-sm ${d.totalPnlUsd >= 0 ? "text-up" : "text-down"}`}>{signedUsd(d.totalPnlUsd)} PnL on open positions</div>
                )}
              </div>
              <ChainPill />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <button className="btn btn-primary" onClick={() => openAction("deposit")}><ArrowDownToLine size={16} /> Deposit</button>
              <button className="btn btn-ghost" onClick={() => openAction("send")}><Send size={16} /> Send</button>
              <button className="btn btn-ghost" onClick={() => openAction("swap")}><ArrowLeftRight size={16} /> Swap</button>
            </div>
            {address && <AddressRow address={address} label={view?.kind === "external" ? view.label : "Trading wallet"} />}
          </div>
          <Holdings data={d} loading={q.isLoading} error={q.error as Error | null} />
        </>
      ) : (
        <ActivityList data={d} loading={q.isLoading} />
      )}

      {address && (
        <>
          <DepositModal open={modal === "deposit"} onClose={() => setModal(undefined)} address={address} />
          <SendModal open={modal === "send"} onClose={() => setModal(undefined)} data={d} />
          <SwapModal open={modal === "swap"} onClose={() => setModal(undefined)} data={d} address={address} />
        </>
      )}
    </PageShell>
  );
}

function WalletHeader({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div>
        <div className="label text-acid">Wallet</div>
        <h1 className="display text-3xl font-bold md:text-[2.6rem] md:leading-[1.1]">Your wallet</h1>
      </div>
      {tabs}
    </header>
  );
}

function ChainPill() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-line bg-panel-2 px-3 py-2 text-sm">
      <span className="flex h-5 w-5 items-center justify-center rounded bg-acid text-[10px] font-black text-black">R</span>
      Robinhood Chain
    </div>
  );
}

function AddressRow({ address, label }: { address: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm">
      <span className="text-muted">{label}</span>
      <button
        onClick={() => { void navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1300); }}
        className="mono flex items-center gap-2 hover:text-acid"
      >
        {shortAddr(address, 5)} {copied ? <Check size={14} className="text-acid" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

function Holdings({ data, loading, error }: { data?: Overview; loading: boolean; error: Error | null }) {
  const [q, setQ] = useState("");
  const [showSmall, setShowSmall] = useState(false);
  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase().replace(/^\$/, "");
    const eth = { kind: "eth" as const, name: "Ethereum", symbol: "ETH", valueUsd: data.eth.valueUsd, amount: data.eth.amount };
    const toks = data.positions.map((p) => ({ kind: "token" as const, p, name: p.token.name, symbol: p.token.symbol, valueUsd: p.valueUsd, amount: p.amount }));
    return [eth, ...toks].filter((r) => (showSmall || r.valueUsd >= 1 || r.kind === "eth") && (!needle || `${r.name} ${r.symbol}`.toLowerCase().includes(needle)));
  }, [data, q, showSmall]);
  const hidden = data ? data.positions.filter((p) => p.valueUsd < 1).length : 0;

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <label className="relative block w-full sm:w-72">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Search tokens" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="flex cursor-pointer items-center gap-3 text-sm text-muted">
          Show tokens under $1{hidden > 0 && !showSmall ? ` (${hidden})` : ""}
          <button
            role="switch"
            aria-checked={showSmall}
            onClick={() => setShowSmall(!showSmall)}
            className={`relative h-6 w-11 rounded-full border transition ${showSmall ? "border-acid bg-acid" : "border-line bg-panel-2"}`}
          >
            <span className={`absolute top-0.5 h-4.5 w-4.5 rounded-full transition-all ${showSmall ? "left-[22px] bg-black" : "left-0.5 bg-muted"}`} style={{ width: 18, height: 18 }} />
          </button>
        </label>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1.6fr)_1fr_1fr] gap-3 border-b border-line px-4 py-3 sm:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr]">
          {["Token", "Balance", "Value", "PnL"].map((h, i) => <div key={h} className={`label mb-0 ${i > 0 ? "text-right" : ""} ${i === 3 ? "hidden sm:block" : ""}`}>{h}</div>)}
        </div>
        {loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="mx-4 my-3 h-10 animate-pulse rounded bg-panel-2" />)}
        {error && <p className="p-6 text-center text-sm text-down">{error.message}</p>}
        {rows.map((r) => {
          const pnl = r.kind === "token" ? r.p.pnl : null;
          const pnlCell = pnl ? <span className={pnl.pnlUsd >= 0 ? "text-up" : "text-down"}>{signedUsd(pnl.pnlUsd)}<span className="block text-[10px] opacity-80">{pnl.pnlPct >= 0 ? "+" : ""}{pnl.pnlPct.toFixed(1)}%</span></span> : <span className="text-muted">n/a</span>;
          const inner = (
            <>
              <div className="flex min-w-0 items-center gap-3">
                {r.kind === "eth" ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-line bg-panel-2 font-bold">Ξ</div>
                ) : (
                  <TokenAvatar t={r.p.token} size={36} />
                )}
                <div className="min-w-0">
                  <div className="truncate font-semibold">{r.name}</div>
                  <div className="mono truncate text-xs text-muted">${r.symbol}{r.kind === "token" && <span className="hidden sm:inline"> · {fmtPrice(r.p.token.priceUsd)}</span>}</div>
                </div>
              </div>
              <div className="mono text-right text-sm">{r.kind === "eth" ? r.amount.toFixed(r.amount < 1 ? 5 : 3) : fmtNum(r.amount)}</div>
              <div className="text-right text-sm font-semibold">
                {fmtUsd(r.valueUsd)}
                {r.kind === "token" && <div className="mono text-[11px] font-normal sm:hidden">{pnlCell}</div>}
              </div>
              <div className="mono hidden text-right text-sm sm:block">{r.kind === "eth" ? <span className="text-muted">n/a</span> : pnlCell}</div>
            </>
          );
          const cls = "grid grid-cols-[minmax(0,1.6fr)_1fr_1fr] items-center gap-3 border-t border-line/60 px-4 py-3 first-of-type:border-t-0 sm:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr]";
          return r.kind === "token" ? (
            <Link key={r.p.token.token} href={`/token/${r.p.token.token}`} className={`${cls} transition hover:bg-panel-2`}>{inner}</Link>
          ) : (
            <div key="eth" className={cls}>{inner}</div>
          );
        })}
        {data && rows.length <= 1 && !data.positions.length && (
          <p className="border-t border-line/60 px-4 py-6 text-center text-sm text-muted">No launchpad tokens yet. <Link href="/launches" className="text-fg underline decoration-accent underline-offset-4">Discover tokens</Link></p>
        )}
      </div>
      <p className="mono mt-3 text-[11px] text-muted">PnL counts trades made on the bonding curve, including fees.</p>
    </div>
  );
}

function ActivityList({ data, loading }: { data?: Overview; loading: boolean }) {
  if (loading) return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="card h-16 animate-pulse" />)}</div>;
  if (!data?.activity.length) return <EmptyState title="No activity yet" description="Buys and sells you make on the launchpad show up here." action={<Link href="/trade" className="btn btn-primary">Start trading</Link>} />;
  return (
    <div className="card divide-y divide-line/60 overflow-hidden">
      {data.activity.map((a) => (
        <div key={a.txHash + a.side + a.tokens} className="flex items-center gap-3 px-4 py-3">
          <TokenAvatar t={{ logo: a.logo, symbol: a.symbol }} size={36} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`tag ${a.side === "buy" ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>{a.side === "buy" ? "Bought" : "Sold"}</span>
              <Link href={`/token/${a.token}`} className="truncate font-semibold hover:underline">${a.symbol}</Link>
            </div>
            <div className="mono mt-0.5 text-xs text-muted">{fmtNum(a.tokens)} tokens · {timeAgo(a.timestamp)}</div>
          </div>
          <div className="text-right">
            <div className={`mono text-sm font-semibold ${a.side === "buy" ? "text-fg" : "text-up"}`}>{a.side === "buy" ? "-" : "+"}{a.eth.toFixed(5)} ETH</div>
            <div className="mono text-[11px] text-muted">{fmtUsd(a.eth * data.ethUsdPrice)}</div>
          </div>
          <a href={`${EXPLORER}/tx/${a.txHash}`} target="_blank" rel="noreferrer" aria-label="View transaction" className="text-muted hover:text-acid"><ExternalLink size={15} /></a>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

function DepositModal({ open, onClose, address }: { open: boolean; onClose: () => void; address: string }) {
  const [qr, setQr] = useState<string>();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (open) void QRCode.toDataURL(address, { margin: 1, width: 440, color: { dark: "#0b0b0d", light: "#f2ecdf" } }).then(setQr);
  }, [open, address]);
  return (
    <Modal open={open} onClose={onClose} title="Deposit">
      <div className="flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {qr ? <img src={qr} alt="Wallet address QR code" className="h-52 w-52 rounded-md" /> : <div className="h-52 w-52 animate-pulse rounded-md bg-panel-2" />}
        <div className="mt-4 w-full rounded-md border border-line bg-panel-2 p-3">
          <div className="label">Your address</div>
          <div className="mono break-all text-sm">{address}</div>
        </div>
        <button className="btn btn-primary mt-3 w-full" onClick={() => { void navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1300); }}>
          {copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy address</>}
        </button>
        <p className="mt-4 text-center text-xs leading-relaxed text-muted">
          Send ETH or launchpad tokens on <b className="text-fg">Robinhood Chain</b> (chain ID 4663) only. Assets sent on other networks will not arrive.
        </p>
      </div>
    </Modal>
  );
}

function SendModal({ open, onClose, data }: { open: boolean; onClose: () => void; data?: Overview }) {
  const qc = useQueryClient();
  const { run, status, reset } = useTxRunner();
  const [asset, setAsset] = useState("ETH");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState<string>();
  const pos = data?.positions.find((p) => p.token.token === asset);
  const max = asset === "ETH" ? Math.max(0, (data?.eth.amount ?? 0) - 0.00002) : (pos?.amount ?? 0);
  const busy = status.state === "signing" || status.state === "pending";

  async function send() {
    setErr(undefined);
    reset();
    if (!isAddress(to)) return setErr("Enter a valid 0x address.");
    const n = Number(amount);
    if (!n || n <= 0) return setErr("Enter an amount.");
    if (n > max * 1.000001) return setErr("Amount is more than your balance.");
    try {
      if (asset === "ETH") {
        await run([{ to: to as Address, data: "0x", value: parseEther(amount as `${number}`).toString(), description: `Send ${amount} ETH` }]);
      } else {
        const value = parseUnits(amount, 18);
        await run([{ to: asset as Address, data: encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [to as Address, value] }), value: "0", description: `Send ${amount} $${pos?.token.symbol}` }]);
      }
      setAmount("");
      void qc.invalidateQueries({ queryKey: ["wallet"] });
    } catch (e) {
      setErr((e as { shortMessage?: string }).shortMessage || (e as Error).message);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Send">
      <label className="block">
        <span className="label">Asset</span>
        <select className="input" value={asset} onChange={(e) => { setAsset(e.target.value); setAmount(""); }}>
          <option value="ETH">ETH · {(data?.eth.amount ?? 0).toFixed(5)}</option>
          {data?.positions.map((p) => <option key={p.token.token} value={p.token.token}>${p.token.symbol} · {fmtNum(p.amount)}</option>)}
        </select>
      </label>
      <label className="mt-4 block">
        <span className="label">Recipient</span>
        <input className="input mono" placeholder="0x…" value={to} onChange={(e) => setTo(e.target.value.trim())} />
      </label>
      <label className="mt-4 block">
        <span className="label flex justify-between"><span>Amount</span><button type="button" className="text-acid" onClick={() => setAmount(asset !== "ETH" && pos ? formatUnits(BigInt(pos.balance), 18) : max.toFixed(6))}>Max</button></span>
        <input className="input" inputMode="decimal" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
      </label>
      <button className="btn btn-primary mt-5 w-full" disabled={busy} onClick={send}>
        {status.state === "signing" ? "Confirm in wallet" : status.state === "pending" ? "Sending" : "Send"}
      </button>
      {status.state === "done" && <a className="mt-3 block text-center text-sm text-up underline" href={`${EXPLORER}/tx/${status.hash}`} target="_blank" rel="noreferrer">Sent. View transaction</a>}
      {err && <p className="mt-3 text-center text-sm text-down">{err}</p>}
      <p className="mt-4 text-center text-xs text-muted">Transfers on Robinhood Chain cannot be reversed. Double check the recipient.</p>
    </Modal>
  );
}

function SwapModal({ open, onClose, data, address }: { open: boolean; onClose: () => void; data?: Overview; address: string }) {
  const qc = useQueryClient();
  const { run, status, reset } = useTxRunner();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<TokenView>();
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState<string>();
  const busy = status.state === "signing" || status.state === "pending";

  const results = useQuery({
    queryKey: ["swap-search", search],
    enabled: open && side === "buy" && search.trim().length > 1,
    queryFn: async () => ((await (await fetch(`/api/launches?q=${encodeURIComponent(search.trim())}&limit=6`)).json()) as { items: TokenView[] }).items,
  });
  const sellable = (data?.positions ?? []).filter((p) => !p.token.live.graduated && p.token.isNative);
  const pos = picked ? data?.positions.find((p) => p.token.token === picked.token) : undefined;

  const quote = useQuery({
    queryKey: ["swap-quote", picked?.token, side, amount],
    enabled: !!picked && Number(amount) > 0,
    queryFn: async () => {
      const r = await fetch(`/api/quote?token=${picked!.token}&side=${side}&amount=${amount}&wallet=${address}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j as { amountOut: string; priceImpactBps: string };
    },
  });

  async function swap() {
    setErr(undefined);
    reset();
    if (!picked) return setErr("Pick a token.");
    if (!(Number(amount) > 0)) return setErr("Enter an amount.");
    try {
      const r = await fetch("/api/tx/trade", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: picked.token, side, amount, wallet: address }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      await run(j.txs);
      setAmount("");
      void qc.invalidateQueries({ queryKey: ["wallet"] });
    } catch (e) {
      setErr((e as { shortMessage?: string }).shortMessage || (e as Error).message);
    }
  }

  const out = quote.data ? Number(quote.data.amountOut) / 1e18 : 0;
  return (
    <Modal open={open} onClose={onClose} title="Swap">
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-md bg-panel-2 p-1">
        {(["buy", "sell"] as const).map((s) => (
          <button key={s} onClick={() => { setSide(s); setPicked(undefined); setAmount(""); setErr(undefined); }} className={`rounded py-2 text-sm font-semibold ${side === s ? (s === "buy" ? "bg-up text-black" : "bg-down text-black") : "text-muted"}`}>
            {s === "buy" ? "ETH → Token" : "Token → ETH"}
          </button>
        ))}
      </div>

      {side === "buy" ? (
        picked ? (
          <PickedToken t={picked} onClear={() => setPicked(undefined)} />
        ) : (
          <div>
            <label className="relative block">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input className="input pl-9" placeholder="Search a token to buy" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            </label>
            <div className="mt-2 space-y-1">
              {results.data?.filter((t) => !t.live.graduated && t.isNative).map((t) => (
                <button key={t.token} onClick={() => setPicked(t)} className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-panel-2">
                  <TokenAvatar t={t} size={30} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{t.name} <span className="mono text-xs font-normal text-muted">${t.symbol}</span></span>
                  <span className="mono text-xs text-muted">{fmtUsd(t.marketCapUsd)}</span>
                </button>
              ))}
            </div>
          </div>
        )
      ) : picked ? (
        <PickedToken t={picked} onClear={() => setPicked(undefined)} />
      ) : (
        <div className="space-y-1">
          {!sellable.length && <p className="py-4 text-center text-sm text-muted">No tokens to sell on the bonding curve.</p>}
          {sellable.map((p) => (
            <button key={p.token.token} onClick={() => setPicked(p.token)} className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-panel-2">
              <TokenAvatar t={p.token} size={30} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">${p.token.symbol}</span>
              <span className="mono text-xs text-muted">{fmtNum(p.amount)}</span>
            </button>
          ))}
        </div>
      )}

      {picked && (
        <>
          <label className="mt-4 block">
            <span className="label flex justify-between">
              <span>{side === "buy" ? "You pay (ETH)" : `You sell ($${picked.symbol})`}</span>
              <button type="button" className="text-acid" onClick={() => setAmount(side === "buy" ? String(Math.max(0, (data?.eth.amount ?? 0) - 0.0002).toFixed(6)) : pos ? formatUnits(BigInt(pos.balance), 18) : "0")}>Max</button>
            </span>
            <input className="input text-lg" inputMode="decimal" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
          </label>
          <div className="mt-3 flex justify-between text-sm">
            <span className="text-muted">You receive (est.)</span>
            <span className="mono">{quote.data ? (side === "buy" ? `${fmtNum(out)} $${picked.symbol}` : `${out.toFixed(6)} ETH`) : "n/a"}</span>
          </div>
          <button className="btn btn-primary mt-5 w-full" disabled={busy} onClick={swap}>
            {status.state === "signing" ? "Confirm in wallet" : status.state === "pending" ? "Swapping" : side === "buy" ? `Buy $${picked.symbol}` : `Sell $${picked.symbol}`}
          </button>
        </>
      )}
      {status.state === "done" && <a className="mt-3 block text-center text-sm text-up underline" href={`${EXPLORER}/tx/${status.hash}`} target="_blank" rel="noreferrer">Done. View transaction</a>}
      {(err || quote.error) && <p className="mt-3 text-center text-sm text-down">{err || (quote.error as Error).message}</p>}
    </Modal>
  );
}

function PickedToken({ t, onClear }: { t: TokenView; onClear: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-panel-2 p-3">
      <TokenAvatar t={t} size={36} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{t.name}</div>
        <div className="mono text-xs text-muted">${t.symbol} · {fmtPrice(t.priceUsd)}</div>
      </div>
      <button onClick={onClear} className="text-xs text-muted underline hover:text-fg">Change</button>
    </div>
  );
}

function signedUsd(n: number) {
  return `${n >= 0 ? "+" : "-"}${fmtUsd(Math.abs(n))}`;
}
