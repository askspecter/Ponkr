"use client";

import { EmptyState, PageHeader, PageShell } from "@/components/Page";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { formatUnits } from "viem";
import { SignInButton } from "@/components/Providers";
import { useAuth } from "@/hooks/useAuth";
import { TokenAvatar } from "@/components/TokenBits";
import { fmtNum, fmtPrice, fmtUsd } from "@/lib/format";
import type { TokenView } from "@/lib/types";

interface P { eth: string; ethUsd: number; totalUsd: number; positions: { token: TokenView; amount: number; valueUsd: number; valueEth: number }[] }

export default function Portfolio() {
  const { address } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["portfolio", address],
    enabled: !!address,
    queryFn: async () => (await (await fetch(`/api/portfolio/${address}`)).json()) as P,
    refetchInterval: 20_000,
  });
  if (!address) return <Empty />;
  return (
    <PageShell>
      <PageHeader eyebrow="Wallet" title="Your portfolio" description="ETH and every launchpad token in your wallet, valued live." />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><div className="label">Total value</div><div className="display text-3xl font-bold">{data ? fmtUsd(data.totalUsd) : "…"}</div></div>
        <div className="card p-5"><div className="label">ETH</div><div className="display text-3xl font-bold">{data ? fmtNum(Number(formatUnits(BigInt(data.eth), 18)), 4) : "…"}</div><div className="text-xs text-muted">{data && fmtUsd(data.ethUsd)}</div></div>
        <div className="card p-5"><div className="label">Positions</div><div className="display text-3xl font-bold">{data?.positions.length ?? "…"}</div></div>
      </div>
      <div className="card mt-6 overflow-x-auto">
        {isLoading ? <div className="h-64 animate-pulse" /> : (
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-xs text-muted"><tr className="text-left"><th className="px-4 py-3">Token</th><th>Balance</th><th>Price</th><th className="pr-4 text-right">Value</th></tr></thead>
            <tbody>
              {data?.positions.map((p) => (
                <tr key={p.token.token} className="border-t border-line/60 hover:bg-panel-2">
                  <td className="px-4 py-3"><Link href={`/token/${p.token.token}`} className="flex items-center gap-2"><TokenAvatar t={p.token} size={28} /><span className="font-semibold">${p.token.symbol}</span></Link></td>
                  <td className="mono">{fmtNum(p.amount)}</td>
                  <td className="mono">{fmtPrice(p.token.priceUsd)}</td>
                  <td className="pr-4 text-right font-semibold">{fmtUsd(p.valueUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && !data.positions.length && <p className="p-8 text-center text-sm text-muted">No launchpad tokens yet. <Link href="/launches" className="text-accent underline">Find one</Link>.</p>}
      </div>
    </PageShell>
  );
}

function Empty() {
  return (
    <PageShell>
      <PageHeader eyebrow="Wallet" title="Your portfolio" description="ETH and every launchpad token in your wallet, valued live." />
      <EmptyState title="Sign in to see your wallet" description="Your balances and positions appear here once you sign in." action={<SignInButton />} />
    </PageShell>
  );
}
