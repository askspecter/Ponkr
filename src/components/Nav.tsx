"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { Logo } from "./Logo";

const links = [
  { href: "/chat", label: "Agent" },
  { href: "/launches", label: "Launches" },
  { href: "/launch", label: "Launch" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/fees", label: "Fees" },
  { href: "/club", label: "Club" },
  { href: "/docs", label: "Docs" },
];

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <Logo className="h-7 w-7" />
          <span className="text-lg">Ponkr</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`rounded-lg px-3 py-1.5 text-sm transition ${path.startsWith(l.href) ? "bg-panel-2 text-fg" : "text-muted hover:text-fg"}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ConnectButton chainStatus="icon" showBalance={false} accountStatus={{ smallScreen: "avatar", largeScreen: "address" }} />
          <button className="btn btn-ghost px-3 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
        </div>
      </div>
      {open && (
        <nav className="grid grid-cols-2 gap-1 border-t border-line px-4 py-3 lg:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-panel-2 hover:text-fg">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
