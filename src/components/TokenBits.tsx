"use client";

import Link from "next/link";
import { useState } from "react";
import { ipfsToHttp } from "@/lib/config";
import { fmtUsd, timeAgo, shortAddr } from "@/lib/format";
import type { TokenView } from "@/lib/types";

export function TokenAvatar({ t, size = 40 }: { t: Pick<TokenView, "logo" | "symbol">; size?: number }) {
  const [broken, setBroken] = useState(false);
  const src = broken ? undefined : ipfsToHttp(t.logo);
  return (
    <div className="shrink-0 overflow-hidden rounded-xl bg-panel-2" style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={t.symbol} width={size} height={size} className="h-full w-full object-cover" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted">{t.symbol.slice(0, 3)}</div>
      )}
    </div>
  );
}

export function Progress({ pct, graduated }: { pct: number; graduated?: boolean }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-2">
      <div className={`h-full rounded-full ${graduated ? "bg-up" : "bg-accent"}`} style={{ width: `${Math.max(2, pct)}%` }} />
    </div>
  );
}

export function TokenCard({ t }: { t: TokenView }) {
  return (
    <Link href={`/token/${t.token}`} className="card group block p-4 transition hover:border-accent/50">
      <div className="flex gap-3">
        <TokenAvatar t={t} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{t.name}</span>
            {t.viaApp && <span className="rounded bg-accent/15 px-1.5 text-[10px] font-bold text-accent">PONKR</span>}
          </div>
          <div className="text-sm text-muted">${t.symbol} · {timeAgo(t.timestamp)}</div>
          <div className="mt-1 text-xs text-muted">by <span className="mono">{shortAddr(t.creator)}</span></div>
        </div>
      </div>
      {t.description && <p className="mt-3 line-clamp-2 text-xs text-muted">{t.description}</p>}
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted">MC</span>
        <span className="font-semibold">{t.isNative ? fmtUsd(t.marketCapUsd) : "-"}</span>
      </div>
      <div className="mt-2"><Progress pct={t.progress} graduated={t.live.graduated} /></div>
      <div className="mt-1 text-right text-[11px] text-muted">{t.live.graduated ? "Graduated · DEX" : `${t.progress.toFixed(1)}% bonded`}</div>
    </Link>
  );
}
