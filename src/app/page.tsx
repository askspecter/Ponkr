import Link from "next/link";
import { HeroPrompt } from "@/components/HeroPrompt";
import { DiscoverTabs, Stats, Ticker } from "@/components/LiveLaunches";
import { Logo } from "@/components/Logo";
import { CLUB } from "@/lib/config";

const steps = [
  ["01", "Say it", "Give the agent a name, a ticker and an image. Or use the launch form."],
  ["02", "It ships", "Fixed 1B supply on a fair bonding curve priced in ETH. No presale, no team bag."],
  ["03", "People trade", "Every buy and sell pays a fee. Your cut lands in your fee wallet."],
  ["04", "It graduates", "At the raise target, liquidity moves to Uniswap v4 and stays locked forever."],
];

export default function Home() {
  return (
    <>
      <section className="dots relative border-b border-line">
        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-12 md:pt-20">
          <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
            <div>
              <h1 className="display text-4xl font-extrabold leading-[1.02] md:text-6xl">
                Talk to trade.<br />
                <span className="bg-acid px-2 text-black">Type to launch.</span>
              </h1>
              <p className="mt-5 max-w-xl text-muted md:text-lg">
                Kekr is an onchain agent that researches, buys, sells and deploys tokens for you. Creators keep earning on every trade.
              </p>
            </div>
            <Logo className="hidden h-40 w-40 md:block" />
          </div>
          <div className="mt-10"><HeroPrompt /></div>
          <div className="mt-10"><Stats /></div>
        </div>
      </section>

      <Ticker />

      <section className="mx-auto max-w-6xl px-4 py-12">
        <DiscoverTabs />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="label">How a launch works</div>
        <div className="grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-4">
          {steps.map(([n, t, d]) => (
            <div key={n} className="bg-panel p-6">
              <div className="mono text-sm text-acid">{n}</div>
              <h3 className="display mt-3 text-xl font-bold">{t}</h3>
              <p className="mt-2 text-sm text-muted">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            ["Supply", "1,000,000,000"],
            ["Trading fee", "1% per trade"],
            ["Creator cut", "70% of fees + up to 10% tax"],
            ["Graduation", "4.2 ETH raised"],
          ].map(([k, v]) => (
            <div key={k} className="card p-5"><div className="label">{k}</div><div className="display text-lg font-bold">{v}</div></div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-4">
        <div className="card-hard flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
          <div>
            <h2 className="display text-3xl font-bold">Launching is for the Club.</h2>
            <p className="mt-1 text-muted">Hold {CLUB.minHold.toLocaleString("en-US")} ${CLUB.symbol} to launch tokens, chat without limits and get higher API limits.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/chat" className="btn btn-primary">Open chat</Link>
            <Link href="/club" className="btn btn-ghost">Join Club</Link>
          </div>
        </div>
        <p className="mono mt-10 text-center text-[11px] text-muted">Tokens are highly speculative and can go to zero. Nothing here is financial advice.</p>
      </section>
    </>
  );
}
