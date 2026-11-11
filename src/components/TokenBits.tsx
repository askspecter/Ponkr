"use client";

import Link from "next/link";
import { useState } from "react";
import { ipfsToHttp } from "@/lib/config";
import { fmtUsd, timeAgo, shortAddr } from "@/lib/format";
import type { TokenView } from "@/lib/types";

const HUES = ["#4d6bff", "#e6ff4a", "#45d69b", "#ff8a3d", "#c084fc", "#ff5d73"];

export function TokenAvatar({ t, size = 40 }: { t: Pick<TokenView, "logo" | "symbol">; size?: number }) {
  const [broken, setBroken] = useState(false);
  const src = broken ? undefined : ipfsToHttp(t.logo);
  const hue = HUES[[...t.symbol].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];
  return (
    <div className="shrink-0 overflow-hidden rounded border border-line bg-panel-2" style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={t.symbol} width={size} height={size} className="h-full w-full object-cover" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <div className="mono flex h-full w-full items-center justify-center font-bold text-black" style={{ background: hue, fontSize: Math.max(8, size / 3.4) }}>{t.symbol.slice(0, 3)}</div>
      )}
    </div>
  );
}

/** Segmented bonding meter: 20 cells, filled as the curve raises. */
export function Progress({ pct, graduated }: { pct: number; graduated?: boolean }) {
  const filled = graduated ? 20 : Math.round((pct / 100) * 20);
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className={`h-2 flex-1 rounded-[1px] ${i < filled ? (graduated ? "bg-up" : "bg-acid") : i === filled && pct > 0 ? "bg-acid/40" : "bg-panel-2"}`} />
      ))}
    </div>
  );
}

export function TokenCard({ t }: { t: TokenView }) {
  return (
    <Link href={`/token/${t.token}`} className="card group block p-4 transition hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-[4px_4px_0_0_#000]">
      <div className="flex gap-3">
        <TokenAvatar t={t} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{t.name}</span>
            {t.viaApp && <span className="tag bg-accent text-accent-ink">Ponkr</span>}
          </div>
          <div className="mono text-xs text-muted">${t.symbol} · {timeAgo(t.timestamp)}</div>
          <div className="mono mt-0.5 text-[11px] text-muted">by {shortAddr(t.creator)}</div>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 min-h-[2rem] text-xs text-muted">{t.description}</p>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="label mb-0">Mcap</span>
        <span className="display text-lg font-bold">{t.marketCapUsd ? fmtUsd(t.marketCapUsd) : "n/a"}</span>
      </div>
      <div className="mt-2"><Progress pct={t.progress} graduated={t.live.graduated} /></div>
      <div className="mono mt-1.5 text-right text-[10px] text-muted">{t.live.graduated ? "GRADUATED" : `${t.progress.toFixed(1)}% BONDED`}</div>
    </Link>
  );
}
