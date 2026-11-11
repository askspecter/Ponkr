import Link from "next/link";
import { BRAND, EXPLORER } from "@/lib/config";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-bold"><Logo className="h-6 w-6" /> {BRAND.name}</div>
          <p className="mt-3 text-sm text-muted">AI agent for trading and launching tokens on Robinhood Chain. Tokens are highly speculative. Not financial advice.</p>
        </div>
        <div className="text-sm">
          <div className="label">Product</div>
          <ul className="space-y-2 text-muted">
            <li><Link href="/chat" className="hover:text-fg">Agent</Link></li>
            <li><Link href="/launch" className="hover:text-fg">Launch a token</Link></li>
            <li><Link href="/launches" className="hover:text-fg">Launches</Link></li>
            <li><Link href="/club" className="hover:text-fg">Club</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="label">Developers</div>
          <ul className="space-y-2 text-muted">
            <li><Link href="/docs" className="hover:text-fg">Docs</Link></li>
            <li><Link href="/api-keys" className="hover:text-fg">API keys</Link></li>
            <li><Link href="/docs#cli" className="hover:text-fg">CLI</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="label">Community</div>
          <ul className="space-y-2 text-muted">
            <li><a href={`https://x.com/${BRAND.twitter}`} target="_blank" rel="noreferrer" className="hover:text-fg">X / Twitter</a></li>
            <li><a href={`https://t.me/${BRAND.telegramBot}`} target="_blank" rel="noreferrer" className="hover:text-fg">Telegram bot</a></li>
            <li><a href={EXPLORER} target="_blank" rel="noreferrer" className="hover:text-fg">Explorer</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
