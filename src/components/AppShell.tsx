"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3, BookOpen, ChevronDown, ChevronRight, Coins, Copy, FileText, Gem, KeyRound, LifeBuoy, LogOut,
  Menu, MessageSquare, Plus, Rocket, Search, Shield, Sparkles, Terminal, Trophy, Wallet, X, CandlestickChart, Bot,
} from "lucide-react";
import { BRAND } from "@/lib/config";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "./Logo";

type Item = { href: string; label: string; icon: React.ElementType; badge?: string; soon?: boolean; external?: boolean; highlight?: boolean };
type Section = { title: string; items: Item[]; collapsed?: boolean };

const SECTIONS: Section[] = [
  {
    title: "Agent",
    items: [
      { href: "/chat", label: "Chat", icon: MessageSquare },
      { href: "/portfolio", label: "Wallet", icon: Wallet },
      { href: "/autopilot", label: "Autopilot", icon: Bot },
      { href: "/trade", label: "Trade", icon: CandlestickChart },
    ],
  },
  {
    title: "Explore",
    items: [
      { href: "/launches", label: "Discover tokens", icon: Search },
      { href: "/launch", label: "Launch a token", icon: Rocket, badge: "Club" },
      { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
      { href: "/metrics", label: "Metrics", icon: BarChart3 },
      { href: "/fees", label: "Creator fees", icon: Coins },
    ],
  },
  {
    title: "Build",
    items: [
      { href: "/llm", label: "LLM Gateway", icon: Sparkles },
      { href: "/api-keys", label: "API Keys", icon: KeyRound },
      { href: "/docs#api", label: "Agent API", icon: Terminal },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/club", label: "Club", icon: Gem },
      { href: `https://x.com/${BRAND.twitter}`, label: "Kekr on X", icon: X, external: true },
    ],
  },
  {
    title: "Resources",
    items: [
      { href: "/docs", label: "Docs", icon: BookOpen },
      { href: `https://x.com/${BRAND.twitter}`, label: "Contact support", icon: LifeBuoy, external: true },
      { href: "/terms", label: "Terms of Service", icon: FileText },
      { href: "/privacy", label: "Privacy Policy", icon: Shield },
    ],
  },
];

function NavSection({ s, path, onNav }: { s: Section; path: string; onNav: () => void }) {
  const [open, setOpen] = useState(!s.collapsed);
  return (
    <div className="mt-5">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-3 py-1 text-xs text-muted hover:text-fg">
        <span className="mono uppercase tracking-[0.14em]">{s.title}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5">
          {s.items.map((it) => {
            const active = !it.external && it.href !== "#" && path === it.href.split("#")[0];
            const Icon = it.icon;
            const cls = `group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
              it.soon
                ? "cursor-not-allowed text-muted/50"
                : it.highlight && !active
                  ? "border border-accent/40 bg-accent/10 text-fg hover:bg-accent/20"
                  : active
                    ? "bg-panel-2 text-fg shadow-[inset_2px_0_0_var(--acid)]"
                    : "text-fg/80 hover:bg-panel-2 hover:text-fg"
            }`;
            const inner = (
              <>
                <Icon size={17} className={active ? "text-acid" : ""} />
                <span className="flex-1">{it.label}</span>
                {it.badge && <span className="tag bg-acid text-black">{it.badge}</span>}
                {it.soon && <span className="tag border border-line text-muted">Soon</span>}
              </>
            );
            return (
              <li key={it.label}>
                {it.soon ? (
                  <span className={cls}>{inner}</span>
                ) : it.external ? (
                  <a href={it.href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>
                ) : (
                  <Link href={it.href} onClick={onNav} className={cls}>{inner}</Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Account() {
  const { ready, authenticated, label, address, login, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (!authenticated) {
    return (
      <button className="btn btn-primary w-full" onClick={login} disabled={!ready}>
        Sign in
      </button>
    );
  }
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 rounded-md border border-line bg-panel-2 px-3 py-2.5 text-left hover:border-accent/50">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-accent text-xs font-bold text-accent-ink">{(label || "?").replace("@", "").slice(0, 1).toUpperCase()}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{label}</div>
          <div className="mono truncate text-[11px] text-muted">{address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Creating wallet"}</div>
        </div>
        <ChevronDown size={14} className="text-muted" />
      </button>
      {open && (
        <div className="card-hard absolute bottom-full mb-2 w-full p-1 text-sm">
          {address && (
            <button onClick={() => { void navigator.clipboard.writeText(address); setOpen(false); }} className="flex w-full items-center gap-2 rounded px-3 py-2 hover:bg-panel-2">
              <Copy size={14} /> Copy wallet address
            </button>
          )}
          <Link href="/portfolio" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded px-3 py-2 hover:bg-panel-2"><Wallet size={14} /> Wallet</Link>
          <button onClick={() => { setOpen(false); void logout(); }} className="flex w-full items-center gap-2 rounded px-3 py-2 text-down hover:bg-panel-2">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function Sidebar({ onNav }: { onNav: () => void }) {
  const path = usePathname();
  const router = useRouter();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-line px-4">
        <Link href="/" onClick={onNav} className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <span className="display text-xl font-bold">{BRAND.name}</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4 pt-3">
        <button
          onClick={() => { onNav(); router.push(`/chat?new=${Date.now()}`); }}
          className="flex w-full items-center gap-2 rounded-md border border-line bg-panel-2 px-3 py-2.5 text-sm font-semibold hover:border-acid/60"
        >
          <Plus size={16} /> Start a chat
        </button>
        {SECTIONS.map((s) => <NavSection key={s.title} s={s} path={path} onNav={onNav} />)}
      </div>
      <div className="border-t border-line p-3"><Account /></div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const isChat = path.startsWith("/chat");
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <div className={isChat ? "h-dvh overflow-hidden lg:pl-64" : "min-h-dvh lg:pl-64"}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-panel lg:block">
        <Sidebar onNav={() => {}} />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-md border border-line p-2"><Menu size={18} /></button>
        <span className="display truncate text-lg font-bold">{pageTitle(path)}</span>
        <Link href="/launch" aria-label="Launch a token" className="btn btn-acid ml-auto px-3 py-1.5"><Rocket size={16} /></Link>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[82%] max-w-xs border-r border-line bg-panel">
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 z-10 rounded p-1 text-muted hover:text-fg"><X size={20} /></button>
            <Sidebar onNav={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main className={isChat ? "h-[calc(100dvh-3.5rem)] overflow-hidden lg:h-dvh" : "flex min-h-[calc(100dvh-3.5rem)] flex-col lg:min-h-dvh"}>
        <div className={isChat ? "h-full" : "flex-1"}>{children}</div>
      </main>
    </div>
  );
}

const EXTRA_TITLES: [string, string][] = [["/token/", "Token"], ["/trade", "Trade"], ["/docs", "Docs"]];

/** Title shown in the phone top bar, like the page you are on. */
function pageTitle(path: string) {
  if (path === "/") return "Home";
  for (const s of SECTIONS) for (const i of s.items) if (!i.external && i.href === path) return i.label;
  for (const [p, t] of EXTRA_TITLES) if (path.startsWith(p)) return t;
  return "";
}
