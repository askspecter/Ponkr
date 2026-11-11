"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Info, TriangleAlert } from "lucide-react";

export interface TocItem {
  id: string;
  title: string;
  /** Optional group heading shown above this item in the table of contents. */
  group?: string;
}

/** Sticky table of contents that highlights the section currently in view. */
export function Toc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-10% 0px -70% 0px" },
    );
    items.forEach((i) => {
      const el = document.getElementById(i.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [items]);

  return (
    <nav className="space-y-0.5 text-sm">
      {items.map((i, idx) => (
        <div key={i.id} className={i.group && idx > 0 ? "pt-6" : ""}>
          {i.group && <div className="label mb-2">{i.group}</div>}
          <a
            href={`#${i.id}`}
            className={`block rounded px-3 py-1.5 transition ${active === i.id ? "bg-panel-2 text-fg shadow-[inset_2px_0_0_var(--acid)]" : "text-muted hover:text-fg"}`}
          >
            {i.title}
          </a>
        </div>
      ))}
    </nav>
  );
}

/** Mobile table of contents: a compact jump menu. */
export function TocSelect({ items }: { items: TocItem[] }) {
  return (
    <select
      aria-label="Jump to section"
      className="input mb-8 lg:hidden"
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) document.getElementById(e.target.value)?.scrollIntoView({ behavior: "smooth" });
      }}
    >
      <option value="" disabled>Jump to a section</option>
      {items.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
    </select>
  );
}

/** Code block with a copy button. `{{HOST}}` is replaced with the current site origin. */
export function Code({ children, lang }: { children: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const [host, setHost] = useState("https://your-domain");
  useEffect(() => setHost(window.location.origin), []);
  const text = children.replaceAll("{{HOST}}", host).trim();
  return (
    <div className="group relative my-5 overflow-hidden rounded-md border border-line bg-[#0e0e11]">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="mono text-[10px] uppercase tracking-[0.14em] text-muted">{lang ?? "shell"}</span>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
          className="mono flex items-center gap-1.5 text-[11px] text-muted hover:text-fg"
        >
          {copied ? <><Check size={12} className="text-acid" /> Copied</> : <><Copy size={12} /> Copy</>}
        </button>
      </div>
      <pre className="mono overflow-x-auto p-4 text-[12.5px] leading-relaxed text-fg/90"><code>{text}</code></pre>
    </div>
  );
}

export function Callout({ kind = "note", title, children }: { kind?: "note" | "warn"; title?: string; children: React.ReactNode }) {
  const warn = kind === "warn";
  return (
    <div className={`my-6 flex gap-3 rounded-md border p-4 text-sm ${warn ? "border-down/40 bg-down/5" : "border-accent/40 bg-accent/5"}`}>
      {warn ? <TriangleAlert size={18} className="mt-0.5 shrink-0 text-down" /> : <Info size={18} className="mt-0.5 shrink-0 text-accent" />}
      <div className="space-y-1 [&_p]:m-0">
        {title && <div className="font-semibold text-fg">{title}</div>}
        <div className="text-fg/80">{children}</div>
      </div>
    </div>
  );
}
