import { LaunchForm } from "./LaunchForm";

export const metadata = { title: "Launch a token — Ponkr" };

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Launch a token</h1>
      <p className="mt-1 text-muted">Fixed 1B supply · fair bonding curve · auto-graduates to a locked Uniswap v4 pool. Or just ask the <a href="/chat" className="text-accent underline">agent</a>.</p>
      <LaunchForm />
    </div>
  );
}
