"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUp } from "lucide-react";

const examples = [
  "What's trending today?",
  "Buy 0.01 ETH of the top token",
  "Launch Moon Cat, ticker MCAT",
  "How much can I claim in fees?",
];

export function HeroPrompt() {
  const [q, setQ] = useState("");
  const router = useRouter();
  const go = (text: string) => router.push(`/chat?q=${encodeURIComponent(text)}`);
  return (
    <div className="w-full max-w-3xl">
      <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) go(q); }} className="card-hard flex items-center gap-2 p-2">
        <span className="mono pl-3 text-acid">$</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ask ponkr anything" className="mono flex-1 bg-transparent px-2 py-3 text-base outline-none placeholder:text-muted" />
        <button className="btn btn-primary h-11 w-11 p-0" aria-label="Send"><ArrowUp size={18} /></button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {examples.map((e) => (
          <button key={e} onClick={() => go(e)} className="mono rounded border border-line bg-panel px-3 py-1.5 text-xs text-muted transition hover:border-acid/60 hover:text-fg">{e}</button>
        ))}
      </div>
    </div>
  );
}
