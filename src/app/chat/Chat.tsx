"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { Markdown } from "@/components/Markdown";
import { TxCard } from "@/components/TxCard";
import { useSession } from "@/hooks/useSession";
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
  "What's trending right now?",
  "Show the tokens closest to graduating",
  "What's in my portfolio?",
  "Launch a token called Moon Cat, ticker MCAT, generate a logo",
  "Buy 0.005 ETH of the newest token",
  "How much can I claim in creator fees?",
];

export function Chat() {
  const params = useSearchParams();
  const { address } = useAccount();
  const { token, signIn, headers } = useSession();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [upgrade, setUpgrade] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) setMsgs(JSON.parse(raw));
    } catch {}
  }, []);
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
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify({
          messages: next.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.image ? `${m.content}\n[attached image: ${m.image}]` : m.content })),
          wallet: address,
          image: img,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        if (j.upgrade) setUpgrade(true);
        setMsgs((m) => [...m, { role: "assistant", content: j.error || "Something went wrong.", error: true }]);
      } else {
        setMsgs((m) => [...m, { role: "assistant", content: j.text, actions: j.actions }]);
      }
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: (e as Error).message, error: true }]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const q = params.get("q");
    if (q && !started.current) {
      started.current = true;
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
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4">
      <div className="flex items-center justify-between py-3 text-xs text-muted">
        <span>Ponkr Agent · Robinhood Chain</span>
        <div className="flex gap-3">
          {address && !token && <button onClick={() => signIn().catch(() => {})} className="hover:text-fg">Sign in (unlock Club)</button>}
          {msgs.length > 0 && <button onClick={() => setMsgs([])} className="hover:text-fg">New chat</button>}
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {msgs.length === 0 && (
          <div className="pt-16 text-center">
            <h1 className="text-3xl font-bold">What should we do?</h1>
            <p className="mt-2 text-sm text-muted">Trade, research and launch tokens by chatting. You confirm every transaction.</p>
            <div className="mx-auto mt-8 grid max-w-xl gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="card p-3 text-left text-sm text-muted transition hover:border-accent/50 hover:text-fg">{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            {m.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-panel-2 px-4 py-2.5 text-sm">
                {m.content}
                {m.image && <div className="mt-1 text-xs text-muted">📎 image attached</div>}
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="mono mt-0.5 h-7 w-7 shrink-0 rounded-lg bg-accent text-center text-sm leading-7 font-bold text-accent-ink">P</div>
                <div className="min-w-0 flex-1">
                  <div className={m.error ? "text-sm text-down" : ""}><Markdown text={m.content} /></div>
                  {m.actions?.map((a, j) =>
                    a.type === "txs" ? (
                      <TxCard key={j} title={a.title} txs={a.txs} summary={a.summary} />
                    ) : a.type === "token" ? (
                      <Link key={j} href={`/token/${a.token}`} className="mt-2 inline-block rounded-lg border border-line px-3 py-1.5 text-xs hover:border-accent/50">View ${a.symbol} →</Link>
                    ) : (
                      <div key={j} className="card mt-2 max-w-md border-up/40 p-4 text-sm">
                        <div className="font-semibold text-up">🚀 ${a.symbol} is live</div>
                        <div className="mt-2 flex gap-3 text-xs">
                          {a.token && <Link href={`/token/${a.token}`} className="text-accent underline">Token page</Link>}
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
          <div className="flex gap-3">
            <div className="mono h-7 w-7 shrink-0 rounded-lg bg-accent text-center text-sm leading-7 font-bold text-accent-ink">P</div>
            <div className="flex items-center gap-1 pt-2">{[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d * 120}ms` }} />)}</div>
          </div>
        )}
        {upgrade && (
          <div className="card border-accent/40 p-4 text-sm">
            Out of free messages for today. <Link href="/club" className="text-accent underline">Join Club</Link> for unlimited access{address && !token ? <> — then <button className="text-accent underline" onClick={() => signIn()}>sign in</button>.</> : "."}
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="card mb-4 flex items-end gap-2 p-2">
        <label className="btn btn-ghost cursor-pointer px-3" title="Attach logo image">
          {uploading ? "…" : image ? "✓" : "📎"}
          <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
          rows={1}
          placeholder={address ? "Ask anything — e.g. buy 0.01 ETH of $MCAT" : "Connect a wallet to trade, or just ask"}
          className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-muted"
        />
        <button className="btn btn-primary" disabled={busy || !input.trim()}>Send</button>
      </form>
    </div>
  );
}
