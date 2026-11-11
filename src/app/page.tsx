import Link from "next/link";
import { HeroPrompt } from "@/components/HeroPrompt";
import { LiveGrid, Stats, Ticker } from "@/components/LiveLaunches";
import { BRAND } from "@/lib/config";

const features = [
  { t: "Trade by chatting", d: "Say \"buy $25 of $CAT\" or \"sell half my $DOG\". The agent quotes the curve, sets slippage and hands you one transaction to confirm." },
  { t: "Launch in one message", d: "Name, ticker, logo — done. Fixed 1B supply, fair bonding curve, no presale. Launch gas-free or from your own wallet with a snipe-proof first buy." },
  { t: "Earn on every trade", d: "Creators earn a share of trading fees plus an optional creator tax, forever — on the curve and after graduation. Claim any time." },
  { t: "Auto-graduation", d: "When the curve fills, liquidity migrates to a Uniswap v4 pool and is locked permanently. No rugs on the LP." },
  { t: "Use it everywhere", d: `Chat on the web, DM @${BRAND.telegramBot} on Telegram, or tag @${BRAND.twitter} on X to launch straight from a post.` },
  { t: "Built for builders", d: "Agent API, launch API, webhooks-style job polling and a CLI. Plug token launches into your own bot or app." },
];

const steps = [
  ["01", "Describe it", "Tell the agent a name, ticker and image — or fill the launch form."],
  ["02", "It goes live", "Your token is deployed on Robinhood Chain with a 1B fixed supply and a bonding curve priced in ETH."],
  ["03", "People trade", "Every buy and sell pays a trading fee. Your cut accrues to your fee wallet."],
  ["04", "It graduates", "At the raise target, liquidity moves to a locked Uniswap v4 pool and fees keep flowing."],
];

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-20 text-center md:pt-28">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs text-muted">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-up" /> Live on Robinhood Chain
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
            Your AI agent for <span className="text-accent">trading</span> and <span className="text-accent">launching</span> tokens
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-muted md:text-lg">
            Chat to research, buy, sell and deploy tokens. Creators earn fees on every trade — forever.
          </p>
          <div className="mt-10"><HeroPrompt /></div>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/launch" className="btn btn-primary">Launch a token</Link>
            <Link href="/launches" className="btn btn-ghost">Explore launches</Link>
          </div>
          <div className="mx-auto mt-14 max-w-2xl"><Stats /></div>
        </div>
      </section>

      <Ticker />

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Fresh launches</h2>
            <p className="text-sm text-muted">Live from the chain, updated every few seconds.</p>
          </div>
          <Link href="/launches" className="text-sm text-accent hover:underline">View all →</Link>
        </div>
        <LiveGrid sort="new" limit={8} />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">One agent. Everything onchain.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.t} className="card p-6">
              <div className="mb-3 h-8 w-8 rounded-lg bg-accent/15" />
              <h3 className="font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-3xl font-bold">How a launch works</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {steps.map(([n, t, d]) => (
            <div key={n} className="card p-6">
              <div className="mono text-sm text-accent">{n}</div>
              <h3 className="mt-2 font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-muted">{d}</p>
            </div>
          ))}
        </div>
        <div className="card mt-6 grid gap-6 p-6 md:grid-cols-4">
          {[
            ["Supply", "1,000,000,000 fixed"],
            ["Trading fee", "1% per trade"],
            ["Creator share", "70% of the fee + creator tax (0–10%)"],
            ["Graduation", "4.2 ETH raised → locked Uniswap v4 LP"],
          ].map(([k, v]) => (
            <div key={k}><div className="label">{k}</div><div className="font-semibold">{v}</div></div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="card glow flex flex-col items-center gap-4 p-10 text-center">
          <h2 className="text-3xl font-bold">Ready when you are</h2>
          <p className="max-w-xl text-muted">Five free messages a day. Join Club for unlimited agent access, higher API limits and early features.</p>
          <div className="flex gap-3">
            <Link href="/chat" className="btn btn-primary">Open the agent</Link>
            <Link href="/club" className="btn btn-ghost">See Club</Link>
          </div>
        </div>
      </section>
    </>
  );
}
