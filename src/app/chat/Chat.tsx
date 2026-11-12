"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Paperclip, Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Markdown } from "@/components/Markdown";
import { TxCard } from "@/components/TxCard";
import { useAuth } from "@/hooks/useAuth";
import { EXPLORER } from "@/lib/config";
import type { TxReq } from "@/hooks/useTxRunner";

type Action =
  | { type: "txs"; title: string; txs: TxReq[]; summary?: Record<string, string> }
  | { type: "token"; token: string; symbol: string }
  | { type: "launched"; token?: string; symbol: string; txHash: string };

interface Msg {
  role: "user" | "assistant";
  content: string;
  actions?: Action[];
  image?: string;
  error?: boolean;
}

const STORE = "ponkr-chat";
const suggestions = [
  ["Trending", "What's trending on the launchpad right now?"],
  ["Graduating", "Show the tokens closest to graduating"],
  ["My bags", "What's in my wallet?"],
  ["Launch", "Launch a token called Moon Cat, ticker MCAT, generate a logo"],
  ["Buy", "Buy 0.005 ETH of the newest token"],
  ["Fees", "How much can I claim in creator fees?"],
];

export function Chat() {
  const params = useSearchParams();
  const { address, authenticated, login, authHeaders } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [upgrade, setUpgrade] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const started = useRef<string | null>(null);

  useEffect(() => {
    if (params.get("new")) {
      setMsgs([]);
      return;
    }
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) setMsgs(JSON.parse(raw));
    } catch {}
  }, [params]);
  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(msgs.slice(-40)));
    } catch {}
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: text, image }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    const img = image;
    setImage(undefined);
    try {
      const r = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({
          messages: next.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.image ? `${m.content}\n[attached image: ${m.image}]` : m.content })),
          wallet: address,
          image: img,
        }),
      });
      // A platform timeout answers with plain text instead of JSON.
      const j = (await r.json().catch(() => ({ error: "Kekr took too long on that one. Try again, or ask something narrower." }))) as { text?: string; actions?: Msg["actions"]; error?: string; upgrade?: boolean };
      if (!r.ok || !j.text) {
        if (j.upgrade) setUpgrade(true);
        setMsgs((m) => [...m, { role: "assistant", content: j.error || "Something went wrong.", error: true }]);
      } else {
        setMsgs((m) => [...m, { role: "assistant", content: j.text!, actions: j.actions }]);
      }
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: (e as Error).message, error: true }]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const q = params.get("q");
    if (q && started.current !== q) {
      started.current = q;
      void send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function upload(f: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setImage(j.uri);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-4">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pb-4 pt-6">
        {msgs.length === 0 && (
          <div className="pt-10 text-center md:pt-20">
            <Logo className="mx-auto h-16 w-16" />
            <h1 className="display mt-5 text-3xl font-bold md:text-4xl">What are we doing today?</h1>
            <p className="mt-2 text-sm text-muted">Research, trade and launch tokens by chatting. You approve every transaction.</p>
            <div className="mx-auto mt-8 grid max-w-2xl gap-2 text-left sm:grid-cols-2">
              {suggestions.map(([k, s]) => (
                <button key={s} onClick={() => send(s)} className="card group p-3 transition hover:border-accent/60">
                  <div className="tag inline-block bg-panel-2 text-acid">{k}</div>
                  <div className="mt-1.5 text-sm text-fg/80 group-hover:text-fg">{s}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            {m.role === "user" ? (
              <div className="max-w-[85%] rounded-md border border-accent/40 bg-accent/15 px-4 py-2.5 text-sm">
                {m.content}
                {m.image && <div className="mono mt-1 text-[11px] text-muted">image attached</div>}
              </div>
            ) : (
              <div className="flex gap-3">
                <Logo className="mt-0.5 h-7 w-7 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className={m.error ? "text-sm text-down" : ""}><Markdown text={m.content} /></div>
                  {m.actions?.map((a, j) =>
                    a.type === "txs" ? (
                      <TxCard key={j} title={a.title} txs={a.txs} summary={a.summary} />
                    ) : a.type === "token" ? (
                      <Link key={j} href={`/token/${a.token}`} className="mono mt-2 inline-block rounded border border-line px-3 py-1.5 text-xs hover:border-acid/60">Open ${a.symbol} →</Link>
                    ) : (
                      <div key={j} className="card-hard mt-2 max-w-md p-4 text-sm">
                        <div className="display text-lg font-bold text-acid">${a.symbol} is live</div>
                        <div className="mono mt-2 flex gap-4 text-xs">
                          {a.token && <Link href={`/token/${a.token}`} className="underline">Token page</Link>}
                          <a href={`${EXPLORER}/tx/${a.txHash}`} target="_blank" rel="noreferrer" className="text-muted underline">Transaction</a>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-3">
            <Logo className="h-7 w-7 shrink-0" />
            <span className="mono caret text-xs text-muted">thinking</span>
          </div>
        )}
        {upgrade && (
          <div className="card-hard p-4 text-sm">
            You used today&apos;s free messages. <Link href="/club" className="text-acid underline">Join Club</Link> for unlimited chat
            {!authenticated && <> or <button className="text-acid underline" onClick={login}>sign in</button></>}.
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="card-hard mb-[max(1rem,env(safe-area-inset-bottom))] flex shrink-0 items-end gap-2 p-2">
        <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded border border-line text-muted hover:text-fg" title="Attach a logo image">
          {uploading ? <span className="mono text-xs">…</span> : image ? <Check size={16} className="text-acid" /> : <Paperclip size={16} />}
          <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
          rows={1}
          placeholder="Ask Kekr anything"
          className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-muted"
        />
        <button className="btn btn-primary h-10 w-10 shrink-0 p-0" disabled={busy || !input.trim()} aria-label="Send"><ArrowUp size={18} /></button>
      </form>
    </div>
  );
}
