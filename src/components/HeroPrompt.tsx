"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const examples = [
  "What's trending on the launchpad today?",
  "Buy 0.01 ETH of the top token by market cap",
  "Launch a token called Moon Cat with ticker MCAT",
  "How much in creator fees can I claim?",
];

export function HeroPrompt() {
  const [q, setQ] = useState("");
  const router = useRouter();
  const go = (text: string) => router.push(`/chat?q=${encodeURIComponent(text)}`);
  return (
    <div className="mx-auto w-full max-w-2xl">
      <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) go(q); }} className="card glow flex items-center gap-2 p-2">
        <span className="mono pl-3 text-accent">›</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask Ponkr to trade, research or launch…" className="flex-1 bg-transparent px-2 py-3 text-base outline-none placeholder:text-muted" />
        <button className="btn btn-primary">Send</button>
      </form>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {examples.map((e) => (
          <button key={e} onClick={() => go(e)} className="rounded-full border border-line px-3 py-1.5 text-xs text-muted transition hover:border-accent/50 hover:text-fg">{e}</button>
        ))}
      </div>
    </div>
  );
}
